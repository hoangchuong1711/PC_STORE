package com.pcstore.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Integer orderId,
        LocalDateTime orderDate,
        String status,
        BigDecimal totalAmount,
        String shippingName,
        String shippingPhone,
        String shippingAddressText,
        LocalDateTime deliveredAt,
        List<OrderItemResponse> items,
        OrderPaymentResponse payment) {
}
