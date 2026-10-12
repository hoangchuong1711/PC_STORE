package com.pcstore.dto;
public record ResetPasswordRequest(String email, String resetToken, String newPassword) { }
