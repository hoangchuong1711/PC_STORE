package com.pcstore.dto;

/** Admin chỉ được đổi tồn thực tế, không được ghi trực tiếp lượng giữ chỗ. */
public record UpdateInventoryRequest(
        Integer quantityOnHand
) {}
