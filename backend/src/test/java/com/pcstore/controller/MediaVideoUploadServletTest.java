package com.pcstore.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.*;

class MediaVideoUploadServletTest {
    @Test void rejectsOversizedVideoBeforeStartingMediaProcessing() throws Exception {
        var session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{HttpSession.class},
                (proxy, method, args) -> "getAttribute".equals(method.getName()) && SessionUtil.USER_ID.equals(args[0]) ? 1 : null);
        var request = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{HttpServletRequest.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getSession" -> session;
                    case "getHeader" -> "Origin".equals(args[0]) ? "http://localhost:3000" : "REVIEW";
                    case "getContentType" -> "video/mp4";
                    case "getContentLengthLong" -> 20_000_001L;
                    case "getServerPort" -> 8080;
                    case "getServerName" -> "localhost";
                    case "getScheme" -> "http";
                    default -> null;
                });
        int[] status = {200};
        var output = new StringWriter();
        var response = (HttpServletResponse) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{HttpServletResponse.class},
                (proxy, method, args) -> {
                    if ("setStatus".equals(method.getName())) status[0] = (Integer) args[0];
                    if ("getWriter".equals(method.getName())) return new PrintWriter(output);
                    return null;
                });
        new MediaVideoUploadServlet().doPost(request, response);
        assertEquals(413, status[0]);
        assertEquals("MEDIA_TOO_LARGE", new ObjectMapper().readTree(output.toString()).path("code").asText());
    }
}
