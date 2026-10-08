package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.dto.AdminTaxonomyDto.*;
import com.pcstore.exception.AppException;
import com.pcstore.service.AdminTaxonomyService;
import com.pcstore.util.JsonUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(name = "adminTaxonomyServlet", urlPatterns = {"/api/admin/categories/*", "/api/admin/brands/*"})
public class AdminTaxonomyServlet extends HttpServlet {
    private final AdminTaxonomyService taxonomy = new AdminTaxonomyService();
    private final JsonMapper mapper = JsonMapper.builder()
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS).build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            boolean categories = req.getServletPath().equals("/api/admin/categories");
            String path = req.getPathInfo() == null ? "" : req.getPathInfo();
            boolean collection = path.isEmpty() || path.equals("/");
            String method = req.getMethod();
            if (!method.equals("GET") && !method.equals("POST") && !method.equals("PUT")) {
                res.setHeader("Allow", "GET, POST, PUT, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Không hỗ trợ xóa cứng. Hãy ẩn danh mục/hãng.");
            }
            res.setHeader("Cache-Control", "no-store");
            if (collection && method.equals("GET")) {
                JsonUtil.write(res, 200, taxonomy.list(categories));
            } else if (collection && method.equals("POST")) {
                JsonUtil.write(res, 201, categories ? taxonomy.saveCategory(null, read(req, CategoryInput.class))
                        : taxonomy.saveBrand(null, read(req, BrandInput.class)));
            } else if (method.equals("PUT") && path.matches("/[1-9][0-9]*(/status)?")) {
                int id;
                try { id = Integer.parseInt(path.split("/")[1]); }
                catch (NumberFormatException e) { throw notFound(); }
                Object result = path.endsWith("/status") ? taxonomy.status(categories, id, read(req, StatusInput.class))
                        : categories ? taxonomy.saveCategory(id, read(req, CategoryInput.class))
                        : taxonomy.saveBrand(id, read(req, BrandInput.class));
                JsonUtil.write(res, 200, result);
            } else throw notFound();
        } catch (AppException e) {
            JsonUtil.write(res, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (IOException e) {
            JsonUtil.write(res, 400, Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        } catch (RuntimeException e) {
            getServletContext().log("Admin taxonomy request failed", e);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể lưu hoặc tải danh mục/hãng lúc này."));
        }
    }
    private <T> T read(HttpServletRequest req, Class<T> type) throws IOException { return mapper.readValue(req.getInputStream(), type); }
    private static AppException notFound() { return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint."); }
}
