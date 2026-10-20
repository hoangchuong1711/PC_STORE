package com.pcstore.service;

import java.util.List;
import java.util.Map;

import com.pcstore.dao.ProductDao;
import com.pcstore.dto.PageResponse;
import com.pcstore.dto.ProductResponse;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.entity.Product;
import com.pcstore.entity.ProductImage;
import com.pcstore.exception.ResourceNotFoundException;

import jakarta.persistence.EntityManager;

public class ProductCatalogService {
    private final ProductDao products;
    public ProductCatalogService(EntityManager em) { this.products = new ProductDao(em); }


    //hàm search: tìm kiếm sản phẩm theo query parameters, trả về danh sách sản phẩm
    public PageResponse<ProductResponse> search(ProductSearchQuery query) {
        List<Product> rows = products.search(query);
        Map<Integer, Integer> quantities = products.availableQuantities(rows.stream().map(Product::getProductId).toList());
        List<ProductResponse> items = rows.stream().map(p -> toResponse(p, quantities.getOrDefault(p.getProductId(), 0))).toList();
        long total = products.count(query);
        return new PageResponse<>(items, query.page(), query.size(), total, (int) ((total + query.size() - 1) / query.size()));
    }

    //hàm find: tìm kiếm sản phẩm theo id, trả về sản phẩm có trạng thái ACTIVE và có số lượng tồn kho > 0
    public ProductResponse find(Integer id) {
        Product product = products.findPublic(id);
        if (product == null) throw new ResourceNotFoundException("Không tìm thấy sản phẩm");
        int available = products.availableQuantities(List.of(id)).getOrDefault(id, 0);
        return toResponse(product, available);
    }

    //hàm toResponse: chuyển đổi Product entity sang ProductResponse DTO
    private ProductResponse toResponse(Product p, int available) {
        var c = p.getCategory(); var b = p.getBrand();
        return new ProductResponse(p.getProductId(), p.getName(), p.getDescription(), p.getPrice(), p.getStatus().name(),
                new ProductResponse.CategoryResponse(c.getCategoryId(), c.getName(), c.getComponentType() == null ? null : c.getComponentType().name()),
                new ProductResponse.BrandResponse(b.getBrandId(), b.getName(), b.getLogoUrl()),
                p.getImages().stream().map(ProductImage::getImageUrl).toList(), available, available > 0);
    }
}
