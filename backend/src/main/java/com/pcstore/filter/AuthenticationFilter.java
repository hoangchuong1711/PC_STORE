package com.pcstore.filter;

import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@WebFilter(urlPatterns = {"/api/auth/*", "/api/admin/*", "/api/customer/*"})
public class AuthenticationFilter implements Filter {
    @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String path = req.getRequestURI().substring(req.getContextPath().length());
        boolean protectedRoute = path.equals("/api/auth/me") || path.equals("/api/auth/logout")
                || path.startsWith("/api/admin/") || path.startsWith("/api/customer/");
        if (protectedRoute && SessionUtil.userId(req) == null) {
            JsonUtil.write((HttpServletResponse) response, 401, Map.of("code", "UNAUTHORIZED", "message", "Bạn cần đăng nhập."));
            return;
        }
        if (path.startsWith("/api/customer/") && !"CUSTOMER".equals(req.getSession(false).getAttribute(SessionUtil.USER_ROLE))) {
            JsonUtil.write((HttpServletResponse) response, 403, Map.of("code", "FORBIDDEN", "message", "Chỉ khách hàng được truy cập."));
            return;
        }
        chain.doFilter(request, response);
    }
}
