package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(Integer productId, String name, String description, BigDecimal price,
                              String status, CategoryResponse category, BrandResponse brand,
                              List<String> imageUrls, int availableQuantity, boolean inStock) {
    public record CategoryResponse(Integer categoryId, String name, String componentType) {}
    public record BrandResponse(Integer brandId, String name, String logoUrl) {}
}
