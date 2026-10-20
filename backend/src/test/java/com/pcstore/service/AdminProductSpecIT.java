package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.CreateProductRequest;
import com.pcstore.dto.UpdateProductRequest;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class AdminProductSpecIT {
    private Connection db;
    private EntityManagerFactory factory;
    private AdminProductService products;
    private String schema;
    private int cpuCategory;
    private int psuCategory;
    private int brandId;
    private final Map<ComponentType, Integer> categoryIds = new EnumMap<>(ComponentType.class);

    @BeforeEach void setup() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        schema = "t12spec_" + UUID.randomUUID().toString().replace("-", "");
        db = DriverManager.getConnection(url, user, password);
        execute("CREATE SCHEMA " + schema);
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
        products = new AdminProductService(factory::createEntityManager);
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            Category cpu = new Category(); cpu.setName("Custom CPU"); cpu.setComponentType(ComponentType.CPU); em.persist(cpu);
            Category psu = new Category(); psu.setName("Custom PSU"); psu.setComponentType(ComponentType.PSU); em.persist(psu);
            for (ComponentType type : ComponentType.values()) {
                if (type == ComponentType.CPU || type == ComponentType.PSU) continue;
                Category category = new Category(); category.setName("Custom " + type);
                category.setComponentType(type); em.persist(category);
                categoryIds.put(type, category.getCategoryId());
            }
            Brand brand = new Brand("Test brand"); em.persist(brand);
            em.getTransaction().commit();
            cpuCategory = cpu.getCategoryId(); psuCategory = psu.getCategoryId(); brandId = brand.getBrandId();
            categoryIds.put(ComponentType.CPU, cpuCategory);
            categoryIds.put(ComponentType.PSU, psuCategory);
        }
        execute("SET search_path TO " + schema);
        execute("INSERT INTO sockets(socket_code,name) VALUES ('AM5','AM5')");
        execute("INSERT INTO form_factors(form_factor_code,name) VALUES ('ATX','ATX')");
    }

    @AfterEach void cleanup() throws Exception {
        if (factory != null) factory.close();
        if (db != null) {
            if (schema != null && schema.matches("t12spec_[a-f0-9]{32}")) execute("DROP SCHEMA " + schema + " CASCADE");
            db.close();
        }
    }

    @Test void createsAndReadsCpuSpecFromDatabase() throws Exception {
        var created = products.create(new CreateProductRequest("Ryzen", null, BigDecimal.valueOf(5000000),
                cpuCategory, brandId, ProductStatus.ACTIVE, 4, cpuSpec("AM5", 65)));
        assertEquals("AM5", created.spec().get("socketCode"));
        assertEquals(65, ((Number) created.spec().get("tdpWatts")).intValue());
        assertEquals(1, scalar("SELECT count(*) FROM cpu_specs WHERE product_id=" + created.productId()));
        assertEquals("AM5", products.get(created.productId()).spec().get("socketCode"));
    }

    @Test void updatesSpecAndRejectsWrongTypeWithoutPartialWrite() throws Exception {
        var created = products.create(new CreateProductRequest("Ryzen", null, BigDecimal.valueOf(5000000),
                cpuCategory, brandId, ProductStatus.ACTIVE, 4, cpuSpec("AM5", 65)));
        var updated = products.update(created.productId(), new UpdateProductRequest(
                null, null, null, null, null, null, cpuSpec("AM5", 105)));
        assertEquals(105, ((Number) updated.spec().get("tdpWatts")).intValue());
        assertEquals(105, scalar("SELECT tdp_watts FROM cpu_specs WHERE product_id=" + created.productId()));
        AppException error = assertThrows(AppException.class, () -> products.update(created.productId(),
                new UpdateProductRequest(null, null, BigDecimal.valueOf(1), null, null, null,
                        Map.of("wattage", 750, "efficiencyRating", "Gold", "modularType", "Full"))));
        assertEquals(400, error.getStatus());
        assertEquals(5000000, scalar("SELECT price FROM products WHERE product_id=" + created.productId()));
        assertEquals(105, scalar("SELECT tdp_watts FROM cpu_specs WHERE product_id=" + created.productId()));
    }

    @Test void unknownSocketRollsBackProductAndInventory() throws Exception {
        int before = scalar("SELECT count(*) FROM products");
        assertThrows(AppException.class, () -> products.create(new CreateProductRequest("Invalid", null,
                BigDecimal.valueOf(1000), cpuCategory, brandId, ProductStatus.ACTIVE, 1,
                cpuSpec("NOT_REAL", 65))));
        assertEquals(before, scalar("SELECT count(*) FROM products"));
        assertEquals(0, scalar("SELECT count(*) FROM inventory"));
    }

    @Test void categoryChangeCannotLeaveCpuSpecOnPsuProduct() throws Exception {
        var created = products.create(new CreateProductRequest("Ryzen", null, BigDecimal.valueOf(5000000),
                cpuCategory, brandId, ProductStatus.ACTIVE, 4, cpuSpec("AM5", 65)));
        assertThrows(AppException.class, () -> products.update(created.productId(), new UpdateProductRequest(
                null, null, null, psuCategory, null, null, null)));
        assertEquals(1, scalar("SELECT count(*) FROM cpu_specs WHERE product_id=" + created.productId()));
        assertEquals(cpuCategory, scalar("SELECT category_id FROM products WHERE product_id=" + created.productId()));
        var changed = products.update(created.productId(), new UpdateProductRequest(
                null, null, null, psuCategory, null, null,
                Map.of("wattage", 750, "efficiencyRating", "Gold", "modularType", "Full")));
        assertEquals(750, ((Number) changed.spec().get("wattage")).intValue());
        assertEquals(0, scalar("SELECT count(*) FROM cpu_specs WHERE product_id=" + created.productId()));
        assertEquals(1, scalar("SELECT count(*) FROM psu_specs WHERE product_id=" + created.productId()));
    }

    @Test void persistsEveryBuilderSpecTypeAndSupportLists() throws Exception {
        Map<ComponentType, Map<String, Object>> examples = new EnumMap<>(ComponentType.class);
        examples.put(ComponentType.CPU, cpuSpec("AM5", 65));
        examples.put(ComponentType.MOTHERBOARD, Map.of("socketCode", "AM5", "chipset", "B650",
                "ramType", "DDR5", "pcieVersion", "4.0", "formFactorCode", "ATX",
                "ramSlots", 4, "maxRamGb", 128));
        examples.put(ComponentType.RAM, Map.of("ramType", "DDR5", "capacityGb", 32,
                "speedMhz", 6000, "moduleCount", 2));
        examples.put(ComponentType.GPU, Map.of("vramGb", 12, "memoryType", "GDDR6X",
                "interfaceType", "PCIe 4.0", "lengthMm", 300, "powerConsumptionW", 220,
                "recommendedPsuW", 650));
        examples.put(ComponentType.STORAGE, Map.of("storageType", "SSD", "interfaceType", "NVMe",
                "capacityGb", 1000, "readSpeedMBps", 5000, "writeSpeedMBps", 4500));
        examples.put(ComponentType.PSU, Map.of("wattage", 750, "efficiencyRating", "Gold",
                "modularType", "Full"));
        examples.put(ComponentType.CASE, Map.of("maxGpuLengthMm", 350, "maxCoolerHeightMm", 170,
                "maxRadiatorSizeMm", 360, "supportedFormFactors", List.of("ATX")));
        examples.put(ComponentType.COOLER, Map.of("coolerType", "AIR", "maxTdpW", 220,
                "heightMm", 155, "supportedSockets", List.of("AM5")));
        for (var entry : examples.entrySet()) {
            ComponentType type = entry.getKey();
            var created = products.create(new CreateProductRequest(type.name(), null,
                    BigDecimal.valueOf(1000000), categoryIds.get(type), brandId,
                    ProductStatus.ACTIVE, 1, entry.getValue()));
            assertNotNull(created.spec(), type.name());
            assertEquals(entry.getValue().keySet(), created.spec().keySet(), type.name());
            assertEquals(entry.getValue().keySet(), products.get(created.productId()).spec().keySet(), type.name());
        }
        assertEquals(1, scalar("SELECT count(*) FROM case_supported_form_factors"));
        assertEquals(1, scalar("SELECT count(*) FROM cooler_supported_sockets"));
    }

    private static Map<String, Object> cpuSpec(String socket, int tdp) {
        return Map.of("socketCode", socket, "cores", 6, "threads", 12,
                "baseClockGhz", 3.5, "boostClockGhz", 4.4, "tdpWatts", tdp);
    }

    private void execute(String sql) throws Exception {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private int scalar(String sql) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next()); return rows.getInt(1);
        }
    }
}
