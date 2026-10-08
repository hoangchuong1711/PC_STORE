package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.Map;

public record AdminProductResponse(
        Integer productId,
        String name,
        String description,
        BigDecimal price,
        String status,
        Integer categoryId,
        String categoryName,
        Integer brandId,
        String brandName,
        int quantityOnHand,
        int reservedQuantity,
        int availableQuantity,
        Map<String, Object> spec
) {}
