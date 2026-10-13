package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.dto.AdminProductResponse;
import com.pcstore.service.AdminProductService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdminProductServletTest {
    private record Result(int status, JsonNode body) {}

    private Result request(AdminProductService service, String method, String path) throws Exception {
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> method;
                    case "getPathInfo" -> path;
                    default -> null;
                });
        int[] status = {200};
        StringWriter output = new StringWriter();
        HttpServletResponse res = (HttpServletResponse) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class}, (proxy, invocation, args) -> {
                    if ("setStatus".equals(invocation.getName())) status[0] = (Integer) args[0];
                    if ("getWriter".equals(invocation.getName())) return new PrintWriter(output);
                    return null;
                });
        AdminProductServlet servlet = new AdminProductServlet(service);
        servlet.doGet(req, res);
        return new Result(status[0], new ObjectMapper().readTree(output.toString()));
    }

    @Test
    void listsProductsOnEmptyOrRootPath() throws Exception {
        AdminProductService stubService = new AdminProductService() {
            @Override
            public List<AdminProductResponse> list() {
                return List.of(new AdminProductResponse(
                        1, "Test Product", "Description", new BigDecimal("1000000"),
                        "ACTIVE", 1, "CPU", 2, "Intel", 10, 0, 10, Map.of()));
            }
        };

        Result r1 = request(stubService, "GET", null);
        assertEquals(200, r1.status());
        assertTrue(r1.body().isArray());
        assertEquals(1, r1.body().size());
        assertEquals("Test Product", r1.body().get(0).get("name").asText());
        assertEquals(1000000, r1.body().get(0).get("price").asInt());
        assertEquals(10, r1.body().get(0).get("availableQuantity").asInt());

        Result r2 = request(stubService, "GET", "/");
        assertEquals(200, r2.status());
        assertEquals(1, r2.body().size());

        Result r3 = request(stubService, "GET", "");
        assertEquals(200, r3.status());
        assertEquals(1, r3.body().size());
    }

    @Test
    void returnsNotFoundOnInvalidPath() throws Exception {
        AdminProductService stubService = new AdminProductService() {
            @Override
            public List<AdminProductResponse> list() {
                return List.of();
            }
        };

        Result r = request(stubService, "GET", "/not-an-id");
        assertEquals(404, r.status());
        assertEquals("ENDPOINT_NOT_FOUND", r.body().get("code").asText());
    }
}
