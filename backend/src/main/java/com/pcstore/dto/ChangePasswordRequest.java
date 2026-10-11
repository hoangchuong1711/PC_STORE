package com.pcstore.dto;

public record ChangePasswordRequest(String oldPassword, String newPassword) {
}
