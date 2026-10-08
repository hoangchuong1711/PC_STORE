package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.dto.CompatibilityDto.Status;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CompatibilityServiceIT {
    @Test void readsSeededSpecsAndTreatsMissingSpecAsUnknown() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        String schema = "t23_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection db = DriverManager.getConnection(url, user, password)) {
            try {
                execute(db, "CREATE SCHEMA " + schema);
                String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
                Flyway.configure().dataSource(schemaUrl, user, password).locations("classpath:db/migration").load().migrate();
                execute(db, "SET search_path TO " + schema);
                execute(db, Files.readString(Path.of("src/main/resources/db/seed/t09_catalog.sql")));
                execute(db, Files.readString(Path.of("src/main/resources/db/seed/t22_builder_specs.sql")));
                try (EntityManagerFactory factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
                     EntityManager em = factory.createEntityManager()) {
                    List<Selection> build = List.of(
                            select(em, "AMD Ryzen 5 5600"), select(em, "MSI B550M PRO-VDH"),
                            select(em, "Corsair VENGEANCE LPX CMK16GX4M1E3200C16"),
                            select(em, "MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC"),
                            select(em, "Samsung 970 EVO Plus 250GB"), select(em, "MSI MAG A650BN"),
                            select(em, "Corsair 3000D AIRFLOW Black"), select(em, "DeepCool AG400 ARGB")
                    );
                    CompatibilityService service = new CompatibilityService(em);
                    assertEquals(Status.PASS, service.evaluate(build).status());
                    execute(db, "DELETE FROM " + schema + ".storage_specs WHERE product_id=(SELECT product_id FROM " + schema
                            + ".products WHERE name='Samsung 970 EVO Plus 250GB')");
                    em.clear();
                    assertEquals(Status.UNKNOWN, service.evaluate(build).status());
                }
            } finally {
                execute(db, "DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private static Selection select(EntityManager em, String name) {
        Number id = (Number) em.createNativeQuery("SELECT product_id FROM products WHERE name=:name")
                .setParameter("name", name).getSingleResult();
        return new Selection(id.intValue(), 1);
    }

    private static void execute(Connection db, String sql) throws Exception {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }
}
