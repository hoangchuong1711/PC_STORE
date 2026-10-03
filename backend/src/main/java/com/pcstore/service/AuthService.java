package com.pcstore.service;

import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse findById(int userId);
}
