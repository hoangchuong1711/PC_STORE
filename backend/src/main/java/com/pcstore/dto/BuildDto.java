package com.pcstore.dto;

import com.pcstore.dto.CompatibilityDto.Report;
import com.pcstore.dto.CompatibilityDto.Selection;
import java.math.BigDecimal;
import java.util.List;

public final class BuildDto {
    private BuildDto() {}

    public record Request(String name, List<Selection> items) {}
    public record Item(int productId, String productName, int quantity,
                       BigDecimal unitPrice, BigDecimal lineTotal) {}
    public record Response(int buildId, String name, String sourceType, List<Item> items,
                           BigDecimal totalAmount, Report compatibility) {}
}
