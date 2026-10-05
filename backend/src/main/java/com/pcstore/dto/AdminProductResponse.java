package com.pcstore.dto;

import java.math.BigDecimal;

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
        int availableQuantity
) {}
