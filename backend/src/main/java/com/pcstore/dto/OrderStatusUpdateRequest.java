package com.pcstore.dto;

import com.pcstore.entity.enums.OrderStatus;

public record OrderStatusUpdateRequest(OrderStatus status) {
}
