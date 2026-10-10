package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ReviewDto;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class ReviewServiceIT {
    private Connection adminConnection;
    private Connection db;
    private EntityManagerFactory factory;
    private String schema;

    @BeforeEach
    void setup() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        schema = "t26_" + UUID.randomUUID().toString().replace("-", "");
        adminConnection = DriverManager.getConnection(url, user, password);
        execute(adminConnection, "CREATE SCHEMA " + schema);
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
        db = DriverManager.getConnection(schemaUrl, user, password);
        fixture();
    }

    @AfterEach
    void cleanup() throws Exception {
        if (db != null) db.close();
        if (factory != null) factory.close();
        if (adminConnection != null) {
            if (schema != null) execute(adminConnection, "DROP SCHEMA " + schema + " CASCADE");
            adminConnection.close();
        }
    }

    @Test
    void createRejectsInvalidPurchaseOwnerSkuDeliveryAndDuplicate() throws Exception {
        rejects(404, "REVIEW_ORDER_ITEM_NOT_FOUND", () -> create(1, 999, 1, 5, "Missing", List.of()));
        rejects(403, "REVIEW_ORDER_ITEM_NOT_OWNED", () -> create(1, 3, 1, 5, "Other", List.of()));
        rejects(409, "REVIEW_PRODUCT_MISMATCH", () -> create(1, 1, 2, 5, "Wrong SKU", List.of()));
        rejects(409, "REVIEW_ORDER_NOT_DELIVERED", () -> create(1, 2, 1, 5, "Pending", List.of()));
        rejects(400, "INVALID_REVIEW", () -> create(1, 1, 1, 0, "Bad rating", List.of()));
        rejects(400, "INVALID_REVIEW", () -> create(1, 1, 1, 5, "   ", List.of()));

        ReviewDto.Response created = create(1, 1, 1, 5, "  Excellent  ", List.of());
        assertEquals("Excellent", created.content());
        assertEquals("PUBLISHED", created.status());
        assertTrue(created.verifiedPurchase());
        rejects(409, "REVIEW_ALREADY_EXISTS", () -> create(1, 1, 1, 4, "Duplicate", List.of()));
        assertEquals(1, scalar("SELECT count(*) FROM product_reviews WHERE order_item_id=1"));
    }

    @Test
    void mediaUpdateSoftDeleteRestoreAndModerationAffectPublicStatistics() throws Exception {
        UUID firstImage = UUID.randomUUID();
        UUID replacement = UUID.randomUUID();
        insertAsset(firstImage, 1);
        ReviewDto.Response first = create(1, 1, 1, 5, "First", List.of(firstImage));
        ReviewDto.Response second = create(2, 3, 1, 1, "Second", List.of());
        assertEquals(1, first.media().size());
        assertEquals("ATTACHED", text("SELECT status FROM media_assets WHERE media_id='" + firstImage + "'"));

        ReviewDto.PageResponse initial = call(service -> service.listPublic(1, 0, 20, null, null,
                ReviewDto.Sort.NEWEST, null));
        assertEquals(List.of(second.reviewId(), first.reviewId()),
                initial.items().stream().map(ReviewDto.Response::reviewId).toList());
        assertEquals(2, initial.summary().totalReviews());
        assertEquals(3.0, initial.summary().averageRating());
        assertEquals(1, initial.summary().distribution().getFirst().count());
        assertEquals(1, initial.summary().distribution().getLast().count());
        assertEquals(1, call(service -> service.listPublic(1, 0, 20, 5, true,
                ReviewDto.Sort.NEWEST, null)).totalItems());

        insertAsset(replacement, 1);
        ReviewDto.Response updated = call(service -> service.update(1, first.reviewId(),
                new ReviewDto.UpdateRequest(3, " Updated ", List.of(replacement))));
        assertEquals(3, updated.rating());
        assertEquals("Updated", updated.content());
        assertEquals(List.of(replacement), updated.media().stream().map(ReviewDto.Media::mediaId).toList());
        assertEquals("DELETE_PENDING", text("SELECT status FROM media_assets WHERE media_id='" + firstImage + "'"));
        assertEquals("ATTACHED", text("SELECT status FROM media_assets WHERE media_id='" + replacement + "'"));
        assertEquals(2.0, call(service -> service.summary(1)).averageRating());

        rejects(404, "REVIEW_NOT_FOUND", () -> call(service -> service.update(2, first.reviewId(),
                new ReviewDto.UpdateRequest(4, null, null))));
        call(service -> { service.delete(1, first.reviewId()); return null; });
        call(service -> { service.delete(1, first.reviewId()); return null; });
        ReviewDto.Summary afterDelete = call(service -> service.summary(1));
        assertEquals(1, afterDelete.totalReviews());
        assertEquals(1.0, afterDelete.averageRating());
        assertEquals("MEDIA_NOT_FOUND", assertThrows(AppException.class,
                () -> new MediaAccessService(factory).resolve(replacement, null)).getCode());

        ReviewDto.Response restored = call(service -> service.restore(1, first.reviewId()));
        assertEquals("PUBLISHED", restored.status());
        assertEquals(2, call(service -> service.summary(1)).totalReviews());
        assertNotNull(new MediaAccessService(factory).resolve(replacement, null));

        execute(db, "UPDATE product_reviews SET status='HIDDEN',moderation_reason='QA',"
                + "moderated_by=2,moderated_at=now() WHERE review_id=" + first.reviewId());
        assertEquals(1, call(service -> service.summary(1)).totalReviews());
        rejects(409, "REVIEW_NOT_EDITABLE", () -> call(service -> service.update(1, first.reviewId(),
                new ReviewDto.UpdateRequest(4, null, null))));
        rejects(409, "REVIEW_NOT_EDITABLE", () -> call(service -> service.restore(1, first.reviewId())));
        rejects(409, "REVIEW_NOT_EDITABLE", () -> call(service -> {
            service.delete(1, first.reviewId());
            return null;
        }));
    }

    @Test
    void filtersPaginationAndHelpfulSortOnlyExposePublishedReviews() throws Exception {
        ReviewDto.Response first = create(1, 1, 1, 4, "First", List.of());
        ReviewDto.Response second = create(2, 3, 1, 2, "Second", List.of());
        execute(db, "INSERT INTO review_likes(review_id,user_id,created_at) VALUES (" + first.reviewId() + ",2,now())");

        ReviewDto.PageResponse helpful = call(service -> service.listPublic(1, 0, 1, null, false,
                ReviewDto.Sort.HELPFUL, 2));
        assertEquals(2, helpful.totalItems());
        assertEquals(2, helpful.totalPages());
        assertEquals(first.reviewId(), helpful.items().getFirst().reviewId());
        assertEquals(1, helpful.items().getFirst().likeCount());
        assertTrue(helpful.items().getFirst().likedByCurrentUser());

        execute(db, "UPDATE product_reviews SET status='DELETED' WHERE review_id=" + first.reviewId());
        ReviewDto.PageResponse visible = call(service -> service.listPublic(1, 0, 20, null, null,
                ReviewDto.Sort.NEWEST, null));
        assertEquals(1, visible.totalItems());
        assertEquals(second.reviewId(), visible.items().getFirst().reviewId());
        assertEquals(1, visible.summary().totalReviews());
        assertEquals(2.0, visible.summary().averageRating());
    }

    private ReviewDto.Response create(int userId, int orderItemId, int productId, int rating,
                                      String content, List<UUID> mediaIds) {
        return call(service -> service.create(userId,
                new ReviewDto.CreateRequest(orderItemId, productId, rating, content, mediaIds)));
    }

    private <T> T call(Function<ReviewService, T> operation) {
        try (var em = factory.createEntityManager()) {
            return operation.apply(new ReviewService(em));
        }
    }

    private void fixture() throws Exception {
        execute(db, "INSERT INTO users(full_name,email,password_hash,role,status) VALUES "
                + "('A','a@review.test','hash','CUSTOMER','ACTIVE'),"
                + "('B','b@review.test','hash','CUSTOMER','ACTIVE')");
        execute(db, "INSERT INTO brands(name) VALUES ('Brand')");
        execute(db, "INSERT INTO categories(name) VALUES ('Category')");
        execute(db, "INSERT INTO products(name,price,category_id,brand_id,status) VALUES "
                + "('Product 1',100,1,1,'ACTIVE'),('Product 2',200,1,1,'ACTIVE')");
        execute(db, "INSERT INTO orders(user_id,order_date,total_amount,shipping_name,shipping_phone,shipping_address_text,status,delivered_at) VALUES "
                + "(1,now(),100,'A','0123456789','Address','DELIVERED',now()),"
                + "(1,now(),100,'A','0123456789','Address','PENDING',null),"
                + "(2,now(),100,'B','0123456789','Address','DELIVERED',now()),"
                + "(1,now(),200,'A','0123456789','Address','DELIVERED',now())");
        execute(db, "INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES "
                + "(1,1,1,100,100),(2,1,1,100,100),(3,1,1,100,100),(4,2,1,200,200)");
    }

    private void insertAsset(UUID id, int owner) throws Exception {
        execute(db, "INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,"
                + "mime_type,size_bytes,width,height,resource_type,created_at,expires_at) VALUES ('" + id + "',"
                + owner + ",'REVIEW','TEMP','pcstore/temp/review/" + id + "','asset-" + id
                + "','image/jpeg',100,4,4,'image',now(),now()+interval '2 hours')");
    }

    private long scalar(String query) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(query)) {
            assertTrue(rows.next());
            return rows.getLong(1);
        }
    }

    private String text(String query) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(query)) {
            assertTrue(rows.next());
            return rows.getString(1);
        }
    }

    private static void rejects(int status, String code, Runnable action) {
        AppException error = assertThrows(AppException.class, action::run);
        assertEquals(status, error.getStatus());
        assertEquals(code, error.getCode());
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) { statement.execute(sql); }
    }
}
