package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.PageResponse;
import com.pcstore.dto.ProductResponse;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.service.ProductCatalogService;
import com.pcstore.util.JsonUtil;

import jakarta.persistence.EntityManager;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ProductServlet: Controller tiếp nhận các yêu cầu tra cứu và lọc sản phẩm công khai từ khách hàng.
 * URL Mapping: /api/products/*
 * Tuân thủ mô hình MVC:
 * - Nhận HTTP GET Request từ Client (Trình duyệt / Frontend Next.js).
 * - Đọc và kiểm tra các tham số (query parameters hoặc path info).
 * - Điều hướng gọi tầng nghiệp vụ (ProductCatalogService).
 * - Định dạng và trả về kết quả JSON với HTTP status code phù hợp.
 */
@WebServlet(name = "productServlet", urlPatterns = "/api/products/*")
public class ProductServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {

        // Khởi tạo EntityManager từ factory dùng chung của ứng dụng
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            ProductCatalogService service = new ProductCatalogService(em);
            String pathInfo = req.getPathInfo();

            // ---------------------------------------------------------------------------------
            // TRƯỜNG HỢP 1: Xem chi tiết một sản phẩm theo ID (Ví dụ: GET /api/products/123)
            // ---------------------------------------------------------------------------------
            if (pathInfo != null && pathInfo.length() > 1) {
                int productId;
                try {
                    // Cắt bỏ dấu gạch chéo đầu tiên để lấy số ID sản phẩm
                    productId = Integer.parseInt(pathInfo.substring(1));
                    if (productId <= 0) {
                        sendError(res, HttpServletResponse.SC_BAD_REQUEST, "INVALID_ID", "ID sản phẩm phải là số nguyên dương.");
                        return;
                    }
                } catch (NumberFormatException e) {
                    sendError(res, HttpServletResponse.SC_BAD_REQUEST, "INVALID_ID", "ID sản phẩm không đúng định dạng số.");
                    return;
                }

                // Gọi Service tìm kiếm thông tin chi tiết sản phẩm
                ProductResponse productDetail = service.find(productId);
                JsonUtil.write(res, HttpServletResponse.SC_OK, productDetail);
                return;
            }

            // ---------------------------------------------------------------------------------
            // TRƯỜNG HỢP 2: Tìm kiếm và lọc danh sách sản phẩm (Ví dụ: GET /api/products?q=intel&page=0)
            // ---------------------------------------------------------------------------------
            String keywordParam    = req.getParameter("q");
            String categoryIdParam = req.getParameter("categoryId");
            String brandIdParam    = req.getParameter("brandId");
            String minPriceParam   = req.getParameter("minPrice");
            String maxPriceParam   = req.getParameter("maxPrice");
            String pageParam       = req.getParameter("page");
            String sizeParam       = req.getParameter("size");
            String sortParam       = req.getParameter("sort");

            // Chuyển đổi và kiểm tra tính hợp lệ của các tham số tìm kiếm
            ProductSearchQuery searchQuery = ProductSearchQuery.parse(
                    keywordParam,
                    categoryIdParam,
                    brandIdParam,
                    minPriceParam,
                    maxPriceParam,
                    pageParam,
                    sizeParam,
                    sortParam
            );

            // Gọi Service thực hiện tìm kiếm và phân trang
            PageResponse<ProductResponse> pageResult = service.search(searchQuery);

            // Phản hồi kết quả tìm kiếm về cho Client với mã 200 OK
            JsonUtil.write(res, HttpServletResponse.SC_OK, pageResult);

        } catch (ResourceNotFoundException e) {
            // Trường hợp không tìm thấy sản phẩm trong CSDL
            sendError(res, HttpServletResponse.SC_NOT_FOUND, "PRODUCT_NOT_FOUND", e.getMessage());
        } catch (IllegalArgumentException e) {
            // Trường hợp tham số truy vấn không hợp lệ (ví dụ: khoảng giá min > max, page âm...)
            sendError(res, HttpServletResponse.SC_BAD_REQUEST, "INVALID_QUERY", e.getMessage());
        } catch (Exception e) {
            // Lỗi hệ thống phát sinh ngoài dự kiến
            getServletContext().log("Catalog request failed: " + req.getRequestURI(), e);
            sendError(res, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Đã xảy ra lỗi máy chủ khi xử lý danh mục sản phẩm.");
        }
    }

    /**
     * Hàm phụ trợ trả về thông báo lỗi chuẩn hóa định dạng JSON cho Client.
     */
    private void sendError(HttpServletResponse res, int statusCode, String errorCode, String errorMessage)
            throws IOException {
        Map<String, String> errorResponse = Map.of(
                "code", errorCode,
                "message", errorMessage != null ? errorMessage : "Yêu cầu không hợp lệ."
        );
        JsonUtil.write(res, statusCode, errorResponse);
    }
}
