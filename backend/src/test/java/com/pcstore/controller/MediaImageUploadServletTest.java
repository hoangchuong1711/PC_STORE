package com.pcstore.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.*;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.*;

class MediaImageUploadServletTest {
    private record Result(int status, String code) { }

    @Test void refusesUnauthenticatedUploadBeforeReadingBody() throws Exception {
        assertEquals("UNAUTHORIZED", request(false, "http://localhost:3000", new byte[0]).code());
    }

    @Test void rejectsMissingOriginBeforeReadingBody() throws Exception {
        Result response = request(true, null, new byte[0]);
        assertEquals(403, response.status());
        assertEquals("ORIGIN_REQUIRED", response.code());
    }

    @Test void rejectsOversizedBodyBeforeCloudinaryOrDatabase() throws Exception {
        Result response = request(true, "http://localhost:3000", new byte[8_000_001]);
        assertEquals(413, response.status());
        assertEquals("MEDIA_TOO_LARGE", response.code());
    }

    private Result request(boolean loggedIn, String origin, byte[] bytes) throws Exception {
        var body = new ByteArrayInputStream(bytes);
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return body.read(); }
            @Override public int read(byte[] b, int off, int len) { return body.read(b, off, len); }
            @Override public boolean isFinished() { return body.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) { }
        };
        HttpSession session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class}, (proxy, method, args) ->
                        "getAttribute".equals(method.getName()) && SessionUtil.USER_ID.equals(args[0]) ? 1 : null);
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "getSession" -> loggedIn ? session : null;
                    case "getHeader" -> "Origin".equals(args[0]) ? origin : "SETUP";
                    case "getContentType" -> "image/png";
                    case "getContentLengthLong" -> (long) bytes.length;
                    case "getServerPort" -> 8080;
                    case "getServerName" -> "localhost";
                    case "getScheme" -> "http";
                    case "getInputStream" -> stream;
                    default -> null;
                });
        int[] status = {200};
        var output = new StringWriter();
        HttpServletResponse res = (HttpServletResponse) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class}, (proxy, method, args) -> {
                    if ("setStatus".equals(method.getName())) status[0] = (Integer) args[0];
                    if ("getWriter".equals(method.getName())) return new PrintWriter(output);
                    return null;
                });
        new MediaImageUploadServlet().doPost(req, res);
        return new Result(status[0], new ObjectMapper().readTree(output.toString()).path("code").asText());
    }
}
