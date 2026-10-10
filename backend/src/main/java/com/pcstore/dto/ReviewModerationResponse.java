package com.pcstore.dto;

import com.pcstore.entity.enums.ReviewStatus;
import java.time.LocalDateTime;

public record ReviewModerationResponse(int reviewId, ReviewStatus status,
        String moderationReason, Integer moderatedBy, LocalDateTime moderatedAt) { }
