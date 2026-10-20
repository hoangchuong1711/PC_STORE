package com.pcstore.service;

public interface EmailSender {
    boolean enabled();
    void welcome(String email, String name);
    void otp(String email, String code);
    void passwordChanged(String email);
}
