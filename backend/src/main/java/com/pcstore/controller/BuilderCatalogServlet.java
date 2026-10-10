package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.BuilderCatalogDto;
import com.pcstore.exception.AppException;
import com.pcstore.service.BuilderCatalogService;
import com.pcstore.util.JsonUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@WebServlet(name = "builderCatalogServlet", urlPatterns = "/api/builder/*")
public class BuilderCatalogServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            String path = req.getPathInfo();
            String method = req.getMethod();
            if (!Set.of("GET", "POST").contains(method)) {
                res.setHeader("Allow", "GET, POST, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            if ("GET".equals(method) && "/products".equals(path)) {
                try (var em = PersistenceManager.get().createEntityManager()) {
                    JsonUtil.write(res, 200, new BuilderCatalogService(em).products());
                }
            } else if ("POST".equals(method) && "/compatibility".equals(path)) {
                BuilderCatalogDto.PreviewRequest input;
                try { input = mapper.readValue(req.getInputStream(), BuilderCatalogDto.PreviewRequest.class); }
                catch (IOException exception) { throw new AppException(400, "INVALID_JSON", "Danh sách linh kiện không hợp lệ."); }
                if (input == null || input.items() == null) throw invalid();
                Set<Integer> ids = new HashSet<>();
                for (var item : input.items()) {
                    if (item == null || item.productId() <= 0 || item.quantity() <= 0 || !ids.add(item.productId()))
                        throw invalid();
                }
                try (var em = PersistenceManager.get().createEntityManager()) {
                    JsonUtil.write(res, 200, new BuilderCatalogService(em).preview(input.items()));
                }
            } else {
                throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
            }
        } catch (AppException exception) {
            JsonUtil.write(res, exception.getStatus(), Map.of("code", exception.getCode(), "message", exception.getMessage()));
        } catch (RuntimeException exception) {
            if (getServletContext() != null) getServletContext().log("Builder catalog request failed", exception);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Builder lúc này."));
        }
    }

    private static AppException invalid() {
        return new AppException(400, "INVALID_BUILD", "Danh sách linh kiện không hợp lệ.");
    }
}
