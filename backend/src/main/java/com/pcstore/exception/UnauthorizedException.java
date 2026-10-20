package com.pcstore.exception;

public class UnauthorizedException extends AppException {
    public UnauthorizedException(String message) { super(401, "UNAUTHORIZED", message); }
}
