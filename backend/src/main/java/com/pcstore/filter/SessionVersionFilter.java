package com.pcstore.filter;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.impl.UserDAOImpl;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.util.*;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

/** Validate every API session, including optional authentication on public routes. */
@WebFilter(urlPatterns = "/api/*")
public class SessionVersionFilter implements Filter {
    @Override public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        var req = (HttpServletRequest) request;
        Integer id = SessionUtil.userId(req);
        if (id != null) {
            Object saved = req.getSession(false).getAttribute(SessionUtil.AUTH_VERSION);
            long version = saved instanceof Long value ? value : 0L;
            try (var em = PersistenceManager.get().createEntityManager()) {
                var user = new UserDAOImpl().findById(em, id).orElse(null);
                if (user == null || user.getStatus() != UserStatus.ACTIVE || user.getAuthVersion() != version) {
                    SessionUtil.logout(req);
                    JsonUtil.write((HttpServletResponse) response, 401, Map.of("code", "UNAUTHORIZED", "message", "Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại."));
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }
}
