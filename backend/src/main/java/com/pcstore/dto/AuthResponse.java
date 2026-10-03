package com.pcstore.dto;

import com.pcstore.entity.User;
import com.pcstore.entity.UserRole;

public record AuthResponse(Integer userId, String fullName, String email, String phone, UserRole role) {
    public static AuthResponse from(User user) {
        return new AuthResponse(user.getUserId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getRole());
    }
}
