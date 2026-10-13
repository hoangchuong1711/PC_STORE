package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.RecommendationDto.*;
import com.pcstore.dto.BuildDto;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationServiceIT {
    static Connection db; static EntityManagerFactory factory; static String schema;
    @BeforeAll static void setup() throws Exception {
        String url=Objects.requireNonNull(System.getenv("TEST_DB_URL")), user=System.getenv("TEST_DB_USER"), password=System.getenv("TEST_DB_PASSWORD");
        schema="rec_"+UUID.randomUUID().toString().replace("-",""); db=DriverManager.getConnection(url,user,password);
        sql("CREATE SCHEMA "+schema); sql("SET search_path TO "+schema);
        factory=PersistenceManager.createEntityManagerFactory(url+(url.contains("?")?"&":"?")+"currentSchema="+schema,user,password);
        sql("INSERT INTO users(full_name,email,password_hash,role) VALUES ('A','a@rec.test','hash','CUSTOMER'),('B','b@rec.test','hash','CUSTOMER')");
        sql(java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/db/seed/t09_catalog.sql")));
        sql(java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/db/seed/t22_builder_specs.sql")));
    }
    @AfterEach void clean() throws Exception { sql("TRUNCATE recommendation_requests, pc_builds, carts CASCADE"); }
    @AfterAll static void close() throws Exception {
        if(factory!=null) factory.close();
        if(db!=null) { if(schema!=null && schema.matches("rec_[a-f0-9]{32}")) sql("DROP SCHEMA "+schema+" CASCADE"); db.close(); }
    }
    static Answers answers() { return new Answers(new BigDecimal("50000000"),List.of("GAMING"),"Game","Trình duyệt","Game","1080p",60,0); }
    static Criteria criteria() { return new Criteria(List.of(new Threshold("RAM","capacityGb",8,16)),List.of()); }
    @Test void persistsSingleImmutableBuildAndChecksOwnershipAndCart() {
        var service=new RecommendationService(factory);
        int id=service.create(1,answers());
        assertEquals("QUEUED",service.get(1,id).status());
        assertEquals(404,assertThrows(AppException.class,()->service.get(2,id)).getStatus());
        service.process(1,id,a->criteria());
        var result=service.get(1,id);
        assertEquals("SUCCEEDED",result.status(),result.failureReason());
        assertEquals(8,result.result().build().items().size());
        assertEquals("RECOMMENDATION",result.result().build().sourceType());
        assertTrue(result.result().estimatedTotal().compareTo(answers().pcBudget())<=0);
        try(var em=factory.createEntityManager()) {
            var builds=new BuildService(em);
            assertEquals("BUILD_READ_ONLY",assertThrows(AppException.class,()->builds.update(1,result.result().build().buildId(),new BuildDto.Request("Changed",List.of()))).getCode());
        }
        assertEquals(404,assertThrows(AppException.class,()->service.addToCart(2,id)).getStatus());
        assertEquals(8,service.addToCart(1,id).items().size());
        assertEquals("MANUAL",service.copy(1,id).sourceType());
    }
    @Test void providerFailureTerminatesRequestWithoutResult() {
        var s=new RecommendationService(factory); int id=s.create(1,answers());
        s.process(1,id,a->{throw new AppException(503,"AI_RATE_LIMITED","Thử lại sau");});
        assertEquals("FAILED",s.get(1,id).status()); assertNull(s.get(1,id).result());
        assertEquals("AI_RATE_LIMITED",s.get(1,id).failureCode());
    }
    @Test void duplicateSubmissionIsRejectedAndStaleWorkExpires() throws Exception {
        var s=new RecommendationService(factory); int id=s.create(1,answers());
        assertEquals(429,assertThrows(AppException.class,()->s.create(1,answers())).getStatus());
        sql("UPDATE recommendation_requests SET created_at=localtimestamp-interval '10 minutes'");
        assertEquals("FAILED",s.get(1,id).status());
    }
    @Test void impossibleBudgetProducesNoAcceptedBuild() {
        var s=new RecommendationService(factory); var a=answers();
        int id=s.create(1,new Answers(BigDecimal.ONE,a.purposes(),a.purposeNotes(),a.softwareText(),a.gamesText(),a.targetResolution(),a.targetFps(),0));
        s.process(1,id,x->criteria()); assertEquals("FAILED",s.get(1,id).status()); assertNull(s.get(1,id).result());
    }
    @Test void currentPriceChangesDoNotRewriteEstimateAndCartRejectsMissingStock() throws Exception {
        var s=new RecommendationService(factory); int id=s.create(1,answers()); s.process(1,id,a->criteria());
        var before=s.get(1,id).result(); assertNotNull(before);
        int productId=before.build().items().getFirst().productId();
        sql("UPDATE products SET price=price+123 WHERE product_id="+productId);
        try {
            var after=s.get(1,id).result();
            assertEquals(before.estimatedTotal(),after.estimatedTotal());
            assertEquals(0,before.build().totalAmount().add(new BigDecimal("123")).compareTo(after.build().totalAmount()));
            try(var em=factory.createEntityManager()) {
                em.getTransaction().begin();
                em.createNativeQuery("UPDATE inventory SET quantity_on_hand=0,reserved_quantity=0 WHERE product_id=:id").setParameter("id",productId).executeUpdate();
                em.getTransaction().commit();
            }
            assertThrows(AppException.class,()->s.addToCart(1,id));
        } finally {
            sql("UPDATE products SET price=price-123 WHERE product_id="+productId);
            sql("UPDATE inventory SET quantity_on_hand=10,reserved_quantity=0 WHERE product_id="+productId);
        }
    }
    @Test void expiredRequestCannotBeOverwrittenByLateAiResponse() throws Exception {
        var s=new RecommendationService(factory); int id=s.create(1,answers());
        s.process(1,id,a->{
            try {sql("UPDATE recommendation_requests SET created_at=localtimestamp-interval '10 minutes' WHERE request_id="+id);}
            catch(SQLException e) {throw new RuntimeException(e);}
            assertEquals("FAILED",s.get(1,id).status()); return criteria();
        });
        assertEquals("FAILED",s.get(1,id).status()); assertNull(s.get(1,id).result());
    }
    static void sql(String sql) throws SQLException { try(var st=db.createStatement()) {st.execute(sql);} }
}
