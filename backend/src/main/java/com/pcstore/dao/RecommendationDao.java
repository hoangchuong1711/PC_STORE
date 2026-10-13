package com.pcstore.dao;

import com.pcstore.dto.RecommendationDto.*;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/** All parameters are bound; transaction ownership belongs to RecommendationService. */
public final class RecommendationDao {
    private final EntityManager em;
    public RecommendationDao(EntityManager em) { this.em=em; }
    public static LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Asia/Bangkok")); }
    public int create(int userId,Answers a) {
        var active=em.createNativeQuery("SELECT request_id FROM recommendation_requests WHERE user_id=:user AND (status IN ('QUEUED','PROCESSING') OR created_at>:cutoff)")
            .setParameter("user",userId).setParameter("cutoff",now().minusSeconds(30)).getResultList();
        if(!active.isEmpty()) throw new AppException(429,"RECOMMENDATION_BUSY","Bạn đang có lượt tư vấn hoặc vừa gửi yêu cầu. Vui lòng chờ rồi thử lại.");
        int id=((Number)em.createNativeQuery("INSERT INTO recommendation_requests(user_id,status,purpose_notes,software_text,games_text,target_resolution,target_fps,pc_budget,min_storage_gb,created_at) VALUES (:user,'QUEUED',:notes,:software,:games,:resolution,:fps,:budget,:storage,:now) RETURNING request_id")
            .setParameter("user",userId).setParameter("notes",a.purposeNotes()).setParameter("software",a.softwareText())
            .setParameter("games",a.gamesText()).setParameter("resolution",a.targetResolution()).setParameter("fps",a.targetFps())
            .setParameter("budget",a.pcBudget()).setParameter("storage",a.minStorageGb()).setParameter("now",now()).getSingleResult()).intValue();
        for(String purpose:a.purposes()) em.createNativeQuery("INSERT INTO recommendation_request_purposes VALUES (:id,:purpose)").setParameter("id",id).setParameter("purpose",purpose).executeUpdate();
        em.createNativeQuery("INSERT INTO recommendation_attempts(request_id,attempt_no,status,started_at) VALUES (:id,1,'RUNNING',:now)")
            .setParameter("id",id).setParameter("now",now()).executeUpdate();
        return id;
    }
    public Object[] owned(int userId,int id,boolean lock) {
        var rows=em.createNativeQuery("SELECT status,pc_budget,purpose_notes,software_text,games_text,target_resolution,target_fps,min_storage_gb FROM recommendation_requests WHERE request_id=:id AND user_id=:user"+(lock?" FOR UPDATE":""))
            .setParameter("id",id).setParameter("user",userId).getResultList();
        if(rows.isEmpty()) throw new AppException(404,"RECOMMENDATION_NOT_FOUND","Không tìm thấy lượt tư vấn.");
        return (Object[])rows.getFirst();
    }
    public Answers answers(int id,Object[] row) {
        List<?> purposes=em.createNativeQuery("SELECT purpose FROM recommendation_request_purposes WHERE request_id=:id ORDER BY purpose").setParameter("id",id).getResultList();
        return new Answers((BigDecimal)row[1],purposes.stream().map(Object::toString).toList(),(String)row[2],(String)row[3],(String)row[4],(String)row[5],(Integer)row[6],((Number)row[7]).intValue());
    }
    public Object[] attempt(int id) {
        return (Object[])em.createNativeQuery("SELECT attempt_id,criteria_json,failure_code,failure_reason FROM recommendation_attempts WHERE request_id=:id ORDER BY attempt_no DESC LIMIT 1").setParameter("id",id).getSingleResult();
    }
    public Object[] result(int attemptId) {
        var rows=em.createNativeQuery("SELECT build_id,estimated_total,matched_level,search_limited,visited_nodes,reason FROM recommendation_results WHERE attempt_id=:id").setParameter("id",attemptId).getResultList();
        return rows.isEmpty()?null:(Object[])rows.getFirst();
    }
    public void processing(int id) { em.createNativeQuery("UPDATE recommendation_requests SET status='PROCESSING' WHERE request_id=:id").setParameter("id",id).executeUpdate(); }
    public void criteria(int id,String json) { em.createNativeQuery("UPDATE recommendation_attempts SET criteria_json=:json WHERE request_id=:id AND status='RUNNING'").setParameter("id",id).setParameter("json",json).executeUpdate(); }
    public void fail(int id,String code,String reason,boolean rejected) {
        em.createNativeQuery("UPDATE recommendation_attempts SET status=:status,failure_code=:code,failure_reason=:reason,finished_at=:now WHERE request_id=:id AND status='RUNNING'")
            .setParameter("id",id).setParameter("status",rejected?"REJECTED":"ERROR").setParameter("code",code).setParameter("reason",reason).setParameter("now",now()).executeUpdate();
        em.createNativeQuery("UPDATE recommendation_requests SET status='FAILED' WHERE request_id=:id AND status IN ('QUEUED','PROCESSING')").setParameter("id",id).executeUpdate();
    }
    public void expire(int userId) {
        List<?> ids=em.createNativeQuery("SELECT request_id FROM recommendation_requests WHERE user_id=:user AND status IN ('QUEUED','PROCESSING') AND created_at<:cutoff FOR UPDATE")
            .setParameter("user",userId).setParameter("cutoff",now().minusMinutes(3)).getResultList();
        for(Object id:ids) fail(((Number)id).intValue(),"PROCESSING_EXPIRED","Lượt tư vấn bị gián đoạn hoặc quá hạn. Vui lòng tạo yêu cầu mới.",false);
    }
    public void accept(int id,int buildId,SearchResult result,String reason) {
        int attemptId=((Number)attempt(id)[0]).intValue();
        em.createNativeQuery("INSERT INTO recommendation_results(attempt_id,build_id,estimated_total,reason,matched_level,search_limited,visited_nodes) VALUES (:attempt,:build,:total,:reason,:level,:limited,:nodes)")
            .setParameter("attempt",attemptId).setParameter("build",buildId).setParameter("total",result.total()).setParameter("reason",reason)
            .setParameter("level",result.level()).setParameter("limited",result.limited()).setParameter("nodes",result.visitedNodes()).executeUpdate();
        em.createNativeQuery("UPDATE recommendation_attempts SET status='ACCEPTED',finished_at=:now WHERE attempt_id=:id AND status='RUNNING'")
            .setParameter("id",attemptId).setParameter("now",now()).executeUpdate();
        em.createNativeQuery("UPDATE recommendation_requests SET status='SUCCEEDED' WHERE request_id=:id").setParameter("id",id).executeUpdate();
    }
}
