package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class BuilderCatalogDto {
    private BuilderCatalogDto() {}

    public record Product(int productId, String name, String brand, String componentType,
                          BigDecimal price, int availableQuantity, String imageUrl,
                          Map<String, Object> spec) {}
    public record PreviewRequest(List<CompatibilityDto.Selection> items) {}
}
