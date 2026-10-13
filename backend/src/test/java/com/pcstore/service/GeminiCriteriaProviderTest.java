package com.pcstore.service;

import com.pcstore.dto.RecommendationDto.Answers;
import com.pcstore.exception.AppException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class GeminiCriteriaProviderTest {
    private static final String VALID="""
        {"thresholds":[
          {"componentType":"CPU","field":"cores","minimum":4,"preferred":6},
          {"componentType":"CPU","field":"threads","minimum":8,"preferred":12},
          {"componentType":"GPU","field":"vramGb","minimum":4,"preferred":8},
          {"componentType":"RAM","field":"capacityGb","minimum":16,"preferred":32},
          {"componentType":"STORAGE","field":"capacityGb","minimum":500,"preferred":1000}
        ],"assumptions":[]}
        """;
    static Answers answers() { return new Answers(new BigDecimal("20000000"),List.of("GAMING"),"Học và chơi game","Trình duyệt","Game","1080p",60,1000); }
    @Test void parsesStructuredCriteriaAndEnforcesUserStorageFloor() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            String request=new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
            assertTrue(request.contains("responseJsonSchema"));
            assertFalse(request.contains("productId"));
            byte[] body=envelope(VALID);
            exchange.sendResponseHeaders(200,body.length); exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            var c=new GeminiCriteriaProvider("test-key",URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/")).generate(answers());
            assertEquals(1000,c.thresholds().stream().filter(t->t.componentType().equals("STORAGE")).findFirst().orElseThrow().minimum());
        } finally { server.stop(0); }
    }
    @Test void quotaErrorsDoNotExposeProviderBodyOrKey() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{ exchange.getRequestBody().readAllBytes(); exchange.sendResponseHeaders(429,0); exchange.getResponseBody().write("private-provider-detail".getBytes()); exchange.close(); }); server.start();
        try {
            var e=assertThrows(AppException.class,()->new GeminiCriteriaProvider("secret",URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/")).generate(answers()));
            assertEquals("AI_RATE_LIMITED",e.getCode()); assertFalse(e.getMessage().contains("private-provider-detail"));
        } finally { server.stop(0); }
    }
    @Test void invalidProviderRequestExplainsThatModelRequestWasRejected() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{ exchange.getRequestBody().readAllBytes(); exchange.sendResponseHeaders(400,0); exchange.getResponseBody().write("private-provider-detail".getBytes()); exchange.close(); }); server.start();
        try {
            var e=assertThrows(AppException.class,()->new GeminiCriteriaProvider("test",URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/")).generate(answers()));
            assertEquals("AI_INVALID_REQUEST",e.getCode());
            assertFalse(e.getMessage().contains("private-provider-detail"));
        } finally { server.stop(0); }
    }
    @Test void incompleteAiOutputCannotSilentlyDropCpuAndGpuRequirements() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            exchange.getRequestBody().readAllBytes();
            byte[] body=envelope("{\"thresholds\":[{\"componentType\":\"RAM\",\"field\":\"capacityGb\",\"minimum\":16,\"preferred\":32}],\"assumptions\":[]}");
            exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);exchange.close();
        });server.start();
        try {
            assertThrows(AppException.class,()->new GeminiCriteriaProvider("test",URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/")).generate(answers()));
        } finally {server.stop(0);}
    }
    private static byte[] envelope(String text) throws java.io.IOException {
        return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(java.util.Map.of("candidates",List.of(java.util.Map.of("finishReason","STOP","content",java.util.Map.of("parts",List.of(java.util.Map.of("text",text)))))));
    }
}
