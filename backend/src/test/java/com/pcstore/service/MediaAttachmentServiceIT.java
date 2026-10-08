package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MediaAttachmentServiceIT {
    @Test void setupAttachChecksOwnerAndAtomicallyConfirmsAssets() throws Exception {
        String base = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(base, user, password); var sql = connection.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                var emf = PersistenceManager.createEntityManagerFactory(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + schema, user, password);
                try {
                    sql.execute("SET search_path TO " + schema);
                    sql.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE'),('B','b@demo.test','hash','CUSTOMER','ACTIVE')");
                    sql.execute("INSERT INTO setup_posts(user_id,title,description,created_at,updated_at) VALUES (1,'Setup','Details',now(),now())");
                    UUID own = UUID.randomUUID();
                    UUID other = UUID.randomUUID();
                    insertAsset(sql, own, 1);
                    insertAsset(sql, other, 2);
                    var service = new MediaAttachmentService();
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        AppException error = assertThrows(AppException.class,
                                () -> service.attachSetupImages(em, 1, 1, List.of(own, other)));
                        assertEquals("MEDIA_NOT_AVAILABLE", error.getCode());
                        em.getTransaction().rollback();
                    }
                    assertEquals(0, count(sql, "SELECT count(*) FROM setup_images"));
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        service.attachSetupImages(em, 1, 1, List.of(own));
                        em.getTransaction().commit();
                    }
                    assertEquals(1, count(sql, "SELECT count(*) FROM setup_images WHERE post_id=1 AND media_asset_id='" + own + "' AND sort_order=0"));
                    assertEquals(1, count(sql, "SELECT count(*) FROM media_assets WHERE media_id='" + own + "' AND status='ATTACHED'"));
                    var access = new MediaAccessService(emf);
                    assertEquals("asset-" + own, access.resolve(own, null).assetId());
                    sql.execute("UPDATE setup_posts SET status='HIDDEN',moderation_reason='moderated',moderated_by=2,moderated_at=now() WHERE post_id=1");
                    assertEquals("MEDIA_NOT_FOUND", assertThrows(AppException.class,
                            () -> access.resolve(own, null)).getCode());
                    assertEquals("asset-" + own, access.resolve(own, 1).assetId());
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        AppException error = assertThrows(AppException.class,
                                () -> service.attachSetupImages(em, 2, 1, List.of(other)));
                        assertEquals("MEDIA_TARGET_NOT_FOUND", error.getCode());
                        em.getTransaction().rollback();
                    }
                    sql.execute("INSERT INTO brands(name) VALUES ('Brand')");
                    sql.execute("INSERT INTO categories(name) VALUES ('Category')");
                    sql.execute("INSERT INTO products(name,price,category_id,brand_id) VALUES ('Product',100,1,1)");
                    sql.execute("INSERT INTO orders(user_id,order_date,total_amount,shipping_name,shipping_phone,shipping_address_text) VALUES (1,now(),100,'A','0123456789','Address')");
                    sql.execute("INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES (1,1,1,100,100)");
                    sql.execute("INSERT INTO product_reviews(order_item_id,rating,content) VALUES (1,5,'Good')");
                    UUID firstVideo = UUID.randomUUID();
                    UUID secondVideo = UUID.randomUUID();
                    insertVideo(sql, firstVideo);
                    insertVideo(sql, secondVideo);
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        service.attachReviewMedia(em, 1, 1, List.of(firstVideo));
                        em.getTransaction().commit();
                    }
                    assertEquals(1, count(sql, "SELECT count(*) FROM review_media WHERE review_id=1 AND media_type='VIDEO' AND duration_second=10"));
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        AppException error = assertThrows(AppException.class,
                                () -> service.attachReviewMedia(em, 1, 1, List.of(secondVideo)));
                        assertEquals("MEDIA_VIDEO_LIMIT", error.getCode());
                        em.getTransaction().rollback();
                    }
                    assertEquals("asset-" + firstVideo, access.resolve(firstVideo, null).assetId());
                    sql.execute("UPDATE product_reviews SET status='DELETED' WHERE review_id=1");
                    assertEquals("MEDIA_NOT_FOUND", assertThrows(AppException.class,
                            () -> access.resolve(firstVideo, 1)).getCode());
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        AppException error = assertThrows(AppException.class,
                                () -> service.attachReviewMedia(em, 1, 1, List.of(secondVideo)));
                        em.getTransaction().rollback();
                        assertEquals("MEDIA_TARGET_NOT_FOUND", error.getCode());
                    }
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        service.detachReviewMedia(em, 1, 1, firstVideo);
                        em.getTransaction().commit();
                    }
                    assertEquals(0, count(sql, "SELECT count(*) FROM review_media WHERE media_asset_id='" + firstVideo + "'"));
                    assertEquals(1, count(sql, "SELECT count(*) FROM media_assets WHERE media_id='" + firstVideo + "' AND status='DELETE_PENDING'"));
                    UUID secondImage = UUID.randomUUID();
                    insertAsset(sql, secondImage, 1);
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        service.attachSetupImages(em, 1, 1, List.of(secondImage));
                        em.getTransaction().commit();
                    }
                    try (var em = emf.createEntityManager()) {
                        em.getTransaction().begin();
                        service.detachSetupImage(em, 1, 1, secondImage);
                        em.getTransaction().commit();
                    }
                    assertEquals(1, count(sql, "SELECT count(*) FROM setup_images WHERE post_id=1"));
                    assertEquals(1, count(sql, "SELECT count(*) FROM media_assets WHERE media_id='" + secondImage + "' AND status='DELETE_PENDING'"));
                } finally { emf.close(); }
            } finally { sql.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }

    private static void insertAsset(java.sql.Statement sql, UUID id, int owner) throws Exception {
        sql.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,created_at,expires_at) VALUES ('"
                + id + "'," + owner + ",'SETUP','TEMP','pcstore/temp/setup/" + id
                + "','asset-" + id + "','image/jpeg',100,4,4,now(),now()+interval '2 hours')");
    }

    private static void insertVideo(java.sql.Statement sql, UUID id) throws Exception {
        sql.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,duration_second,resource_type,created_at,expires_at) VALUES ('"
                + id + "',1,'REVIEW','TEMP','pcstore/temp/review/" + id
                + "','asset-" + id + "','video/mp4',1000,720,480,10,'video',now(),now()+interval '2 hours')");
    }

    private static int count(java.sql.Statement sql, String query) throws Exception {
        try (var rows = sql.executeQuery(query)) { rows.next(); return rows.getInt(1); }
    }
}
