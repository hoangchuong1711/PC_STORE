package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.Map;

import com.pcstore.entity.enums.ProductStatus;

/** Dữ liệu Admin gửi khi tạo một sản phẩm và tồn kho ban đầu. */
public record CreateProductRequest(
        String name,
        String description,
        BigDecimal price,
        Integer categoryId,
        Integer brandId,
        ProductStatus status,
        Integer quantityOnHand,
        Map<String, Object> spec
) {
    public CreateProductRequest(String name, String description, BigDecimal price, Integer categoryId,
                                Integer brandId, ProductStatus status, Integer quantityOnHand) {
        this(name, description, price, categoryId, brandId, status, quantityOnHand, null);
    }
}
