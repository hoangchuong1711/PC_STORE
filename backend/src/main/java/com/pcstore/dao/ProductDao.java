package com.pcstore.dao;

import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.entity.Product;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class ProductDao {
    private final EntityManager em;
    public ProductDao(EntityManager em) { this.em = em; }

    public List<Product> search(ProductSearchQuery query) {
        TypedQuery<Product> q = em.createQuery(baseQuery(query, false) + " ORDER BY p.productId ASC", Product.class);
        bind(q, query);
        return q.setFirstResult(query.page() * query.size()).setMaxResults(query.size()).getResultList();
    }

    public long count(ProductSearchQuery query) {
        var q = em.createQuery(baseQuery(query, true), Long.class);
        bind(q, query);
        return q.getSingleResult();
    }

    public Product findPublic(Integer id) {
        var results = em.createQuery("select distinct p from Product p join fetch p.category c join fetch p.brand b " +
                "join Inventory i on i.product = p where p.productId = :id and p.status = com.pcstore.entity.ProductStatus.ACTIVE " +
                "and c.status = com.pcstore.entity.ActiveStatus.ACTIVE and b.status = com.pcstore.entity.ActiveStatus.ACTIVE " +
                "and (i.quantityOnHand - i.reservedQuantity) > 0", Product.class).setParameter("id", id).getResultList();
        return results.isEmpty() ? null : results.getFirst();
    }

    public Map<Integer, Integer> availableQuantities(List<Integer> ids) {
        if (ids.isEmpty()) return Map.of();
        List<Object[]> rows = em.createQuery("select i.product.productId, (i.quantityOnHand - i.reservedQuantity) from Inventory i where i.product.productId in :ids", Object[].class)
                .setParameter("ids", ids).getResultList();
        Map<Integer, Integer> values = new HashMap<>();
        for (Object[] row : rows) values.put((Integer) row[0], ((Number) row[1]).intValue());
        return values;
    }

    private String baseQuery(ProductSearchQuery q, boolean count) {
        String select = count ? "select count(distinct p.productId)" : "select distinct p";
        StringBuilder jpql = new StringBuilder(select + " from Product p join p.category c join p.brand b join Inventory i on i.product = p " +
                "where p.status = com.pcstore.entity.ProductStatus.ACTIVE and c.status = com.pcstore.entity.ActiveStatus.ACTIVE " +
                "and b.status = com.pcstore.entity.ActiveStatus.ACTIVE and (i.quantityOnHand - i.reservedQuantity) > 0");
        if (q.keyword() != null) jpql.append(" and lower(p.name) like :keyword");
        if (q.categoryId() != null) jpql.append(" and c.categoryId = :categoryId");
        if (q.brandId() != null) jpql.append(" and b.brandId = :brandId");
        if (q.minPrice() != null) jpql.append(" and p.price >= :minPrice");
        if (q.maxPrice() != null) jpql.append(" and p.price <= :maxPrice");
        return jpql.toString();
    }

    private void bind(TypedQuery<?> q, ProductSearchQuery query) {
        if (query.keyword() != null) q.setParameter("keyword", "%" + query.keyword().toLowerCase() + "%");
        if (query.categoryId() != null) q.setParameter("categoryId", query.categoryId());
        if (query.brandId() != null) q.setParameter("brandId", query.brandId());
        if (query.minPrice() != null) q.setParameter("minPrice", query.minPrice());
        if (query.maxPrice() != null) q.setParameter("maxPrice", query.maxPrice());
    }
}
