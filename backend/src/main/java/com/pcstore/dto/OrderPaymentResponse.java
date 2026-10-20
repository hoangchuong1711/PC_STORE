package com.pcstore.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderPaymentResponse(
        Integer paymentId,
        String method,
        String status,
        BigDecimal amount,
        LocalDateTime paidAt) {
}
