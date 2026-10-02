package com.pcstore.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.service.ProductCatalogService;
import com.pcstore.service.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(name = "productServlet", urlPatterns = "/api/products/*")
public class ProductServlet extends HttpServlet {
    // ObjectMapper: Class của thư viện Jackson, dùng để chuyển đổi giữa Java object và JSON.
    private final ObjectMapper mapper = new ObjectMapper();
    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setContentType("application/json"); res.setCharacterEncoding("UTF-8");
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            var service = new ProductCatalogService(em);
            String path = req.getPathInfo();
            if (path != null && path.length() > 1) {
                int id;
                try { id = Integer.parseInt(path.substring(1)); } catch (NumberFormatException e) { sendError(res, 400, "INVALID_ID", "Product id không hợp lệ"); return; }
                res.setStatus(200); mapper.writeValue(res.getWriter(), service.find(id)); return;
            }
            var q = ProductSearchQuery.parse(req.getParameter("q"), req.getParameter("categoryId"), req.getParameter("brandId"),
                    req.getParameter("minPrice"), req.getParameter("maxPrice"), req.getParameter("page"), req.getParameter("size"));
            res.setStatus(200); mapper.writeValue(res.getWriter(), service.search(q));
        } catch (ResourceNotFoundException e) { sendError(res, 404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm"); }
        catch (IllegalArgumentException e) { sendError(res, 400, "INVALID_QUERY", e.getMessage()); }
        catch (Exception e) { getServletContext().log("Catalog request failed", e); sendError(res, 500, "INTERNAL_ERROR", "Lỗi máy chủ"); }
    }
    private void sendError(HttpServletResponse res, int status, String code, String message) throws IOException { res.setStatus(status); mapper.writeValue(res.getWriter(), Map.of("code", code, "message", message == null ? "Invalid request" : message)); }
}
