package com.pcstore.dao;

import com.pcstore.entity.PcBuild;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;

public class BuildDao {
    private final EntityManager em;
    public BuildDao(EntityManager em) { this.em = em; }

    public List<PcBuild> list(int userId) {
        return em.createQuery("select b from PcBuild b where b.user.userId = :userId order by b.buildId desc", PcBuild.class)
                .setParameter("userId", userId).getResultList();
    }

    public PcBuild findOwned(int userId, int buildId, boolean lock) {
        var query = em.createQuery("select b from PcBuild b where b.buildId = :buildId and b.user.userId = :userId", PcBuild.class)
                .setParameter("buildId", buildId).setParameter("userId", userId);
        if (lock) query.setLockMode(LockModeType.PESSIMISTIC_WRITE);
        var rows = query.getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void save(PcBuild build) { em.persist(build); }
    public void delete(PcBuild build) { em.remove(build); }
}
