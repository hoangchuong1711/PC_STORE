package com.pcstore.dao;
import com.pcstore.entity.Category;
import jakarta.persistence.EntityManager;
import java.util.List;
public class CategoryDao {
    private final EntityManager em;
    public CategoryDao(EntityManager em) { this.em = em; }
    public List<Category> findActive() { return em.createQuery("from Category c where c.status = com.pcstore.entity.ActiveStatus.ACTIVE order by c.name, c.categoryId", Category.class).getResultList(); }
}
