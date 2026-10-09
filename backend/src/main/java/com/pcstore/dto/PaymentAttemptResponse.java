package com.pcstore.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAttemptResponse(
        Integer attemptId,
        String referenceCode,
        BigDecimal amount,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        String status,
        String vnpTransactionNo,
        String vnpBankCode,
        LocalDateTime lastReconciledAt,
        boolean requiresAdminReview) {
}
