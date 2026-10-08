package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.Map;

import com.pcstore.entity.enums.ProductStatus;

/** Các trường null được hiểu là không thay đổi trong request PATCH. */
public record UpdateProductRequest(
        String name,
        String description,
        BigDecimal price,
        Integer categoryId,
        Integer brandId,
        ProductStatus status,
        Map<String, Object> spec
) {
    public UpdateProductRequest(String name, String description, BigDecimal price, Integer categoryId,
                                Integer brandId, ProductStatus status) {
        this(name, description, price, categoryId, brandId, status, null);
    }
}
