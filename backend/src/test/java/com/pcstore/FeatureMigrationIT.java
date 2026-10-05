package com.pcstore;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** T10 database contract: real PostgreSQL, isolated schema per test; no application database. */
class FeatureMigrationIT {
    private static final Set<String> TABLES = Set.of("sockets", "form_factors", "cpu_specs",
            "motherboard_specs", "ram_specs", "gpu_specs", "storage_specs", "psu_specs",
            "case_specs", "cooler_specs", "case_supported_form_factors", "cooler_supported_sockets",
            "pc_builds", "pc_build_items", "product_reviews", "review_media", "review_likes",
            "setup_posts", "setup_images", "setup_post_products", "setup_likes");
    private Connection db;
    private String schema;
    private String url;
    private String user;
    private String password;

    @BeforeEach void openDatabase() throws Exception {
        url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        db = DriverManager.getConnection(url, user, password);
        schema = "t10_" + UUID.randomUUID().toString().replace("-", "");
        execute("CREATE SCHEMA " + schema);
        execute("SET search_path TO " + schema);
    }

    @AfterEach void cleanup() throws Exception {
        if (db != null) {
            try {
                execute("ROLLBACK");
                if (schema != null) execute("DROP SCHEMA " + schema + " CASCADE");
            } finally { db.close(); }
        }
    }

    private Flyway flyway(String target) {
        return Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                .locations("classpath:db/migration").target(target).cleanDisabled(true).load();
    }

    @Test void migratesFreshDatabaseAndCanRunAgain() throws Exception {
        flyway("latest").migrate();
        for (String table : TABLES) assertEquals(1, scalar("SELECT count(*) FROM information_schema.tables WHERE table_schema='"
                + schema + "' AND table_name='" + table + "'"), table);
        assertEquals(4, scalar("SELECT count(*) FROM flyway_schema_history WHERE success AND version IS NOT NULL"));
        assertEquals(0, flyway("latest").migrate().migrationsExecuted);
        flyway("latest").validate();
    }

    @Test void upgradesPopulatedT03WithoutChangingCoreData() throws Exception {
        flyway("2").migrate();
        coreFixture();
        assertEquals(2, flyway("latest").migrate().migrationsExecuted);
        assertEquals(2, scalar("SELECT count(*) FROM users"));
        assertEquals(1000000, scalar("SELECT total_amount FROM orders WHERE order_id=1"));
        assertEquals(1, scalar("SELECT user_id FROM orders WHERE order_id=1"));
        assertEquals(1, scalar("SELECT product_id FROM order_items WHERE order_item_id=1"));
        assertEquals(2, scalar("SELECT quantity FROM order_items WHERE order_item_id=1"));
    }

    @Test void rollsBackOnlyT10AndCanMigrateUpAgain() throws Exception {
        flyway("3").migrate();
        coreFixture();
        featureFixture();
        String rollback = Files.readString(Path.of("src/main/resources/db/rollback/V3__drop_builder_review_setup.sql"));
        execute("SET pcstore.allow_t10_rollback = 'on'");
        execute(rollback);
        for (String table : TABLES) assertEquals(0, scalar("SELECT count(*) FROM information_schema.tables WHERE table_schema='"
                + schema + "' AND table_name='" + table + "'"), table);
        assertEquals(2, scalar("SELECT count(*) FROM flyway_schema_history WHERE success AND version IS NOT NULL"));
        assertEquals(2, scalar("SELECT count(*) FROM users"));
        assertEquals(1, scalar("SELECT count(*) FROM order_items WHERE product_id=1 AND quantity=2"));
        assertEquals(2, flyway("latest").migrate().migrationsExecuted);
        flyway("latest").validate();
        assertEquals(0, scalar("SELECT count(*) FROM product_reviews"));
    }

    @Test void rollbackRequiresOptInAndRefusesLaterMigrations() throws Exception {
        flyway("3").migrate();
        coreFixture();
        String rollback = Files.readString(Path.of("src/main/resources/db/rollback/V3__drop_builder_review_setup.sql"));
        rejects("P0001", rollback);
        execute("ROLLBACK");
        assertEquals(1, scalar("SELECT count(*) FROM flyway_schema_history WHERE version='3'"));
        execute("SET pcstore.allow_t10_rollback = 'on'");
        execute("INSERT INTO flyway_schema_history(installed_rank,version,description,type,script,installed_by,execution_time,success) VALUES (4,'4','Future test','SQL','V4__test.sql',current_user,0,true)");
        rejects("P0001", rollback);
        execute("ROLLBACK");
        assertEquals(1, scalar("SELECT count(*) FROM information_schema.tables WHERE table_schema='" + schema + "' AND table_name='pc_builds'"));
    }

    @Test void enforcesOneReviewPerOrderItemEvenAfterSoftDeleteAndOneLikePerUser() throws Exception {
        fixture();
        featureFixture();
        rejects("23505", "INSERT INTO product_reviews(order_item_id,rating,content) VALUES (1,4,'Again')");
        execute("UPDATE product_reviews SET status='DELETED' WHERE review_id=1");
        rejects("23505", "INSERT INTO product_reviews(order_item_id,rating,content) VALUES (1,3,'Replacement')");
        rejects("23505", "INSERT INTO review_likes(review_id,user_id,created_at) VALUES (1,2,now())");
        rejects("23505", "INSERT INTO setup_likes(post_id,user_id,created_at) VALUES (1,2,now())");
        // Unlike then like is valid, without storing a potentially stale like counter.
        execute("DELETE FROM review_likes WHERE review_id=1 AND user_id=2");
        execute("INSERT INTO review_likes VALUES (1,2,now())");
        execute("DELETE FROM setup_likes WHERE post_id=1 AND user_id=2");
        execute("INSERT INTO setup_likes VALUES (1,2,now())");
        assertEquals(1, scalar("SELECT count(*) FROM review_likes WHERE review_id=1"));
        assertEquals(1, scalar("SELECT count(*) FROM setup_likes WHERE post_id=1"));
    }

    @Test void preservesOwnershipPathsAndRejectsOrphanReferences() throws Exception {
        fixture();
        featureFixture();
        assertEquals(1, scalar("SELECT b.user_id FROM pc_build_items i JOIN pc_builds b USING(build_id) WHERE i.build_item_id=1"));
        assertEquals(1, scalar("SELECT p.user_id FROM setup_images i JOIN setup_posts p USING(post_id) WHERE i.image_id=1"));
        // A reviewer is the order owner, not the moderator or the user who likes the review.
        execute("UPDATE product_reviews SET status='HIDDEN',moderated_by=2,moderated_at=now(),moderation_reason='Spam'");
        assertEquals(1, scalar("SELECT o.user_id FROM review_media m JOIN product_reviews r USING(review_id) JOIN order_items i USING(order_item_id) JOIN orders o USING(order_id) WHERE m.media_id=1"));
        assertEquals(1, scalar("SELECT i.product_id FROM product_reviews r JOIN order_items i USING(order_item_id) WHERE r.review_id=1"));
        assertEquals(0, scalar("SELECT count(*) FROM information_schema.columns WHERE table_schema='" + schema + "' AND table_name='product_reviews' AND column_name IN ('user_id','product_id')"));
        for (String sql : List.of("UPDATE pc_builds SET user_id=999", "UPDATE pc_build_items SET build_id=999",
                "UPDATE pc_build_items SET product_id=999", "UPDATE setup_posts SET user_id=999",
                "UPDATE setup_images SET post_id=999", "UPDATE setup_post_products SET product_id=999",
                "UPDATE setup_post_products SET post_id=999", "UPDATE product_reviews SET order_item_id=999",
                "UPDATE product_reviews SET moderated_by=999", "UPDATE setup_posts SET moderated_by=999,moderated_at=now()",
                "UPDATE review_media SET review_id=999", "UPDATE review_likes SET review_id=999",
                "UPDATE review_likes SET user_id=999", "UPDATE setup_likes SET post_id=999", "UPDATE setup_likes SET user_id=999")) rejects("23503", sql);
        rejects("23502", "UPDATE pc_builds SET user_id=NULL");
        rejects("23502", "UPDATE setup_posts SET user_id=NULL");
        rejects("23502", "UPDATE product_reviews SET order_item_id=NULL");
    }

    @Test void validatesReviewMediaAndModerationStates() throws Exception {
        fixture();
        featureFixture();
        for (String sql : List.of("UPDATE product_reviews SET rating=0", "UPDATE product_reviews SET rating=6",
                "UPDATE product_reviews SET content=' '", "UPDATE product_reviews SET status='DRAFT'",
                "UPDATE product_reviews SET status='HIDDEN'", "UPDATE product_reviews SET moderated_by=2",
                "UPDATE product_reviews SET moderated_at=now()", "UPDATE product_reviews SET moderation_reason=' '",
                "UPDATE review_media SET media_type='AUDIO'", "UPDATE review_media SET size_bytes=0",
                "UPDATE review_media SET sort_order=-1", "UPDATE review_media SET storage_key=' '",
                "UPDATE review_media SET mime_type=''", "UPDATE review_media SET duration_second=1",
                "UPDATE review_media SET media_type='VIDEO'", "UPDATE review_media SET media_type='VIDEO',duration_second=0",
                "UPDATE setup_posts SET status='DELETED'", "UPDATE setup_posts SET status='HIDDEN'",
                "UPDATE setup_posts SET moderated_by=2", "UPDATE setup_posts SET moderated_at=now()",
                "UPDATE setup_posts SET title=' '", "UPDATE setup_posts SET description=' '",
                "UPDATE setup_images SET sort_order=-1", "UPDATE setup_images SET image_url=''")) rejects("23514", sql);
        execute("UPDATE review_media SET media_type='VIDEO',duration_second=10");
        execute("UPDATE product_reviews SET status='HIDDEN',moderated_by=2,moderated_at=now(),moderation_reason='Spam'");
        execute("UPDATE setup_posts SET status='HIDDEN',moderated_by=2,moderated_at=now(),moderation_reason='Spam'");
        execute("UPDATE product_reviews SET status='PUBLISHED'");
        execute("UPDATE setup_posts SET status='PUBLISHED'");
        rejects("23505", "INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order) VALUES (1,'IMAGE','another-key','image/png',10,0)");
        rejects("23505", "INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order) VALUES (1,'IMAGE','reviews/demo.png','image/png',10,1)");
        rejects("23505", "INSERT INTO setup_images(post_id,image_url,sort_order) VALUES (1,'/second.png',0)");
        rejects("23505", "INSERT INTO setup_post_products VALUES (1,1)");
    }

    @Test void validatesBuildAndAllEightSpecs() throws Exception {
        fixture();
        featureFixture();
        specFixture();
        for (String sql : List.of("UPDATE pc_builds SET name=' '", "UPDATE pc_builds SET source_type='AI'",
                "UPDATE pc_build_items SET quantity=0", "UPDATE cpu_specs SET cores=0",
                "UPDATE cpu_specs SET threads=1", "UPDATE cpu_specs SET base_clock_ghz=0",
                "UPDATE cpu_specs SET boost_clock_ghz=1", "UPDATE cpu_specs SET base_clock_ghz='NaN'",
                "UPDATE cpu_specs SET boost_clock_ghz='Infinity'", "UPDATE cpu_specs SET base_clock_ghz='-Infinity'",
                "UPDATE cpu_specs SET tdp_watts=-1", "UPDATE motherboard_specs SET ram_slots=0",
                "UPDATE motherboard_specs SET max_ram_gb=0", "UPDATE motherboard_specs SET ram_type=' '",
                "UPDATE ram_specs SET capacity_gb=0", "UPDATE ram_specs SET speed_mhz=0", "UPDATE ram_specs SET module_count=0",
                "UPDATE gpu_specs SET vram_gb=0", "UPDATE gpu_specs SET length_mm=0",
                "UPDATE gpu_specs SET power_consumption_w=-1", "UPDATE gpu_specs SET recommended_psu_w=0",
                "UPDATE storage_specs SET capacity_gb=0", "UPDATE storage_specs SET read_speed_mbps=-1",
                "UPDATE storage_specs SET write_speed_mbps=-1", "UPDATE psu_specs SET wattage=0",
                "UPDATE case_specs SET max_gpu_length_mm=0", "UPDATE case_specs SET max_cooler_height_mm=0",
                "UPDATE case_specs SET max_radiator_size_mm=-1", "UPDATE cooler_specs SET max_tdp_w=0",
                "UPDATE cooler_specs SET height_mm=0", "UPDATE cooler_specs SET radiator_size_mm=0")) rejects("23514", sql);
        rejects("23505", "INSERT INTO pc_build_items(build_id,product_id,quantity) VALUES (1,1,1)");
        rejects("23505", "INSERT INTO cpu_specs SELECT * FROM cpu_specs");
        rejects("23505", "INSERT INTO case_supported_form_factors VALUES (7,'ATX')");
        rejects("23505", "INSERT INTO cooler_supported_sockets VALUES (8,'AM5')");
        rejects("23503", "UPDATE cpu_specs SET socket_code='MISSING'");
        rejects("23503", "UPDATE motherboard_specs SET form_factor_code='MISSING'");
        rejects("23503", "UPDATE ram_specs SET product_id=999");
        rejects("23503", "UPDATE case_supported_form_factors SET case_product_id=999");
        rejects("23503", "UPDATE cooler_supported_sockets SET cooler_product_id=999");
        execute("UPDATE cooler_specs SET height_mm=NULL,radiator_size_mm=240");
        execute("UPDATE case_specs SET max_radiator_size_mm=0");
        execute("UPDATE storage_specs SET read_speed_mbps=0,write_speed_mbps=0");
        execute("UPDATE gpu_specs SET power_consumption_w=0");
    }

    @Test void cascadesDependentDataButPreservesOwnersAndPurchaseHistory() throws Exception {
        fixture(); featureFixture(); specFixture();
        for (String sql : List.of("DELETE FROM users WHERE user_id=1", "DELETE FROM users WHERE user_id=2",
                "DELETE FROM products WHERE product_id=1", "DELETE FROM order_items WHERE order_item_id=1",
                "DELETE FROM sockets WHERE socket_code='AM5'", "DELETE FROM form_factors WHERE form_factor_code='ATX'")) rejects("23503", sql);
        execute("DELETE FROM pc_builds WHERE build_id=1");
        assertEquals(0, scalar("SELECT count(*) FROM pc_build_items"));
        execute("DELETE FROM setup_posts WHERE post_id=1");
        for (String table : List.of("setup_images", "setup_post_products", "setup_likes")) assertEquals(0, scalar("SELECT count(*) FROM " + table));
        execute("UPDATE product_reviews SET status='DELETED'");
        assertEquals(1, scalar("SELECT count(*) FROM review_media"));
        assertEquals(1, scalar("SELECT count(*) FROM review_likes"));
        // Maintenance-only hard delete; application review deletion is soft.
        execute("DELETE FROM product_reviews");
        assertEquals(0, scalar("SELECT count(*) FROM review_media"));
        assertEquals(0, scalar("SELECT count(*) FROM review_likes"));
        execute("DELETE FROM products WHERE product_id IN (7,8)");
        for (String table : List.of("case_specs", "cooler_specs", "case_supported_form_factors", "cooler_supported_sockets")) assertEquals(0, scalar("SELECT count(*) FROM " + table));
        assertEquals(1, scalar("SELECT count(*) FROM order_items"));
        assertEquals(2, scalar("SELECT count(*) FROM users"));
    }

    @Test void indexesEveryFeatureForeignKey() throws Exception {
        flyway("latest").migrate();
        // Each FK column must lead a valid, non-partial index (PK/UNIQUE also count).
        String sql = """
                SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
                JOIN pg_namespace n ON n.oid=t.relnamespace
                WHERE c.contype='f' AND n.nspname=current_schema()
                  AND t.relname IN ('sockets','form_factors','cpu_specs','motherboard_specs','ram_specs','gpu_specs',
                  'storage_specs','psu_specs','case_specs','cooler_specs','case_supported_form_factors','cooler_supported_sockets',
                  'pc_builds','pc_build_items','product_reviews','review_media','review_likes','setup_posts',
                  'setup_images','setup_post_products','setup_likes')
                  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid
                      AND i.indisvalid AND i.indpred IS NULL AND i.indkey[0]=c.conkey[1])
                """;
        assertEquals(0, scalar(sql));
    }

    private void fixture() throws Exception { flyway("latest").migrate(); coreFixture(); }

    private void coreFixture() throws Exception {
        execute("INSERT INTO users(full_name,email,password_hash) VALUES ('Owner','owner@example.test','test-hash'),('Moderator','admin@example.test','test-hash')");
        execute("UPDATE users SET role='ADMIN' WHERE user_id=2");
        execute("INSERT INTO brands(name) VALUES ('Test brand')");
        execute("INSERT INTO categories(name,component_type) VALUES ('CPU','CPU')");
        execute("INSERT INTO products(name,price,category_id,brand_id) SELECT 'Product ' || n,1000000,1,1 FROM generate_series(1,8) n");
        execute("INSERT INTO orders(user_id,order_date,total_amount,shipping_name,shipping_phone,shipping_address_text,status,delivered_at) VALUES (1,'2026-10-01',1000000,'Owner','0123456789','Test address','DELIVERED','2026-10-02')");
        execute("INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES (1,1,2,500000,500000)");
    }

    private void featureFixture() throws Exception {
        execute("INSERT INTO pc_builds(user_id,name,source_type) VALUES (1,'My PC','MANUAL')");
        execute("INSERT INTO pc_build_items(build_id,product_id,quantity) VALUES (1,1,1)");
        execute("INSERT INTO product_reviews(order_item_id,rating,content) VALUES (1,5,'Good product')");
        execute("INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order) VALUES (1,'IMAGE','reviews/demo.png','image/png',128,0)");
        execute("INSERT INTO review_likes(review_id,user_id,created_at) VALUES (1,2,now())");
        execute("INSERT INTO setup_posts(user_id,title,description,created_at,updated_at) VALUES (1,'My desk','My setup',now(),now())");
        execute("INSERT INTO setup_images(post_id,image_url,sort_order) VALUES (1,'/setup.png',0)");
        execute("INSERT INTO setup_post_products(post_id,product_id) VALUES (1,1)");
        execute("INSERT INTO setup_likes(post_id,user_id,created_at) VALUES (1,2,now())");
    }

    private void specFixture() throws Exception {
        execute("INSERT INTO sockets VALUES ('AM5','AMD AM5')");
        execute("INSERT INTO form_factors VALUES ('ATX','ATX')");
        execute("INSERT INTO cpu_specs VALUES (1,'AM5',6,12,3.5,5.0,65)");
        execute("INSERT INTO motherboard_specs VALUES (2,'AM5','B650','DDR5','4.0','ATX',4,128)");
        execute("INSERT INTO ram_specs VALUES (3,'DDR5',32,6000,2)");
        execute("INSERT INTO gpu_specs VALUES (4,12,'GDDR6','PCIe 4.0',280,200,650)");
        execute("INSERT INTO storage_specs VALUES (5,'SSD','NVMe',1000,7000,5000)");
        execute("INSERT INTO psu_specs VALUES (6,750,'80+ Gold','FULL')");
        execute("INSERT INTO case_specs VALUES (7,350,170,360)");
        execute("INSERT INTO cooler_specs VALUES (8,'AIR',180,155,NULL)");
        execute("INSERT INTO case_supported_form_factors VALUES (7,'ATX')");
        execute("INSERT INTO cooler_supported_sockets VALUES (8,'AM5')");
    }

    private void execute(String sql) throws SQLException {
        try (var statement = db.createStatement()) { statement.execute(sql); }
    }
    private long scalar(String sql) throws SQLException {
        try (var statement = db.createStatement(); var rows = statement.executeQuery(sql)) {
            assertTrue(rows.next()); return rows.getLong(1);
        }
    }
    private void rejects(String state, String sql) {
        assertEquals(state, assertThrows(SQLException.class, () -> execute(sql)).getSQLState(), sql);
    }
}
