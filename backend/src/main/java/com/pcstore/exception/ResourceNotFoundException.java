package com.pcstore.exception;
public class ResourceNotFoundException extends AppException {
    public ResourceNotFoundException(String message) { super(404, "RESOURCE_NOT_FOUND", message); }
}
