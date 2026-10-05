package com.pcstore.dao;

import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.Product;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

public class AdminProductDao {
    private final EntityManager em;

    public AdminProductDao(EntityManager em) {
        this.em = em;
    }

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
}
