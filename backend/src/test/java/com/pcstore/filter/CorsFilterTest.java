package com.pcstore.filter;

import static org.junit.jupiter.api.Assertions.*;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

class CorsFilterTest {
    @ParameterizedTest
    @CsvSource({"http://localhost:8080,true", "http://localhost:3000,true",
            "http://evil.example,false", "http://localhost:8081,false",
            "https://localhost:8080,false", "http://localhost:8080.evil.example,false", "null,false"})
    void onlySameOriginOrExplicitlyAllowedOriginsReachServlet(String origin, boolean allowed) throws Exception {
        var reached = new AtomicBoolean();
        var status = new AtomicInteger(200);
        var body = new StringWriter();
        var req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "getHeader" -> "Origin".equals(args[0]) ? origin : null;
                    case "getScheme" -> "http";
                    case "getServerName" -> "localhost";
                    case "getServerPort" -> 8080;
                    case "getMethod" -> "POST";
                    default -> null;
                });
        var res = (HttpServletResponse) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class}, (proxy, method, args) -> {
                    if ("setStatus".equals(method.getName())) status.set((Integer) args[0]);
                    if ("getWriter".equals(method.getName())) return new PrintWriter(body);
                    return null;
                });
        var filter = new CorsFilter();
        filter.init(null);
        filter.doFilter(req, res, (request, response) -> reached.set(true));
        assertEquals(allowed, reached.get());
        assertEquals(allowed ? 200 : 403, status.get());
        if (!allowed) assertTrue(body.toString().contains("ORIGIN_NOT_ALLOWED"));
    }
}
