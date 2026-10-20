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
        Result response = request("REVIEW", "video/mp4");
        assertEquals(413, response.status());
        assertEquals("MEDIA_TOO_LARGE", response.code());
    }

    @Test void rejectsMissingModuleBeforeStartingMediaProcessing() throws Exception {
        Result response = request(null, "video/mp4");
        assertEquals(400, response.status());
        assertEquals("INVALID_MEDIA_MODULE", response.code());
    }

    @Test void rejectsMissingContentTypeBeforeStartingMediaProcessing() throws Exception {
        Result response = request("REVIEW", null);
        assertEquals(415, response.status());
        assertEquals("UNSUPPORTED_MEDIA_TYPE", response.code());
    }

    private record Result(int status, String code) { }

    private Result request(String module, String mimeType) throws Exception {
        var session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{HttpSession.class},
                (proxy, method, args) -> "getAttribute".equals(method.getName()) && SessionUtil.USER_ID.equals(args[0]) ? 1 : null);
        var request = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{HttpServletRequest.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getSession" -> session;
                    case "getHeader" -> "Origin".equals(args[0]) ? "http://localhost:3000" : module;
                    case "getContentType" -> mimeType;
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
        return new Result(status[0], new ObjectMapper().readTree(output.toString()).path("code").asText());
    }
}
