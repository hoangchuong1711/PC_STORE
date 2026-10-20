package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.dto.AdminTaxonomyDto.BrandInput;
import com.pcstore.dto.AdminTaxonomyDto.CategoryInput;
import com.pcstore.dto.AdminTaxonomyDto.StatusInput;
import com.pcstore.exception.AppException;
import com.pcstore.service.AdminTaxonomyService;
import com.pcstore.util.JsonUtil;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * AdminTaxonomyServlet: Controller phục vụ các chức năng quản lý Danh mục (Categories) và Thương hiệu (Brands) cho Admin.
 * URL Mapping:
 * - /api/admin/categories/*
 * - /api/admin/brands/*
 * Tuân thủ mô hình MVC: Phân tách rõ ràng các method doGet, doPost, doPut, doDelete.
 */
@WebServlet(name = "adminTaxonomyServlet", urlPatterns = {"/api/admin/categories/*", "/api/admin/brands/*"})
public class AdminTaxonomyServlet extends HttpServlet {

    private final AdminTaxonomyService taxonomyService = new AdminTaxonomyService();

    /**
     * GET: Lấy danh sách toàn bộ danh mục hoặc thương hiệu.
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {
        res.setHeader("Cache-Control", "no-store");
        boolean isCategory = isCategoryEndpoint(req);
        String pathInfo = cleanPath(req.getPathInfo());

        try {
            if (pathInfo.isEmpty() || "/".equals(pathInfo)) {
                // Lấy toàn bộ danh sách danh mục hoặc hãng
                Object resultList = taxonomyService.list(isCategory);
                JsonUtil.write(res, HttpServletResponse.SC_OK, resultList);
            } else {
                sendNotFound(res);
            }
        } catch (AppException e) {
            sendAppError(res, e);
        } catch (Exception e) {
            logError(req, "Lỗi lấy danh sách taxonomy", e);
            sendInternalError(res);
        }
    }

    /**
     * POST: Thêm mới một Danh mục hoặc Thương hiệu.
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {
        res.setHeader("Cache-Control", "no-store");
        boolean isCategory = isCategoryEndpoint(req);
        String pathInfo = cleanPath(req.getPathInfo());

        try {
            if (pathInfo.isEmpty() || "/".equals(pathInfo)) {
                Object createdResult;
                if (isCategory) {
                    CategoryInput input = JsonUtil.read(req, CategoryInput.class);
                    createdResult = taxonomyService.saveCategory(null, input);
                } else {
                    BrandInput input = JsonUtil.read(req, BrandInput.class);
                    createdResult = taxonomyService.saveBrand(null, input);
                }
                // Trả về mã 201 Created
                JsonUtil.write(res, HttpServletResponse.SC_CREATED, createdResult);
            } else {
                sendNotFound(res);
            }
        } catch (AppException e) {
            sendAppError(res, e);
        } catch (IOException e) {
            sendBadRequest(res, "Dữ liệu JSON gửi lên không hợp lệ.");
        } catch (Exception e) {
            logError(req, "Lỗi tạo mới taxonomy", e);
            sendInternalError(res);
        }
    }

    /**
     * PUT: Cập nhật thông tin chi tiết hoặc cập nhật trạng thái (ACTIVE/HIDDEN) theo ID.
     * Hỗ trợ 2 dạng đường dẫn:
     * 1. PUT /{id}        -> Cập nhật toàn bộ thông tin (tên, mô tả, loại linh kiện, logo)
     * 2. PUT /{id}/status -> Cập nhật trạng thái hiển thị
     */
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {
        res.setHeader("Cache-Control", "no-store");
        boolean isCategory = isCategoryEndpoint(req);
        String pathInfo = cleanPath(req.getPathInfo());

        try {
            // Tách đường dẫn để lấy ID và cờ cập nhật status (ví dụ: "/12" hoặc "/12/status")
            String[] segments = pathInfo.split("/");
            if (segments.length < 2 || segments[1].isEmpty()) {
                sendNotFound(res);
                return;
            }

            int id;
            try {
                id = Integer.parseInt(segments[1]);
                if (id <= 0) {
                    sendNotFound(res);
                    return;
                }
            } catch (NumberFormatException e) {
                sendNotFound(res);
                return;
            }

            boolean isStatusUpdate = segments.length >= 3 && "status".equals(segments[2]);
            Object updatedResult;

            if (isStatusUpdate) {
                // Nhánh cập nhật trạng thái hiển thị
                StatusInput statusInput = JsonUtil.read(req, StatusInput.class);
                updatedResult = taxonomyService.updateStatus(isCategory, id, statusInput);
            } else {
                // Nhánh cập nhật thông tin chung
                if (isCategory) {
                    CategoryInput categoryInput = JsonUtil.read(req, CategoryInput.class);
                    updatedResult = taxonomyService.saveCategory(id, categoryInput);
                } else {
                    BrandInput brandInput = JsonUtil.read(req, BrandInput.class);
                    updatedResult = taxonomyService.saveBrand(id, brandInput);
                }
            }

            // Trả về mã 200 OK
            JsonUtil.write(res, HttpServletResponse.SC_OK, updatedResult);

        } catch (AppException e) {
            sendAppError(res, e);
        } catch (IOException e) {
            sendBadRequest(res, "Dữ liệu JSON gửi lên không hợp lệ.");
        } catch (Exception e) {
            logError(req, "Lỗi cập nhật taxonomy", e);
            sendInternalError(res);
        }
    }

    /**
     * DELETE: Chặn xóa cứng để bảo vệ tính toàn vẹn dữ liệu đơn hàng và sản phẩm.
     */
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {
        res.setHeader("Allow", "GET, POST, PUT, OPTIONS");
        Map<String, String> error = Map.of(
                "code", "METHOD_NOT_ALLOWED",
                "message", "Không hỗ trợ xóa cứng. Hãy đổi trạng thái sang HIDDEN để ẩn danh mục hoặc hãng."
        );
        JsonUtil.write(res, HttpServletResponse.SC_METHOD_NOT_ALLOWED, error);
    }

    // =========================================================================
    // CÁC HÀM TIỆN ÍCH HỖ TRỢ XỬ LÝ URL VÀ PHẢN HỒI LỖI
    // =========================================================================

    private boolean isCategoryEndpoint(HttpServletRequest req) {
        String servletPath = req.getServletPath();
        return servletPath != null && servletPath.contains("/categories");
    }

    private String cleanPath(String path) {
        return path == null ? "" : path.trim();
    }

    private void sendNotFound(HttpServletResponse res) throws IOException {
        JsonUtil.write(res, HttpServletResponse.SC_NOT_FOUND, Map.of(
                "code", "NOT_FOUND",
                "message", "Không tìm thấy endpoint yêu cầu."
        ));
    }

    private void sendBadRequest(HttpServletResponse res, String message) throws IOException {
        JsonUtil.write(res, HttpServletResponse.SC_BAD_REQUEST, Map.of(
                "code", "INVALID_JSON",
                "message", message
        ));
    }

    private void sendAppError(HttpServletResponse res, AppException e) throws IOException {
        JsonUtil.write(res, e.getStatus(), Map.of(
                "code", e.getCode(),
                "message", e.getMessage()
        ));
    }

    private void sendInternalError(HttpServletResponse res) throws IOException {
        JsonUtil.write(res, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, Map.of(
                "code", "INTERNAL_ERROR",
                "message", "Không thể lưu hoặc tải danh mục/thương hiệu lúc này."
        ));
    }

    private void logError(HttpServletRequest req, String message, Throwable t) {
        if (getServletContext() != null) {
            getServletContext().log(message + " [" + req.getRequestURI() + "]", t);
        }
    }
}
