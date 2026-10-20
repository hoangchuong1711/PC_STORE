package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BuilderCatalogServletTest {
    private record Result(int status, JsonNode body) {}

    private Result request(String method, String path, String body) throws Exception {
        ByteArrayInputStream input = new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return input.read(); }
            @Override public boolean isFinished() { return input.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) {}
        };
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> method;
                    case "getPathInfo" -> path;
                    case "getInputStream" -> stream;
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
        new BuilderCatalogServlet().service(req, res);
        return new Result(status[0], new ObjectMapper().readTree(output.toString()));
    }

    @Test void rejectsInvalidUnsavedSelectionsBeforeDatabaseAccess() throws Exception {
        for (String body : new String[]{"{", "{}", "{\"items\":null}",
                "{\"items\":[{\"productId\":1.5,\"quantity\":1}]}",
                "{\"items\":[{\"productId\":1,\"quantity\":0}]}",
                "{\"items\":[{\"productId\":1,\"quantity\":1},{\"productId\":1,\"quantity\":1}]}"}) {
            Result result = request("POST", "/compatibility", body);
            assertEquals(400, result.status(), body);
        }
    }

    @Test void rejectsUnknownPathsAndMethods() throws Exception {
        assertEquals(404, request("GET", "/missing", "").status());
        assertEquals(405, request("DELETE", "/products", "").status());
    }
}
