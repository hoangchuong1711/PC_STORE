package com.pcstore.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.dao.*;
import com.pcstore.dto.*;
import com.pcstore.dto.RecommendationDto.*;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.dto.CompatibilityDto.Status;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.*;
import com.pcstore.exception.AppException;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;

public final class RecommendationService {
    private static final ObjectMapper JSON=new ObjectMapper();
    private final EntityManagerFactory factory;
    public RecommendationService(EntityManagerFactory factory) { this.factory=factory; }
    public int create(int userId,Answers input) {
        Answers a=RecommendationCriteria.validateAnswers(input);
        return tx(em->{ customer(em,userId,true); var dao=new RecommendationDao(em); dao.expire(userId); return dao.create(userId,a); });
    }
    public void process(int userId,int id,CriteriaProvider provider) {
        try {
            Answers a=tx(em->{ customer(em,userId,true); var dao=new RecommendationDao(em); var row=dao.owned(userId,id,true);
                if(!"QUEUED".equals(row[0])) return null; dao.processing(id); return dao.answers(id,row); });
            if(a==null) return;
            Criteria criteria=RecommendationCriteria.validate(provider.generate(a),a.minStorageGb());
            tx(em->{ new RecommendationDao(em).criteria(id,encode(criteria)); return null; });
            List<BuilderCatalogDto.Product> catalog;
            try(var em=factory.createEntityManager()) { catalog=new BuilderCatalogService(em).products(); }
            SearchResult found=new RecommendationSearch(200000,2000).find(catalog,criteria,a.pcBudget());
            if(found.products().isEmpty()) {
                fail(userId,id,found.limited()?"SEARCH_LIMIT":"NO_MATCH",
                    found.limited()?"Đã hết giới hạn tìm kiếm; chưa thể kết luận ngân sách không đủ.":
                    "Chưa có bộ PC đạt tiêu chí, tương thích và trong ngân sách từ hàng hiện có. Hãy điều chỉnh nhu cầu hoặc ngân sách.",true); return;
            }
            tx(em->{
                User user=customer(em,userId,true); var dao=new RecommendationDao(em);
                if(!"PROCESSING".equals(dao.owned(userId,id,true)[0])) return null;
                // Lock catalog rows in a stable order, then reload before accepting the snapshot.
                for(var p:found.products().stream().sorted(Comparator.comparingInt(BuilderCatalogDto.Product::productId)).toList()) {
                    em.find(Product.class,p.productId(),LockModeType.PESSIMISTIC_READ);
                    var inv=new CartDao(em).findInventory(p.productId()); if(inv!=null) em.lock(inv,LockModeType.PESSIMISTIC_READ);
                }
                var current=new BuilderCatalogService(em).products();
                for(var p:found.products()) {
                    var fresh=current.stream().filter(x->x.productId()==p.productId()).findFirst().orElse(null);
                    if(fresh==null || fresh.price().compareTo(p.price())!=0 || !Objects.equals(fresh.spec(),p.spec()))
                        throw new AppException(409,"CATALOG_CHANGED","Giá, kho hoặc thông số vừa thay đổi. Vui lòng tìm lại.");
                }
                var selections=found.products().stream().map(p->new Selection(p.productId(),1)).toList();
                if(new CompatibilityService(em).evaluate(selections).status()!=Status.PASS)
                    throw new AppException(409,"CATALOG_CHANGED","Cấu hình không còn đạt kiểm tra tương thích. Vui lòng tìm lại.");
                PcBuild build=new PcBuild(); build.setUser(user); build.setName("PC gợi ý #"+id); build.setSourceType("RECOMMENDATION");
                new BuildDao(em).save(build);
                for(var p:found.products()) { var item=new PcBuildItem(); item.setBuild(build); item.setProduct(em.getReference(Product.class,p.productId())); item.setQuantity(1); build.getItems().add(item); }
                em.flush();
                String reason="PREFERRED".equals(found.level())?"Đạt mức mong muốn; tổng giá sát ngân sách nhất trong các phương án đã xét.":
                    "Đã giảm xuống mức tối thiểu vì chưa tìm được bộ đạt toàn bộ mức mong muốn trong ngân sách.";
                dao.accept(id,build.getBuildId(),found,reason); return null;
            });
        } catch(AppException e) { fail(userId,id,e.getCode(),e.getMessage(),false); }
        catch(RuntimeException e) { fail(userId,id,"PROCESSING_ERROR","Không thể hoàn tất tư vấn. Vui lòng thử lại.",false); }
    }
    public void fail(int userId,int id,String code,String reason,boolean rejected) {
        tx(em->{ var dao=new RecommendationDao(em); dao.owned(userId,id,true); dao.fail(id,code,reason,rejected); return null; });
    }
    public Response get(int userId,int id) {
        return tx(em->{
            customer(em,userId,true); var dao=new RecommendationDao(em); dao.expire(userId);
            var row=dao.owned(userId,id,false); var attempt=dao.attempt(id); var result=dao.result(((Number)attempt[0]).intValue());
            Result dto=null;
            if(result!=null) {
                int buildId=((Number)result[0]).intValue();
                var build=new BuildDao(em).findOwned(userId,buildId,false);
                List<BuildDto.Item> items=build.getItems().stream().map(i->new BuildDto.Item(i.getProduct().getProductId(),i.getProduct().getName(),i.getQuantity(),i.getProduct().getPrice(),i.getProduct().getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))).toList();
                var selections=items.stream().map(i->new Selection(i.productId(),i.quantity())).toList();
                var report=new CompatibilityService(em).evaluate(selections);
                var buildDto=new BuildDto.Response(buildId,build.getName(),build.getSourceType(),items,items.stream().map(BuildDto.Item::lineTotal).reduce(BigDecimal.ZERO,BigDecimal::add),report);
                var products=new ArrayList<BuilderCatalogDto.Product>(); var productDao=new ProductDao(em);
                var quantities=productDao.availableQuantities(items.stream().map(BuildDto.Item::productId).toList());
                for(var i:build.getItems()) {
                    Product p=i.getProduct();
                    products.add(new BuilderCatalogDto.Product(p.getProductId(),p.getName(),p.getBrand().getName(),p.getCategory().getComponentType().name(),p.getPrice(),
                        productDao.findPublic(p.getProductId())==null?0:quantities.getOrDefault(p.getProductId(),0),null,new ProductSpecDao(em).find(p.getProductId(),p.getCategory().getComponentType())));
                }
                dto=new Result(buildDto,products,(BigDecimal)result[1],(String)result[2],(Boolean)result[3],((Number)result[4]).longValue(),(String)result[5]);
            }
            return new Response(id,(String)row[0],dao.answers(id,row),decode((String)attempt[1]),(String)attempt[2],(String)attempt[3],dto);
        });
    }
    public CartResponse addToCart(int userId,int id) {
        return tx(em->{ customer(em,userId,true); var build=resultBuild(em,userId,id);
            var selections=build.getItems().stream().map(i->new Selection(i.getProduct().getProductId(),i.getQuantity())).toList();
            if(new CompatibilityService(em).evaluate(selections).status()!=Status.PASS) throw new AppException(409,"BUILD_NOT_READY","Cấu hình không còn đạt kiểm tra tương thích.");
            return new CartService(em).addItemsInTransaction(userId,selections);
        });
    }
    public BuildDto.Response copy(int userId,int id) {
        var saved=get(userId,id);
        if(saved.result()==null) throw new AppException(409,"RESULT_NOT_READY","Chưa có cấu hình để chỉnh sửa.");
        try(var em=factory.createEntityManager()) { return new BuildService(em).create(userId,new BuildDto.Request("Bản sao PC gợi ý #"+id,
            saved.result().build().items().stream().map(i->new Selection(i.productId(),i.quantity())).toList())); }
    }
    private PcBuild resultBuild(EntityManager em,int userId,int id) {
        var dao=new RecommendationDao(em); var row=dao.owned(userId,id,true);
        if(!"SUCCEEDED".equals(row[0])) throw new AppException(409,"RESULT_NOT_READY","Chưa có kết quả tư vấn.");
        var result=dao.result(((Number)dao.attempt(id)[0]).intValue());
        return new BuildDao(em).findOwned(userId,((Number)result[0]).intValue(),true);
    }
    private static User customer(EntityManager em,int id,boolean lock) {
        User user=id<=0?null:new CartDao(em).findUser(id,lock);
        if(user==null || user.getStatus()!=UserStatus.ACTIVE) throw new AppException(401,"UNAUTHORIZED","Bạn cần đăng nhập lại.");
        if(user.getRole()!=UserRole.CUSTOMER) throw new AppException(403,"FORBIDDEN","Chỉ khách hàng được tư vấn.");
        return user;
    }
    private <T>T tx(Function<EntityManager,T> fn) {
        try(var em=factory.createEntityManager()) { var tx=em.getTransaction(); tx.begin();
            try { T value=fn.apply(em); tx.commit(); return value; } catch(RuntimeException e) { if(tx.isActive())tx.rollback(); throw e; }
        }
    }
    private static String encode(Criteria c) { try {return JSON.writeValueAsString(c);} catch(java.io.IOException e) {throw new IllegalStateException(e);} }
    private static Criteria decode(String s) { if(s==null)return null; try {return JSON.readValue(s,Criteria.class);} catch(java.io.IOException e) {throw new IllegalStateException(e);} }
}
