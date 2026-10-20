package com.pcstore.service;

import com.pcstore.dao.UserDAO;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.dto.ChangePasswordRequest;
import com.pcstore.entity.User;
import com.pcstore.exception.ValidationException;
import com.pcstore.util.PasswordUtil;
import org.junit.jupiter.api.Test;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthServiceFactoryTest {
    @Test
    void registrationAndProfileChangeUseTheSamePasswordLength() {
        AuthService service = new AuthService(new UserDAO());
        assertThrows(ValidationException.class, () -> service.register(
                new RegisterRequest("An", "an@example.test", "1234567", null)));
        assertThrows(ValidationException.class, () -> service.register(
                new RegisterRequest("An", "an@example.test", "x".repeat(129), null)));
        assertThrows(ValidationException.class, () -> service.changePassword(1,
                new ChangePasswordRequest("old-password", "1234567")));
        assertThrows(ValidationException.class, () -> service.changePassword(1,
                new ChangePasswordRequest("old-password", "x".repeat(129))));
    }

    @Test
    void loginUsesTheSuppliedPersistenceFactory() {
        User user = new User();
        user.setEmail("an@example.test");
        user.setFullName("An");
        user.setPasswordHash(PasswordUtil.hash("password123"));
        user.setAuthVersion(7);

        UserDAO dao = new UserDAO() {
            @Override public Optional<User> findByEmail(String email) {
                return "an@example.test".equals(email) ? Optional.of(user) : Optional.empty();
            }
        };

        AuthService service = new AuthService(dao);
        AuthService.LoginResult login = service.login(new LoginRequest(" AN@example.test ", "password123"));
        assertEquals("an@example.test", login.user().email());
        assertEquals(7, login.authVersion());
    }
}
