package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(Integer cartId, List<CartItemResponse> items, BigDecimal totalAmount) { }