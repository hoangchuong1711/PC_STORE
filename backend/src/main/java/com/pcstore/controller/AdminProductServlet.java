package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

@WebServlet(name = "adminProductServlet", urlPatterns = "/api/admin/products/*")
public class AdminProductServlet extends HttpServlet {
    private static final Pattern PRODUCT_PATH = Pattern.compile("^/(\\d+)/?$");
    private static final Pattern INVENTORY_PATH = Pattern.compile("^/(\\d+)/inventory/?$");

    private AdminProductService products;

    @Override
    public void init() {
        products = new AdminProductService();
    }

    /** Servlet 6.0 chưa dispatch PATCH nên route method này trước khi gọi HttpServlet.service. */
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        if ("PATCH".equalsIgnoreCase(request.getMethod())) {
            handlePatch(request, response);
            return;
        }
        super.service(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            if (!isCollectionPath(request.getPathInfo())) {
                writeNotFound(response);
                return;
            }

            CreateProductRequest body = readBody(request, CreateProductRequest.class);
            JsonUtil.write(response, HttpServletResponse.SC_CREATED, products.create(body));
        } catch (InvalidJsonException exception) {
            writeError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "INVALID_JSON", "JSON request không hợp lệ.");
        } catch (AppException exception) {
            writeAppError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Create admin product failed", exception);
            writeError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR", "Lỗi máy chủ.");
        }
    }

    private void handlePatch(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String path = request.getPathInfo() == null ? "" : request.getPathInfo().trim();

        try {
            Matcher inventoryMatcher = INVENTORY_PATH.matcher(path);
            if (inventoryMatcher.matches()) {
                int productId = parseProductId(inventoryMatcher.group(1));
                UpdateInventoryRequest body = readBody(request, UpdateInventoryRequest.class);
                JsonUtil.write(response, HttpServletResponse.SC_OK,
                        products.updateInventory(productId, body));
                return;
            }

            Matcher productMatcher = PRODUCT_PATH.matcher(path);
            if (productMatcher.matches()) {
                int productId = parseProductId(productMatcher.group(1));
                UpdateProductRequest body = readBody(request, UpdateProductRequest.class);
                JsonUtil.write(response, HttpServletResponse.SC_OK,
                        products.update(productId, body));
                return;
            }

            writeNotFound(response);
        } catch (InvalidJsonException exception) {
            writeError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "INVALID_JSON", "JSON request không hợp lệ.");
        } catch (AppException exception) {
            writeAppError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Update admin product failed", exception);
            writeError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR", "Lỗi máy chủ.");
        }
    }

    /** T12 dùng ẩn sản phẩm thay cho xóa cứng để giữ nguyên lịch sử đơn. */
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setHeader("Allow", "POST, PATCH");
        writeError(response, HttpServletResponse.SC_METHOD_NOT_ALLOWED,
                "HARD_DELETE_NOT_ALLOWED",
                "Không được xóa cứng sản phẩm. Hãy chuyển trạng thái sang HIDDEN.");
    }

    private boolean isCollectionPath(String path) {
        return path == null || path.isBlank() || "/".equals(path);
    }

    private int parseProductId(String value) {
        try {
            int productId = Integer.parseInt(value);
            if (productId <= 0) throw new ValidationException("Product id không hợp lệ.");
            return productId;
        } catch (NumberFormatException exception) {
            throw new ValidationException("Product id không hợp lệ.");
        }
    }

    private <T> T readBody(HttpServletRequest request, Class<T> type) {
        try {
            return JsonUtil.read(request, type);
        } catch (IOException exception) {
            throw new InvalidJsonException(exception);
        }
    }

    private void writeAppError(HttpServletResponse response, AppException exception) throws IOException {
        writeError(response, exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    private void writeNotFound(HttpServletResponse response) throws IOException {
        writeError(response, HttpServletResponse.SC_NOT_FOUND,
                "ENDPOINT_NOT_FOUND", "Không tìm thấy endpoint.");
    }

    private void writeError(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        JsonUtil.write(response, status, Map.of("code", code, "message", message));
    }

    private static final class InvalidJsonException extends RuntimeException {
        private InvalidJsonException(Throwable cause) {
            super(cause);
        }
    }
}
