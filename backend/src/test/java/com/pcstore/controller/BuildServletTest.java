package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.*;
import org.junit.jupiter.api.Test;

import java.io.*;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class BuildServletTest {
    private record Response(int status, JsonNode body) {}

    private Response request(String method, String path, String body, boolean loggedIn) throws Exception {
        ByteArrayInputStream input = new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return input.read(); }
            @Override public boolean isFinished() { return input.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) {}
        };
        HttpSession session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class}, (proxy, invocation, args) ->
                        "getAttribute".equals(invocation.getName())
                                ? (SessionUtil.USER_ID.equals(args[0]) ? 1 : "CUSTOMER") : null);
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> method;
                    case "getPathInfo" -> path;
                    case "getSession" -> loggedIn ? session : null;
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
        new BuildServlet().service(req, res);
        return new Response(status[0], output.toString().isEmpty() ? null : new ObjectMapper().readTree(output.toString()));
    }

    @Test void requiresSession() throws Exception {
        Response result = request("GET", null, "", false);
        assertEquals(401, result.status());
        assertEquals("UNAUTHORIZED", result.body().path("code").asText());
    }

    @Test void invalidBodyCannotReachDatabase() throws Exception {
        for (String body : new String[]{"{", "null", "{}", "{\"name\":\"A\",\"items\":[{\"productId\":1.5,\"quantity\":1}]}",
                "{\"name\":\"A\",\"items\":[],\"userId\":2}"}) {
            Response result = request("POST", null, body, true);
            assertEquals(400, result.status(), body);
        }
    }

    @Test void invalidIdAndPathReturnStructuredErrors() throws Exception {
        for (String path : new String[]{"/0", "/abc", "/2147483648"}) {
            Response result = request("GET", path, "", true);
            assertEquals(400, result.status());
            assertEquals("INVALID_ID", result.body().path("code").asText());
        }
        Response missing = request("GET", "/1/extra", "", true);
        assertEquals(404, missing.status());
    }
}
