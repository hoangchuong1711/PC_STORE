package com.pcstore.dao;

import com.pcstore.dto.SetupDto;
import com.pcstore.dto.SetupSocialDto;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.time.LocalDateTime;
import java.util.List;

public final class SetupSocialDao {
    private final EntityManager entityManager;
    private final SetupDao posts;
    // Counts and viewer state come from the same query as status, avoiding stale ID-list reads.
    private static final String SELECT =
            "SELECT"
                + " p.post_id,p.user_id,p.title,p.description,p.status,p.created_at,p.updated_at,(SELECT"
                + " count(*) FROM setup_likes l WHERE l.post_id=p.post_id),EXISTS(SELECT 1 FROM"
                + " setup_likes l WHERE l.post_id=p.post_id AND"
                + " l.user_id=:viewer),p.moderation_reason,p.moderated_by,p.moderated_at FROM"
                + " setup_posts p ";

    public SetupSocialDao(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.posts = new SetupDao(entityManager);
    }

    public boolean activeUser(int userId, boolean admin) {
        String sql =
                "SELECT user_id FROM users WHERE user_id=:id AND status='ACTIVE'"
                        + (admin ? " AND role='ADMIN'" : "");
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", userId);
        return !query.getResultList().isEmpty();
    }

    public Object[] find(int id, Integer viewer, boolean publicOnly, boolean lock) {
        String sql =
                SELECT
                        + "WHERE p.post_id=:id"
                        + (publicOnly ? " AND p.status='PUBLISHED'" : "")
                        + (lock ? " FOR UPDATE OF p" : "");
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", id);
        query.setParameter("viewer", viewer == null ? 0 : viewer);
        List<?> rows = query.getResultList();
        return rows.isEmpty() ? null : (Object[]) rows.getFirst();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> list(
            Integer viewer, String status, boolean ranking, int offset, int limit) {
        String sql =
                SELECT
                        + (status == null ? "" : "WHERE p.status=:status ")
                        + "ORDER BY "
                        + (ranking ? "8 DESC," : "")
                        + "p.created_at DESC,p.post_id DESC OFFSET :offset LIMIT"
                        + " :limit";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("viewer", viewer == null ? 0 : viewer);
        query.setParameter("offset", offset);
        query.setParameter("limit", limit);
        if (status != null) {
            query.setParameter("status", status);
        }
        return query.getResultList();
    }

    public void like(int postId, int userId, boolean liked, LocalDateTime now) {
        if (liked) {
            String sql =
                    "INSERT INTO setup_likes(post_id,user_id,created_at) VALUES"
                            + " (:post,:user,:now) ON CONFLICT (post_id,user_id) DO NOTHING";
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("post", postId);
            query.setParameter("user", userId);
            query.setParameter("now", now);
            query.executeUpdate();
        } else {
            String sql2 = "DELETE FROM setup_likes WHERE post_id=:post AND user_id=:user";
            Query query2 = entityManager.createNativeQuery(sql2);
            query2.setParameter("post", postId);
            query2.setParameter("user", userId);
            query2.executeUpdate();
        }
    }

    public void moderate(int id, int adminId, String status, String reason, LocalDateTime now) {
        String sql =
                "UPDATE setup_posts SET"
                    + " status=:status,moderation_reason=:reason,moderated_by=:admin,moderated_at=:now,updated_at=:now"
                    + " WHERE post_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("status", status);
        query.setParameter("reason", reason);
        query.setParameter("admin", adminId);
        query.setParameter("now", now);
        query.setParameter("id", id);
        query.executeUpdate();
    }

    public SetupSocialDto.Like likeResponse(Object[] row) {
        return new SetupSocialDto.Like(
                ((Number) row[0]).intValue(), ((Number) row[7]).longValue(), (Boolean) row[8]);
    }

    public SetupSocialDto.Ranked ranked(Object[] row) {
        return new SetupSocialDto.Ranked(
                post(row), ((Number) row[7]).longValue(), (Boolean) row[8]);
    }

    public SetupSocialDto.Moderated moderated(Object[] row) {
        return new SetupSocialDto.Moderated(
                post(row),
                ((Number) row[7]).longValue(),
                (String) row[9],
                row[10] == null ? null : ((Number) row[10]).intValue(),
                SetupDao.time(row[11]));
    }

    private SetupDto.Response post(Object[] row) {
        int id = ((Number) row[0]).intValue();
        return new SetupDto.Response(
                id,
                ((Number) row[1]).intValue(),
                (String) row[2],
                (String) row[3],
                (String) row[4],
                SetupDao.time(row[5]),
                SetupDao.time(row[6]),
                posts.images(id),
                posts.linkedProducts(id));
    }
}
