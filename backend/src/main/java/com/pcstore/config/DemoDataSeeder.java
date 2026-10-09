package com.pcstore.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import com.pcstore.util.PasswordUtil;

final class DemoDataSeeder {
    
    // Danh sách các file SQL seed dữ liệu demo.
    private static final List<String> SQL_SEEDS = List.of(
        "/db/seed/t05_catalog.sql"
        );
    private static final String ACCOUNT_SEED = "/db/seed/t36_demo_accounts.sql";

    // mật khẩu mặc định cho tài khoản demo. 
    private static final String ADMIN_PASSWORD = "admin123";
    private static final String CUSTOMER_PASSWORD = "user123";

    private DemoDataSeeder() {
    }

    static void seed(String url, String user, String password) {
        seed(url, user, password, Boolean.parseBoolean(System.getenv("DEMO_ACCOUNTS_ENABLED")));
    }

    static void seed(String url, String user, String password, boolean accountsEnabled) {
        try (Connection connection = DriverManager.getConnection(url, user, password)) {
            connection.setAutoCommit(false);
            try {
                for (String resource : SQL_SEEDS) execute(connection, resource);
                if (accountsEnabled) {
                    setLocalHash(connection, "pcstore.demo_admin_hash", PasswordUtil.hash(ADMIN_PASSWORD));
                    setLocalHash(connection, "pcstore.demo_customer_hash", PasswordUtil.hash(CUSTOMER_PASSWORD));
                    execute(connection, ACCOUNT_SEED);
                }
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Không thể nạp dữ liệu demo", exception);
        }
    }

    private static void execute(Connection connection, String resource) throws SQLException {
        String sql;
        try (var input = DemoDataSeeder.class.getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalStateException("Thiếu file seed demo: " + resource);
            }
            sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể đọc file seed demo", exception);
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static void setLocalHash(Connection connection, String key, String hash) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT set_config(?, ?, true)")) {
            statement.setString(1, key);
            statement.setString(2, hash);
            statement.execute();
        }
    }
}
