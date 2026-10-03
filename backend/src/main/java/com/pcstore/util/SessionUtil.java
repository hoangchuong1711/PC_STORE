package com.pcstore.util;

import com.pcstore.entity.User;
import com.pcstore.entity.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

public final class SessionUtil {
    public static final String USER_ID = "userId";
    public static final String USER_ROLE = "userRole";
    private SessionUtil() { }

    public static void login(HttpServletRequest request, User user) {
        login(request, user.getUserId(), user.getRole());
    }

    public static void login(HttpServletRequest request, Integer userId, UserRole role) {
        HttpSession old = request.getSession(false);
        if (old != null) old.invalidate();
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(USER_ID, userId);
        session.setAttribute(USER_ROLE, role.name());
    }

    public static Integer userId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object value = session == null ? null : session.getAttribute(USER_ID);
        return value instanceof Integer id ? id : null;
    }

    public static void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }
}
