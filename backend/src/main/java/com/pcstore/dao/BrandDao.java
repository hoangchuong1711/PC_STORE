package com.pcstore.dao;
import com.pcstore.entity.Brand;
import jakarta.persistence.EntityManager;
import java.util.List;
public class BrandDao {
    private final EntityManager em;
    public BrandDao(EntityManager em) { this.em = em; }
    public List<Brand> findActive() { return em.createQuery("from Brand b where b.status = com.pcstore.entity.ActiveStatus.ACTIVE order by b.name, b.brandId", Brand.class).getResultList(); }
}
