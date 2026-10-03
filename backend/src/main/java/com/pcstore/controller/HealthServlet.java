package com.pcstore.controller;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.pcstore.config.PersistenceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import org.flywaydb.core.api.FlywayException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "healthServlet", urlPatterns = "/api/health")
public class HealthServlet extends HttpServlet {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
                entityManager.createNativeQuery("SELECT 1").getSingleResult();
            }
            response.setStatus(HttpServletResponse.SC_OK);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", "ok",
                    "application", "pc-store-backend",
                    "database", "connected"));
        } catch (IllegalStateException | PersistenceException | FlywayException exception) {
            getServletContext().log("Kiểm tra database thất bại", exception);
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", "unavailable",
                    "application", "pc-store-backend",
                    "database", "unavailable",
                    "message", "Không thể khởi tạo database. Kiểm tra cấu hình kết nối và log Tomcat."));
        }
    }
}
