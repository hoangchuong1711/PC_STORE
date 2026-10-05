package com.pcstore.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import com.pcstore.util.SessionUtil;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

class AdminAuthorizationFilterTest {
    @Test
    void rejectsCustomerBeforeAdminServletRuns() throws Exception {
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        AtomicInteger status = new AtomicInteger();
        StringWriter body = new StringWriter();

        new AdminAuthorizationFilter().doFilter(
                requestWithRole("CUSTOMER"),
                response(status, body),
                (request, response) -> chainCalled.set(true));

        assertFalse(chainCalled.get());
        assertEquals(403, status.get());
        assertTrue(body.toString().contains("FORBIDDEN"));
    }

    @Test
    void allowsAdminToReachServlet() throws Exception {
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        new AdminAuthorizationFilter().doFilter(
                requestWithRole("ADMIN"),
                response(new AtomicInteger(), new StringWriter()),
                (request, response) -> chainCalled.set(true));

        assertTrue(chainCalled.get());
    }

    private HttpServletRequest requestWithRole(String role) {
        HttpSession session = (HttpSession) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "getAttribute" -> SessionUtil.USER_ID.equals(args[0]) ? 1
                            : SessionUtil.USER_ROLE.equals(args[0]) ? role : null;
                    default -> defaultValue(method.getReturnType());
                });

        return (HttpServletRequest) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class},
                (proxy, method, args) -> "getSession".equals(method.getName())
                        ? session : defaultValue(method.getReturnType()));
    }

    private HttpServletResponse response(AtomicInteger status, StringWriter body) {
        PrintWriter writer = new PrintWriter(body, true);
        return (HttpServletResponse) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class},
                (proxy, method, args) -> {
                    if ("setStatus".equals(method.getName())) status.set((Integer) args[0]);
                    if ("getWriter".equals(method.getName())) return writer;
                    return defaultValue(method.getReturnType());
                });
    }

    private Object defaultValue(Class<?> type) {
        if (!type.isPrimitive()) return null;
        if (type == boolean.class) return false;
        if (type == char.class) return '\0';
        if (type == byte.class) return (byte) 0;
        if (type == short.class) return (short) 0;
        if (type == int.class) return 0;
        if (type == long.class) return 0L;
        if (type == float.class) return 0F;
        if (type == double.class) return 0D;
        return null;
    }
}
