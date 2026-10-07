package com.pcstore.dao;

import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class AdminTaxonomyDao {
    private final EntityManager em;
    public AdminTaxonomyDao(EntityManager em) { this.em = em; }
    public List<Category> categories() { return em.createQuery("from Category order by categoryId", Category.class).getResultList(); }
    public List<Brand> brands() { return em.createQuery("from Brand order by brandId", Brand.class).getResultList(); }
    public Category category(int id) { return em.find(Category.class, id, LockModeType.PESSIMISTIC_WRITE); }
    public Brand brand(int id) { return em.find(Brand.class, id, LockModeType.PESSIMISTIC_WRITE); }
    public void persist(Object entity) { em.persist(entity); }
    public Map<Integer, Long> counts(boolean categories) {
        String relation = categories ? "p.category.categoryId" : "p.brand.brandId";
        return em.createQuery("select " + relation + ", count(p) from Product p group by " + relation, Object[].class)
                .getResultStream().collect(Collectors.toMap(row -> (Integer) row[0], row -> (Long) row[1]));
    }
}
