package com.pcstore.dao;
import java.util.List;

import com.pcstore.entity.Brand;

import jakarta.persistence.EntityManager;

public class BrandDao {
    private final EntityManager em;

    public BrandDao(EntityManager em) { this.em = em; }

    //hàm findActive: tìm kiếm tất cả các thương hiệu có trạng thái ACTIVE, trả về danh sách thương hiệu
    public List<Brand> findActive() {
        return em.createQuery("from Brand b where b.status = com.pcstore.entity.ActiveStatus.ACTIVE order by b.name, b.brandId", Brand.class).getResultList(); }
}
