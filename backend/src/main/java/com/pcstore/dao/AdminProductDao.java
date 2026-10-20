package com.pcstore.dao;

import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.Product;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class AdminProductDao {
    private final EntityManager em;
    private final ProductSpecDao specs;

    public AdminProductDao(EntityManager em) {
        this.em = em;
        this.specs = new ProductSpecDao(em);
    }

    public ProductSpecDao specs() { return specs; }

    public void flush() { em.flush(); }

    public Product findProductById(int productId) {
        return em.find(Product.class, productId);
    }

    public Category findCategoryById(int categoryId) {
        return em.find(Category.class, categoryId);
    }

    public Brand findBrandById(int brandId) {
        return em.find(Brand.class, brandId);
    }

    public Inventory findInventoryByProductId(int productId) {
        var rows = em.createQuery("""
                        select i
                        from Inventory i
                        where i.product.productId = :productId
                        """, Inventory.class)
                .setParameter("productId", productId)
                .setMaxResults(1)
                .getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    /** Khóa hàng tồn cho tới khi transaction chỉnh tồn kết thúc. */
    public Inventory findInventoryByProductIdForUpdate(int productId) {
        var rows = em.createQuery("""
                        select i
                        from Inventory i
                        where i.product.productId = :productId
                        """, Inventory.class)
                .setParameter("productId", productId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .setMaxResults(1)
                .getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void persistProduct(Product product) {
        em.persist(product);
    }

    public void persistInventory(Inventory inventory) {
        em.persist(inventory);
    }

    public List<Product> findAllProducts() {
        return em.createQuery("""
                        select distinct p
                        from Product p
                        join fetch p.category
                        join fetch p.brand
                        order by p.productId asc
                        """, Product.class)
                .getResultList();
    }

    public Map<Integer, Inventory> findInventories(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        return em.createQuery("""
                        select i
                        from Inventory i
                        where i.product.productId in :productIds
                        """, Inventory.class)
                .setParameter("productIds", productIds)
                .getResultList()
                .stream()
                .collect(Collectors.toMap(
                        inv -> inv.getProduct().getProductId(),
                        inv -> inv,
                        (existing, replacement) -> existing
                ));
    }
}
