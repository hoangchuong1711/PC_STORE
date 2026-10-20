package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SetupServiceIT {
    @Test void deliveredOrderAndValidImageAreRequiredAndHiddenPostsStayPrivate() throws Exception {
        String base = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t29_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(base, user, password); var sql = connection.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try (var emf = PersistenceManager.createEntityManagerFactory(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + schema, user, password)) {
                sql.execute("SET search_path TO " + schema);
                sql.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@setup.test','hash','CUSTOMER','ACTIVE'),('B','b@setup.test','hash','CUSTOMER','ACTIVE')");
                sql.execute("INSERT INTO brands(name) VALUES ('Brand')");
                sql.execute("INSERT INTO categories(name) VALUES ('Category')");
                sql.execute("INSERT INTO products(name,price,category_id,brand_id,status) VALUES ('Product',100,1,1,'ACTIVE')");
                UUID image = UUID.randomUUID();
                sql.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,resource_type,created_at,expires_at) VALUES ('" + image + "',1,'SETUP','TEMP','pcstore/temp/setup/" + image + "','asset','image/jpeg',100,4,4,'image',now(),now()+interval '2 hours')");
                try (var em = emf.createEntityManager()) {
                    var setups = new SetupService(em);
                    var request = new com.pcstore.dto.SetupDto.Request("Desk", "Details", List.of(image), List.of(1));
                    assertEquals("SETUP_PURCHASE_REQUIRED", assertThrows(AppException.class, () -> setups.create(1, request)).getCode());
                    sql.execute("INSERT INTO orders(user_id,order_date,total_amount,shipping_name,shipping_phone,shipping_address_text,status,delivered_at) VALUES (1,now(),100,'A','0123456789','Address','DELIVERED',now())");
                    assertEquals("SETUP_IMAGE_REQUIRED", assertThrows(AppException.class, () -> setups.create(1, new com.pcstore.dto.SetupDto.Request("Desk", "Details", List.of(), List.of(1)))).getCode());
                    assertEquals("SETUP_PRODUCT_INVALID", assertThrows(AppException.class, () -> setups.create(1, new com.pcstore.dto.SetupDto.Request("Desk", "Details", List.of(image), List.of(999)))).getCode());
                    sql.execute("UPDATE products SET status='HIDDEN' WHERE product_id=1");
                    assertEquals("SETUP_PRODUCT_INVALID", assertThrows(AppException.class, () -> setups.create(1, request)).getCode());
                    sql.execute("UPDATE products SET status='ACTIVE' WHERE product_id=1");
                    sql.execute("UPDATE categories SET status='INACTIVE' WHERE category_id=1");
                    assertEquals("SETUP_PRODUCT_INVALID", assertThrows(AppException.class, () -> setups.create(1, request)).getCode());
                    sql.execute("UPDATE categories SET status='ACTIVE' WHERE category_id=1");
                    var post = setups.create(1, request);
                    assertEquals(1, setups.listPublic(0, 10).size());
                    assertEquals("SETUP_NOT_FOUND", assertThrows(AppException.class, () -> setups.update(2, post.postId(), request)).getCode());
                    UUID replacement = UUID.randomUUID();
                    sql.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,resource_type,created_at,expires_at) VALUES ('" + replacement + "',1,'SETUP','TEMP','pcstore/temp/setup/" + replacement + "','asset-2','image/jpeg',100,4,4,'image',now(),now()+interval '2 hours')");
                    var changed = setups.update(1, post.postId(), new com.pcstore.dto.SetupDto.Request("New desk", "New details", List.of(replacement), List.of(1)));
                    assertEquals(List.of(replacement), changed.mediaIds());
                    assertEquals("New desk", changed.title());
                    try (var rows = sql.executeQuery("SELECT status FROM media_assets WHERE media_id='" + image + "'")) {
                        assertTrue(rows.next());
                        assertEquals("DELETE_PENDING", rows.getString(1));
                    }
                    sql.execute("UPDATE setup_posts SET status='HIDDEN',moderation_reason='Spam',moderated_by=2,moderated_at=now() WHERE post_id=" + post.postId());
                    assertTrue(setups.listPublic(0, 10).isEmpty());
                    assertEquals("SETUP_NOT_FOUND", assertThrows(AppException.class, () -> setups.getPublic(post.postId())).getCode());
                    setups.delete(1, post.postId());
                    try (var rows = sql.executeQuery("SELECT status FROM media_assets WHERE media_id='" + replacement + "'")) {
                        assertTrue(rows.next());
                        assertEquals("DELETE_PENDING", rows.getString(1));
                    }
                }
            } finally { sql.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }
}
