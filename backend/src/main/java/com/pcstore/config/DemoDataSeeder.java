package com.pcstore.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

final class DemoDataSeeder {
    private static final String RESOURCE = "/db/seed/t05_catalog.sql";

    private DemoDataSeeder() {
    }

    static void seed(String url, String user, String password) {
        String sql;
        try (var input = DemoDataSeeder.class.getResourceAsStream(RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Thiếu file seed demo: " + RESOURCE);
            }
            sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể đọc file seed demo", exception);
        }

        try (Connection connection = DriverManager.getConnection(url, user, password);
             Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(sql);
                connection.commit();
            } catch (SQLException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Không thể nạp dữ liệu demo T05", exception);
        }
    }
}
