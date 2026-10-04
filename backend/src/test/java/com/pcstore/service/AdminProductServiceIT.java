package com.pcstore.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Objects;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.CreateProductRequest;
import com.pcstore.dto.UpdateInventoryRequest;
import com.pcstore.dto.UpdateProductRequest;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.ValidationException;

import jakarta.persistence.EntityManagerFactory;

class AdminProductServiceIT {
    private Connection admin;
    private EntityManagerFactory factory;
    private AdminProductService service;
    private String schema;
    private int categoryId;
    private int brandId;

    @BeforeEach
    void setUp() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"),
                "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");

        admin = DriverManager.getConnection(url, user, password);
        schema = "t12_" + UUID.randomUUID().toString().replace("-", "");
        try (var statement = admin.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        }

        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
        service = new AdminProductService(factory::createEntityManager);

        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            Category category = new Category();
            category.setName("CPU");
            em.persist(category);
            Brand brand = new Brand("AMD");
            em.persist(brand);
            em.getTransaction().commit();
            categoryId = category.getCategoryId();
            brandId = brand.getBrandId();
        }
    }

    @AfterEach
    void tearDown() throws Exception {
        if (factory != null) factory.close();
        if (admin != null) {
            if (schema != null) {
                try (var statement = admin.createStatement()) {
                    statement.execute("DROP SCHEMA " + schema + " CASCADE");
                }
            }
            admin.close();
        }
    }

    @Test
    void createsUpdatesAndHidesProductFromPublicCatalog() {
        var created = service.create(new CreateProductRequest(
                "  Ryzen 5 7600  ", "  CPU demo  ", new BigDecimal("5490000.00"),
                categoryId, brandId, ProductStatus.ACTIVE, 5));

        assertEquals("Ryzen 5 7600", created.name());
        assertEquals(5, created.availableQuantity());
        assertEquals(created.productId(), findPublic(created.productId()).productId());

        var updated = service.update(created.productId(), new UpdateProductRequest(
                null, null, new BigDecimal("5290000"), null, null, null));
        assertEquals(new BigDecimal("5290000"), updated.price());
        assertEquals(new BigDecimal("5290000"), findPublic(created.productId()).price());

        service.update(created.productId(), new UpdateProductRequest(
                null, null, null, null, null, ProductStatus.HIDDEN));
        assertThrows(ResourceNotFoundException.class, () -> findPublic(created.productId()));
    }

    @Test
    void rejectsInvalidPriceAndInventoryBelowReservedQuantity() {
        assertThrows(ValidationException.class, () -> service.create(new CreateProductRequest(
                "Invalid", null, new BigDecimal("1000.5"), categoryId, brandId,
                ProductStatus.ACTIVE, 1)));

        var created = service.create(new CreateProductRequest(
                "Reserved product", null, new BigDecimal("1000"), categoryId, brandId,
                ProductStatus.ACTIVE, 5));

        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            Inventory inventory = em.createQuery(
                            "select i from Inventory i where i.product.productId = :id", Inventory.class)
                    .setParameter("id", created.productId())
                    .getSingleResult();
            inventory.setReservedQuantity(3);
            em.getTransaction().commit();
        }

        AppException conflict = assertThrows(AppException.class,
                () -> service.updateInventory(created.productId(), new UpdateInventoryRequest(2)));
        assertEquals(409, conflict.getStatus());
        assertEquals("INVENTORY_CONFLICT", conflict.getCode());

        var updated = service.updateInventory(created.productId(), new UpdateInventoryRequest(4));
        assertEquals(4, updated.quantityOnHand());
        assertEquals(3, updated.reservedQuantity());
        assertEquals(1, updated.availableQuantity());
    }

    private com.pcstore.dto.ProductResponse findPublic(int productId) {
        try (var em = factory.createEntityManager()) {
            return new ProductCatalogService(em).find(productId);
        }
    }
}
