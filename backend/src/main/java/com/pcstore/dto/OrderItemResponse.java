package com.pcstore.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        Integer orderItemId,
        Integer productId,
        String productName,
        int quantity,
        BigDecimal baseUnitPrice,
        BigDecimal unitPrice,
        BigDecimal lineTotal) {
}
