package com.pcstore.filter;

import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@WebFilter(urlPatterns = "/api/admin/*")
public class AdminAuthorizationFilter implements Filter {
    @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        if (SessionUtil.userId(req) == null) {
            JsonUtil.write((HttpServletResponse) response, 401, Map.of("code", "UNAUTHORIZED", "message", "Bạn cần đăng nhập."));
            return;
        }
        Object role = req.getSession(false) == null ? null : req.getSession(false).getAttribute(SessionUtil.USER_ROLE);
        if (!"ADMIN".equals(role)) {
            JsonUtil.write((HttpServletResponse) response, 403, Map.of("code", "FORBIDDEN", "message", "Bạn không có quyền truy cập."));
            return;
        }
        chain.doFilter(request, response);
    }
}
