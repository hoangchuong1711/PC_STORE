package com.pcstore.dto;

import java.time.LocalDateTime;

public record VNPayUrlResponse(
        Integer orderId,
        String paymentMethod,
        String referenceCode,
        String paymentUrl,
        LocalDateTime expiresAt) {
}
