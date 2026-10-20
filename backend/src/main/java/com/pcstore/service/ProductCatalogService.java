package com.pcstore.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.pcstore.dao.ProductDao;
import com.pcstore.dto.PageResponse;
import com.pcstore.dto.ProductResponse;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.Product;
import com.pcstore.entity.ProductImage;
import com.pcstore.exception.ResourceNotFoundException;

import jakarta.persistence.EntityManager;

/**
 * ProductCatalogService: Lớp nghiệp vụ quản lý danh mục và tìm kiếm sản phẩm phía khách hàng.
 * Đóng vai trò cầu nối giữa Controller (ProductServlet) và tầng dữ liệu (ProductDao).
 */
public class ProductCatalogService {
    private final ProductDao productDao;

    public ProductCatalogService(EntityManager em) {
        this.productDao = new ProductDao(em);
    }

    /**
     * Tìm kiếm và lọc sản phẩm có phân trang theo tiêu chí của khách hàng.
     * Quy trình giải quyết bài toán:
     * 1. Lấy danh sách sản phẩm trang hiện tại từ DAO.
     * 2. Lấy số lượng tồn kho khả dụng tương ứng cho từng sản phẩm.
     * 3. Chuyển đổi Product Entity sang ProductResponse DTO.
     * 4. Đếm tổng số bản ghi và tính tổng số trang.
     * 5. Đóng gói vào PageResponse trả về cho giao diện.
     */
    public PageResponse<ProductResponse> search(ProductSearchQuery query) {
        // Bước 1: Lấy danh sách Entity sản phẩm của trang hiện tại
        List<Product> products = productDao.search(query);

        // Bước 2: Lấy danh sách ProductId để tra cứu số lượng tồn kho khả dụng
        List<Integer> productIds = new ArrayList<>();
        for (Product product : products) {
            productIds.add(product.getProductId());
        }
        Map<Integer, Integer> availableQuantities = productDao.availableQuantities(productIds);

        // Bước 3: Chuyển đổi từng Entity Product sang DTO ProductResponse
        List<ProductResponse> responseItems = new ArrayList<>();
        for (Product product : products) {
            int availableStock = availableQuantities.getOrDefault(product.getProductId(), 0);
            ProductResponse itemDto = mapToProductResponse(product, availableStock);
            responseItems.add(itemDto);
        }

        // Bước 4: Đếm tổng số kết quả phù hợp để tính toán phân trang
        long totalElements = productDao.count(query);
        int pageSize = query.size();
        int totalPages = (int) Math.ceil((double) totalElements / pageSize);

        // Bước 5: Trả về đối tượng phân trang hoàn chỉnh
        return new PageResponse<>(
                responseItems,
                query.page(),
                pageSize,
                totalElements,
                totalPages
        );
    }

    /**
     * Tìm chi tiết một sản phẩm công khai theo ID để hiển thị trang chi tiết sản phẩm.
     * @param productId ID sản phẩm cần tìm
     * @return ProductResponse chứa thông tin chi tiết và tồn kho
     * @throws ResourceNotFoundException nếu sản phẩm không tồn tại hoặc không được phép bán
     */
    public ProductResponse find(Integer productId) {
        Product product = productDao.findPublic(productId);
        if (product == null) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.");
        }

        // Kiểm tra số lượng tồn kho thực tế của sản phẩm này
        Map<Integer, Integer> quantities = productDao.availableQuantities(List.of(productId));
        int availableStock = quantities.getOrDefault(productId, 0);

        return mapToProductResponse(product, availableStock);
    }

    /**
     * Hàm phụ trợ chuyển đổi Product Entity sang ProductResponse DTO tường minh.
     */
    private ProductResponse mapToProductResponse(Product product, int availableQuantity) {
        Category category = product.getCategory();
        Brand brand = product.getBrand();

        // Lấy danh sách đường dẫn ảnh của sản phẩm
        List<String> imageUrls = new ArrayList<>();
        if (product.getImages() != null) {
            for (ProductImage image : product.getImages()) {
                imageUrls.add(image.getImageUrl());
            }
        }

        // Đóng gói thông tin Danh mục
        String componentTypeName = category.getComponentType() != null 
                ? category.getComponentType().name() 
                : null;
        ProductResponse.CategoryResponse categoryDto = new ProductResponse.CategoryResponse(
                category.getCategoryId(),
                category.getName(),
                componentTypeName
        );

        // Đóng gói thông tin Hãng sản xuất
        ProductResponse.BrandResponse brandDto = new ProductResponse.BrandResponse(
                brand.getBrandId(),
                brand.getName(),
                brand.getLogoUrl()
        );

        // Xác định cờ còn hàng để khách mua (available > 0)
        boolean isAvailable = availableQuantity > 0;

        return new ProductResponse(
                product.getProductId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getStatus().name(),
                categoryDto,
                brandDto,
                imageUrls,
                availableQuantity,
                isAvailable
        );
    }
}
