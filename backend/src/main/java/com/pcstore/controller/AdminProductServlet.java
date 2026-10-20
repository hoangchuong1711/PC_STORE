package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.dto.CreateProductRequest;
import com.pcstore.dto.UpdateInventoryRequest;
import com.pcstore.dto.UpdateProductRequest;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ValidationException;
import com.pcstore.service.AdminProductService;
import com.pcstore.util.JsonUtil;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * AdminProductServlet: Controller tiếp nhận các yêu cầu quản trị Sản phẩm và
 * Tồn kho từ Admin.
 * URL Mapping: /api/admin/products và /api/admin/products/*
 * 
 * - doGet: Xem danh sách sản phẩm hoặc chi tiết 1 sản phẩm theo ID.
 * - doPost: Tạo sản phẩm mới kèm tồn kho và thông số kỹ thuật (Specs).
 * - handlePatch: Cập nhật thông tin sản phẩm hoặc chỉnh sửa số lượng tồn kho.
 * - doDelete: Chặn xóa cứng sản phẩm để bảo vệ tính toàn vẹn dữ liệu đơn hàng.
 */
@WebServlet(name = "adminProductServlet", urlPatterns = { "/api/admin/products", "/api/admin/products/*" })
public class AdminProductServlet extends HttpServlet {

    private AdminProductService productService;

    public AdminProductServlet() {
    }

    // Constructor phục vụ kiểm thử (Unit test)
    AdminProductServlet(AdminProductService productService) {
        this.productService = productService;
    }

    @Override
    public void init() {
        if (productService == null) {
            productService = new AdminProductService();
        }
    }

    /**
     * Servlet 6.0 chưa có phương thức doPatch() riêng,
     * nên phân luồng PATCH trong service() trước khi chuyển cho HttpServlet.
     */
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        if ("PATCH".equalsIgnoreCase(request.getMethod())) {
            handlePatch(request, response);
            return;
        }
        super.service(request, response);
    }

    /**
     * GET: Lấy danh sách toàn bộ sản phẩm hoặc xem chi tiết 1 sản phẩm theo ID.
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String pathInfo = cleanPath(request.getPathInfo());

            if (isCollectionPath(pathInfo)) {
                // Lấy danh sách toàn bộ sản phẩm cho bảng Dashboard Admin
                JsonUtil.write(response, HttpServletResponse.SC_OK, productService.list());
                return;
            }

            // Trường hợp có ID: /api/admin/products/{id}
            int productId = parseSingleId(pathInfo);
            if (productId <= 0) {
                writeNotFound(response);
                return;
            }

            JsonUtil.write(response, HttpServletResponse.SC_OK, productService.get(productId));

        } catch (AppException exception) {
            writeAppError(response, exception);
        } catch (Exception exception) {
            logError(request, "Đọc thông tin sản phẩm admin thất bại", exception);
            writeError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ.");
        }
    }

    /**
     * POST: Thêm mới một sản phẩm vào hệ thống.
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String pathInfo = cleanPath(request.getPathInfo());
            if (!isCollectionPath(pathInfo)) {
                writeNotFound(response);
                return;
            }

            CreateProductRequest requestBody = JsonUtil.read(request, CreateProductRequest.class);
            Object createdResult = productService.create(requestBody);

            // Trả về mã 201 Created
            JsonUtil.write(response, HttpServletResponse.SC_CREATED, createdResult);

        } catch (IOException exception) {
            writeError(response, HttpServletResponse.SC_BAD_REQUEST, "INVALID_JSON",
                    "Dữ liệu JSON request không hợp lệ.");
        } catch (AppException exception) {
            writeAppError(response, exception);
        } catch (Exception exception) {
            logError(request, "Tạo mới sản phẩm admin thất bại", exception);
            writeError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ.");
        }
    }

    /**
     * PATCH: Xử lý cập nhật thông tin sản phẩm hoặc cập nhật tồn kho.
     * Hỗ trợ 2 dạng đường dẫn:
     * 1. PATCH /{id}/inventory -> Cập nhật số lượng tồn kho thực tế
     * 2. PATCH /{id} -> Cập nhật thông tin chi tiết của sản phẩm
     */
    private void handlePatch(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String pathInfo = cleanPath(request.getPathInfo());

        try {
            String[] segments = pathInfo.split("/");
            // Đường dẫn hợp lệ phải có ít nhất 1 phần tử ID (ví dụ: "/12" hoặc
            // "/12/inventory")
            if (segments.length < 2 || segments[1].isEmpty()) {
                writeNotFound(response);
                return;
            }

            int productId;
            try {
                productId = Integer.parseInt(segments[1]);
                if (productId <= 0) {
                    writeNotFound(response);
                    return;
                }
            } catch (NumberFormatException e) {
                writeNotFound(response);
                return;
            }

            boolean isInventoryUpdate = segments.length >= 3 && "inventory".equals(segments[2]);

            if (isInventoryUpdate) {
                // Nhánh 1: Cập nhật tồn kho
                UpdateInventoryRequest inventoryBody = JsonUtil.read(request, UpdateInventoryRequest.class);
                Object result = productService.updateInventory(productId, inventoryBody);
                JsonUtil.write(response, HttpServletResponse.SC_OK, result);
            } else if (segments.length == 2) {
                // Nhánh 2: Cập nhật thông tin sản phẩm
                UpdateProductRequest productBody = JsonUtil.read(request, UpdateProductRequest.class);
                Object result = productService.update(productId, productBody);
                JsonUtil.write(response, HttpServletResponse.SC_OK, result);
            } else {
                writeNotFound(response);
            }

        } catch (IOException exception) {
            writeError(response, HttpServletResponse.SC_BAD_REQUEST, "INVALID_JSON",
                    "Dữ liệu JSON request không hợp lệ.");
        } catch (AppException exception) {
            writeAppError(response, exception);
        } catch (Exception exception) {
            logError(request, "Cập nhật sản phẩm admin thất bại", exception);
            writeError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ.");
        }
    }

    /**
     * DELETE: Chặn xóa cứng để bảo vệ lịch sử hóa đơn và các đơn hàng cũ.
     */
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setHeader("Allow", "POST, PATCH");
        writeError(response, HttpServletResponse.SC_METHOD_NOT_ALLOWED,
                "HARD_DELETE_NOT_ALLOWED",
                "Không được xóa cứng sản phẩm. Hãy chuyển trạng thái sang HIDDEN để bảo toàn dữ liệu.");
    }

    // =========================================================================
    // HÀM TIỆN ÍCH XỬ LÝ URL VÀ PHẢN HỒI LỖI
    // =========================================================================

    private boolean isCollectionPath(String path) {
        return path == null || path.isEmpty() || "/".equals(path);
    }

    private String cleanPath(String path) {
        return path == null ? "" : path.trim();
    }

    private int parseSingleId(String path) {
        String trimmed = path.startsWith("/") ? path.substring(1) : path;
        if (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        if (trimmed.contains("/")) {
            return -1;
        }
        try {
            return Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private void writeAppError(HttpServletResponse response, AppException exception) throws IOException {
        writeError(response, exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    private void writeNotFound(HttpServletResponse response) throws IOException {
        writeError(response, HttpServletResponse.SC_NOT_FOUND, "ENDPOINT_NOT_FOUND", "Không tìm thấy endpoint.");
    }

    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        JsonUtil.write(response, status, Map.of("code", code, "message", message));
    }

    private void logError(HttpServletRequest request, String message, Throwable t) {
        if (getServletContext() != null) {
            getServletContext().log(message + " [" + request.getRequestURI() + "]", t);
        }
    }
}
