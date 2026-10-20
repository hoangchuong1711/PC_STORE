package com.pcstore.config;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.SessionTrackingMode;
import jakarta.servlet.annotation.WebListener;
import java.util.Set;

/** Configure container-generated cookies before any session is created. */
@WebListener
public class SessionCookieListener implements ServletContextListener {
    @Override public void contextInitialized(ServletContextEvent event) {
        var context = event.getServletContext();
        var cookie = context.getSessionCookieConfig();
        // Next exposes /api while the WAR is deployed at /pc-store-backend.
        // Tomcat's internal session cookies bypass response-wrapper addHeader.
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setAttribute("SameSite", "Lax");
        cookie.setSecure(Boolean.parseBoolean(System.getenv().getOrDefault("SESSION_COOKIE_SECURE", "false")));
        context.setSessionTrackingModes(Set.of(SessionTrackingMode.COOKIE));
    }
}
