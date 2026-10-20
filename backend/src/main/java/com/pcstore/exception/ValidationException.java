package com.pcstore.exception;

public class ValidationException extends AppException {
    public ValidationException(String message) { super(400, "VALIDATION_ERROR", message); }
}
