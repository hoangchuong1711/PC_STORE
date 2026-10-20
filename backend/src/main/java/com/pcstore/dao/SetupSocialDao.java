package com.pcstore.dao;

import com.pcstore.dto.SetupDto;
import com.pcstore.dto.SetupSocialDto;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.util.List;

public final class SetupSocialDao {
    private final EntityManager em;
    private final SetupDao posts;
    // Counts and viewer state come from the same query as status, avoiding stale ID-list reads.
    private static final String SELECT = "SELECT p.post_id,p.user_id,p.title,p.description,p.status,p.created_at,p.updated_at,"
            + "(SELECT count(*) FROM setup_likes l WHERE l.post_id=p.post_id),"
            + "EXISTS(SELECT 1 FROM setup_likes l WHERE l.post_id=p.post_id AND l.user_id=:viewer),"
            + "p.moderation_reason,p.moderated_by,p.moderated_at FROM setup_posts p ";

    public SetupSocialDao(EntityManager em) { this.em = em; this.posts = new SetupDao(em); }

    public boolean activeUser(int userId, boolean admin) {
        return !em.createNativeQuery("SELECT user_id FROM users WHERE user_id=:id AND status='ACTIVE'"
                        + (admin ? " AND role='ADMIN'" : ""))
                .setParameter("id", userId).getResultList().isEmpty();
    }

    public Object[] find(int id, Integer viewer, boolean publicOnly, boolean lock) {
        var rows = em.createNativeQuery(SELECT + "WHERE p.post_id=:id"
                        + (publicOnly ? " AND p.status='PUBLISHED'" : "") + (lock ? " FOR UPDATE OF p" : ""))
                .setParameter("id", id).setParameter("viewer", viewer == null ? 0 : viewer).getResultList();
        return rows.isEmpty() ? null : (Object[]) rows.getFirst();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> list(Integer viewer, String status, boolean ranking, int offset, int limit) {
        var query = em.createNativeQuery(SELECT + (status == null ? "" : "WHERE p.status=:status ")
                        + "ORDER BY " + (ranking ? "8 DESC," : "") + "p.created_at DESC,p.post_id DESC OFFSET :offset LIMIT :limit")
                .setParameter("viewer", viewer == null ? 0 : viewer).setParameter("offset", offset).setParameter("limit", limit);
        if (status != null) query.setParameter("status", status);
        return query.getResultList();
    }

    public void like(int postId, int userId, boolean liked, LocalDateTime now) {
        if (liked) em.createNativeQuery("INSERT INTO setup_likes(post_id,user_id,created_at) VALUES (:post,:user,:now) ON CONFLICT (post_id,user_id) DO NOTHING")
                .setParameter("post", postId).setParameter("user", userId).setParameter("now", now).executeUpdate();
        else em.createNativeQuery("DELETE FROM setup_likes WHERE post_id=:post AND user_id=:user")
                .setParameter("post", postId).setParameter("user", userId).executeUpdate();
    }

    public void moderate(int id, int adminId, String status, String reason, LocalDateTime now) {
        em.createNativeQuery("UPDATE setup_posts SET status=:status,moderation_reason=:reason,moderated_by=:admin,moderated_at=:now,updated_at=:now WHERE post_id=:id")
                .setParameter("status", status).setParameter("reason", reason).setParameter("admin", adminId)
                .setParameter("now", now).setParameter("id", id).executeUpdate();
    }

    public SetupSocialDto.Like likeResponse(Object[] row) {
        return new SetupSocialDto.Like(((Number) row[0]).intValue(), ((Number) row[7]).longValue(), (Boolean) row[8]);
    }

    public SetupSocialDto.Ranked ranked(Object[] row) {
        return new SetupSocialDto.Ranked(post(row), ((Number) row[7]).longValue(), (Boolean) row[8]);
    }

    public SetupSocialDto.Moderated moderated(Object[] row) {
        return new SetupSocialDto.Moderated(post(row), ((Number) row[7]).longValue(), (String) row[9],
                row[10] == null ? null : ((Number) row[10]).intValue(), SetupDao.time(row[11]));
    }

    private SetupDto.Response post(Object[] row) {
        int id = ((Number) row[0]).intValue();
        return new SetupDto.Response(id, ((Number) row[1]).intValue(), (String) row[2], (String) row[3],
                (String) row[4], SetupDao.time(row[5]), SetupDao.time(row[6]), posts.images(id), posts.linkedProducts(id));
    }
}
