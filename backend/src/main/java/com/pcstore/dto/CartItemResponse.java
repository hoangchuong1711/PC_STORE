package com.pcstore.dto;

import java.math.BigDecimal;

public record CartItemResponse(Integer cartItemId, Integer productId, String name,
        int quantity, BigDecimal unitPrice, BigDecimal lineTotal,
        int availableQuantity, boolean available) { }