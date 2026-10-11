package com.pcstore.dto;

public record AdminUserDto(
    int userId,
    String fullName,
    String email,
    String phone,
    String role,
    String status,
    long orderCount,
    long totalSpent
) {
}
