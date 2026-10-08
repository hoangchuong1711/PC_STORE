package com.pcstore;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MediaMigrationIT {
    @Test void upgradesExistingV5MediaAndPreservesUpload() throws Exception {
        String url = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(url, user, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                var baseline = Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                        .locations("classpath:db/migration").target("5").load();
                baseline.migrate();
                statement.execute("SET search_path TO " + schema);
                statement.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE')");
                statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,created_at,expires_at) "
                        + "VALUES ('55555555-5555-5555-5555-555555555555',1,'SETUP','UPLOADING','pcstore/temp/setup/old',now(),now()+interval '2 hours')");
                assertEquals(3, Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                        .locations("classpath:db/migration").load().migrate().migrationsExecuted);
                statement.execute("UPDATE media_assets SET status='DELETED',cleanup_attempts=1 WHERE media_id='55555555-5555-5555-5555-555555555555'");
                try (var rows = statement.executeQuery("SELECT count(*) FROM media_assets WHERE public_id='pcstore/temp/setup/old' AND status='DELETED' AND cleanup_attempts=1")) {
                    rows.next();
                    assertEquals(1, rows.getInt(1));
                }
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test void temporaryMediaHasOwnerUniqueStorageKeyAndBoundedStatus() throws Exception {
        String url = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(url, user, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                        .locations("classpath:db/migration").load().migrate();
                statement.execute("SET search_path TO " + schema);
                statement.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE')");
                statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,created_at,expires_at) "
                        + "VALUES ('11111111-1111-1111-1111-111111111111',1,'SETUP','UPLOADING','pcstore/temp/setup/a',now(),now()+interval '2 hours')");
                assertThrows(SQLException.class, () -> statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,created_at,expires_at) "
                        + "VALUES ('22222222-2222-2222-2222-222222222222',1,'SETUP','TEMP','pcstore/temp/setup/a',now(),now()+interval '2 hours')"));
                assertThrows(SQLException.class, () -> statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,created_at,expires_at) "
                        + "VALUES ('33333333-3333-3333-3333-333333333333',1,'SETUP','PUBLIC','pcstore/temp/setup/b',now(),now()+interval '2 hours')"));
                assertThrows(SQLException.class, () -> statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,created_at,expires_at) "
                        + "VALUES ('44444444-4444-4444-4444-444444444444',99,'SETUP','TEMP','pcstore/temp/setup/c',now(),now()+interval '2 hours')"));
                statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,duration_second,resource_type,created_at,expires_at) "
                        + "VALUES ('66666666-6666-6666-6666-666666666666',1,'REVIEW','TEMP','pcstore/temp/review/video','asset-video','video/mp4',1000,720,480,10,'video',now(),now()+interval '2 hours')");
                assertThrows(SQLException.class, () -> statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,duration_second,created_at,expires_at) "
                        + "VALUES ('77777777-7777-7777-7777-777777777777',1,'SETUP','TEMP','pcstore/temp/setup/video','asset-video-2','video/mp4',1000,720,480,10,now(),now()+interval '2 hours')"));
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }
}
