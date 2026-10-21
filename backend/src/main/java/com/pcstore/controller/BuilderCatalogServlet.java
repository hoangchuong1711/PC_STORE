package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.BuilderCatalogDto;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ValidationException;
import com.pcstore.service.BuilderCatalogService;
import com.pcstore.service.CompatibilityService;
import com.pcstore.util.JsonUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "builderCatalogServlet", urlPatterns = "/api/builder/*")
public class BuilderCatalogServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!"/products".equals(req.getPathInfo())) {
            error(res, 404, "NOT_FOUND", "Không tìm thấy endpoint.");
            return;
        }
        try (var em = PersistenceManager.get().createEntityManager()) {
            JsonUtil.write(res, 200, new BuilderCatalogService(em).products());
        } catch (RuntimeException exception) {
            serverError(res, exception);
        }
    }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        if (!"/compatibility".equals(req.getPathInfo())) {
            error(res, 404, "NOT_FOUND", "Không tìm thấy endpoint.");
            return;
        }
        BuilderCatalogDto.PreviewRequest input;
        try {
            input = mapper.readValue(req.getInputStream(), BuilderCatalogDto.PreviewRequest.class);
        } catch (IOException exception) {
            error(res, 400, "INVALID_JSON", "Danh sách linh kiện không hợp lệ.");
            return;
        }
        try {
            CompatibilityService.validateSelections(input == null ? null : input.items());
        } catch (ValidationException exception) {
            error(res, 400, "INVALID_BUILD", "Danh sách linh kiện không hợp lệ.");
            return;
        }
        try (var em = PersistenceManager.get().createEntityManager()) {
            JsonUtil.write(res, 200, new BuilderCatalogService(em).preview(input.items()));
        } catch (AppException exception) {
            error(res, exception.getStatus(), exception.getCode(), exception.getMessage());
        } catch (RuntimeException exception) {
            serverError(res, exception);
        }
    }

    private void serverError(HttpServletResponse res, RuntimeException exception) throws IOException {
        if (getServletContext() != null) getServletContext().log("Builder catalog request failed", exception);
        error(res, 500, "INTERNAL_ERROR", "Không thể xử lý Builder lúc này.");
    }

    private static void error(HttpServletResponse res, int status, String code, String message)
            throws IOException {
        JsonUtil.write(res, status, Map.of("code", code, "message", message));
    }
}
