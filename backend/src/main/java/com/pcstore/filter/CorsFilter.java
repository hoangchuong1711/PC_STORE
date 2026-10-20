package com.pcstore.filter;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@WebFilter(urlPatterns = "/*")
public class CorsFilter implements Filter {
    private Set<String> allowedOrigins;

    @Override public void init(FilterConfig config) {
        String configured = System.getenv().getOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000");
        allowedOrigins = Arrays.stream(configured.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toUnmodifiableSet());
    }

    @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        var req = (jakarta.servlet.http.HttpServletRequest) request;
        var res = (HttpServletResponse) response;
        String origin = req.getHeader("Origin");
        boolean sameOrigin = origin != null && origin.equals(requestOrigin(req));
        if (origin != null && !sameOrigin && !allowedOrigins.contains(origin)) {
            res.setStatus(403);
            res.setContentType("application/json");
            res.setCharacterEncoding("UTF-8");
            res.getWriter().write("{\"code\":\"ORIGIN_NOT_ALLOWED\",\"message\":\"Origin không được phép.\"}");
            return;
        }
        if (origin != null && allowedOrigins.contains(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, Idempotency-Key");
            res.setHeader("Access-Control-Expose-Headers", "Idempotent-Replayed");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            res.addHeader("Vary", "Origin");
        }
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) { res.setStatus(204); return; }
        chain.doFilter(request, response);
    }

    // Browser POST/PATCH requests include Origin even when Swagger UI shares this server.
    // Use the servlet connector's origin; do not trust arbitrary forwarded headers.
    private String requestOrigin(jakarta.servlet.http.HttpServletRequest request) {
        String scheme = request.getScheme();
        int port = request.getServerPort();
        boolean defaultPort = ("http".equals(scheme) && port == 80)
                || ("https".equals(scheme) && port == 443);
        return scheme + "://" + request.getServerName() + (defaultPort ? "" : ":" + port);
    }

}
