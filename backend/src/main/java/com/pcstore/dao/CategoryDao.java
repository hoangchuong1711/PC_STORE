package com.pcstore.dao;
import java.util.List;

import com.pcstore.entity.Category;

import jakarta.persistence.EntityManager;

public class CategoryDao {
    private final EntityManager em;

    public CategoryDao(EntityManager em) { this.em = em; }

    //hàm findActive: tìm kiếm tất cả các danh mục có trạng thái ACTIVE, trả về danh sách danh mục
    public List<Category> findActive() { 
        return em.createQuery("from Category c where c.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE order by c.name, c.categoryId", Category.class).getResultList(); }
}
