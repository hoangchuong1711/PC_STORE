package com.pcstore.controller;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.RecommendationDto.Answers;
import com.pcstore.exception.AppException;
import com.pcstore.service.*;
import com.pcstore.util.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.*;

@WebServlet(name="recommendationServlet",urlPatterns="/api/customer/recommendations/*")
public class RecommendationServlet extends HttpServlet {
    private final ObjectMapper json=JsonMapper.builder().disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private final ThreadPoolExecutor workers=new ThreadPoolExecutor(2,2,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(4),
        r->{Thread t=new Thread(r,"pc-recommendation");t.setDaemon(true);return t;},new ThreadPoolExecutor.AbortPolicy());
    @Override protected void service(HttpServletRequest req,HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control","no-store");
        try {
            Integer userId=SessionUtil.userId(req);
            if(userId==null) throw new AppException(401,"UNAUTHORIZED","Bạn cần đăng nhập.");
            if(!"CUSTOMER".equals(req.getSession(false).getAttribute(SessionUtil.USER_ROLE)))
                throw new AppException(403,"FORBIDDEN","Chỉ khách hàng được tư vấn.");
            String method=req.getMethod(),path=req.getPathInfo();
            if(!method.equals("GET") && !method.equals("POST")) {
                res.setHeader("Allow","GET, POST"); throw new AppException(405,"METHOD_NOT_ALLOWED","Phương thức không được hỗ trợ.");
            }
            if(path==null || path.equals("/")) {
                if(!method.equals("POST")) throw missing();
                Answers a;
                try {
                    byte[] bytes=req.getInputStream().readNBytes(16385);
                    if(bytes.length>16384) throw new AppException(413,"REQUEST_TOO_LARGE","Câu trả lời quá dài.");
                    a=RecommendationCriteria.validateAnswers(json.readValue(bytes,Answers.class));
                } catch(IOException e) {throw new AppException(400,"INVALID_JSON","Câu trả lời phải là JSON đúng cấu trúc.");}
                var provider=GeminiCriteriaProvider.fromEnvironment();
                var service=new RecommendationService(PersistenceManager.get());
                int id=service.create(userId,a);
                try { workers.execute(()->{
                    try {service.process(userId,id,provider);}
                    catch(RuntimeException e) { if(getServletContext()!=null)getServletContext().log("Recommendation worker could not finish; request expires after 3 minutes"); }
                }); } catch(RejectedExecutionException e) {
                    service.fail(userId,id,"QUEUE_FULL","Hệ thống đang bận. Vui lòng thử lại sau.",false);
                    throw new AppException(503,"QUEUE_FULL","Hệ thống đang bận. Vui lòng thử lại sau.");
                }
                JsonUtil.write(res,202,Map.of("requestId",id,"status","QUEUED")); return;
            }
            if(!path.matches("/[^/]+(/cart|/copy)?")) throw missing();
            String[] parts=path.substring(1).split("/"); int id=id(parts[0]);
            if((parts.length==1 && !method.equals("GET")) || (parts.length==2 && !method.equals("POST"))) throw missing();
            var service=new RecommendationService(PersistenceManager.get());
            Object result=parts.length==1?service.get(userId,id):parts[1].equals("cart")?service.addToCart(userId,id):service.copy(userId,id);
            JsonUtil.write(res,parts.length==2 && parts[1].equals("copy")?201:200,result);
        } catch(AppException e) {JsonUtil.write(res,e.getStatus(),Map.of("code",e.getCode(),"message",e.getMessage()));}
        catch(RuntimeException e) {JsonUtil.write(res,500,Map.of("code","INTERNAL_ERROR","message","Không thể xử lý tư vấn lúc này."));}
    }
    private static int id(String value) {
        try { int id=Integer.parseInt(value);if(id>0)return id; } catch(NumberFormatException ignored) {}
        throw new AppException(400,"INVALID_ID","ID tư vấn không hợp lệ.");
    }
    private static AppException missing() {return new AppException(404,"NOT_FOUND","Không tìm thấy endpoint.");}
    @Override public void destroy() {workers.shutdownNow();super.destroy();}
}
