package com.pcstore;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Verifies T22 seed against the real T09 catalog in an isolated PostgreSQL schema. */
class BuilderSeedIT {
    @Test void loadsAllBuilderSpecsAndCanRunTwice() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        String schema = "t22_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection db = DriverManager.getConnection(url, user, password)) {
            try {
                run(db, "CREATE SCHEMA " + schema);
                Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                        .locations("classpath:db/migration").load().migrate();
                run(db, "SET search_path TO " + schema);
                run(db, Files.readString(Path.of("src/main/resources/db/seed/t09_catalog.sql")));
                String t22 = Files.readString(Path.of("src/main/resources/db/seed/t22_builder_specs.sql"));
                run(db, t22);
                run(db, t22);
                for (String table : new String[]{"cpu_specs", "motherboard_specs", "ram_specs", "gpu_specs",
                        "storage_specs", "psu_specs", "case_specs", "cooler_specs"}) {
                    assertEquals(5, count(db, table), table);
                }
                assertEquals(15, count(db, "case_supported_form_factors"));
                assertEquals(10, count(db, "cooler_supported_sockets"));
            } finally {
                run(db, "DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private static void run(Connection db, String sql) throws Exception {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private static int count(Connection db, String table) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery("SELECT count(*) FROM " + table)) {
            rows.next();
            return rows.getInt(1);
        }
    }
}
