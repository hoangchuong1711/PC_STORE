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

/** HTTP parsing and error responses; doubles cover only the Servlet I/O boundary. */
class CartServletTest {
    private record Response(int status, JsonNode body) { }

    private Response request(String method, String path, String body, boolean loggedIn) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream input = new ByteArrayInputStream(bytes);
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return input.read(); }
            @Override public boolean isFinished() { return input.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) { }
        };
        HttpSession session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class}, (proxy, invocation, args) -> {
                    if ("getAttribute".equals(invocation.getName()))
                        return SessionUtil.USER_ID.equals(args[0]) ? 1 : "CUSTOMER";
                    return null;
                });
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

        new CartServlet().service(req, res);
        return new Response(status[0], new ObjectMapper().readTree(output.toString()));
    }

    @Test void unauthenticatedRequestReturnsJson401() throws Exception {
        Response result = request("GET", null, "", false);
        assertEquals(401, result.status());
        assertEquals("UNAUTHORIZED", result.body().path("code").asText());
    }

    @Test void invalidJsonIsRejectedBeforeDatabaseAccess() throws Exception {
        for (String body : new String[]{"{", "null", "", "{}", "{\"productId\":1,\"quantity\":1} {}"}) {
            Response result = request("POST", "/items", body, true);
            assertEquals(400, result.status(), body);
        }
    }

    @Test void fractionalStringsAndOverflowAreNotCoercedToIntegers() throws Exception {
        for (String body : new String[]{
                "{\"productId\":1,\"quantity\":1.5}",
                "{\"productId\":1,\"quantity\":\"2\"}",
                "{\"productId\":true,\"quantity\":1}",
                "{\"productId\":1,\"quantity\":2147483648}",
                "{\"productId\":1.5,\"quantity\":1}"}) {
            Response result = request("POST", "/items", body, true);
            assertEquals(400, result.status(), body);
            assertEquals("INVALID_JSON", result.body().path("code").asText());
        }
    }

    @Test void clientPriceAndUserIdFieldsAreRejected() throws Exception {
        for (String extra : new String[]{"\"price\":0", "\"userId\":2", "\"role\":\"ADMIN\""}) {
            Response result = request("POST", "/items", "{\"productId\":1,\"quantity\":1," + extra + "}", true);
            assertEquals(400, result.status());
            assertEquals("INVALID_JSON", result.body().path("code").asText());
        }
    }

    @Test void invalidQuantitiesAreRejectedBeforeDatabaseAccess() throws Exception {
        for (String quantity : new String[]{"0", "-1", "null"}) {
            Response result = request("POST", "/items",
                    "{\"productId\":1,\"quantity\":" + quantity + "}", true);
            assertEquals(400, result.status());
            assertEquals("INVALID_QUANTITY", result.body().path("code").asText());
        }
        for (String body : new String[]{"{\"quantity\":-1}", "{\"quantity\":null}", "{}"}) {
            Response result = request("PATCH", "/items/1", body, true);
            assertEquals(400, result.status());
            assertEquals("INVALID_QUANTITY", result.body().path("code").asText());
        }
    }

    @Test void invalidItemIdsReturnJson400ForPatchAndDelete() throws Exception {
        for (String method : new String[]{"PATCH", "DELETE"}) {
            for (String id : new String[]{"0", "-1", "abc", "2147483648"}) {
                Response result = request(method, "/items/" + id, "{\"quantity\":1}", true);
                assertEquals(400, result.status());
                assertEquals("INVALID_ID", result.body().path("code").asText());
            }
        }
    }

    @Test void unknownPathsAndUnsupportedMethodsHaveJsonErrors() throws Exception {
        Response missing = request("GET", "/items/1/extra", "", true);
        assertEquals(404, missing.status());
        assertEquals("NOT_FOUND", missing.body().path("code").asText());
        Response wrongMethod = request("PUT", null, "", true);
        assertEquals(405, wrongMethod.status());
        assertEquals("METHOD_NOT_ALLOWED", wrongMethod.body().path("code").asText());
    }
}
