package com.pcstore.service;

import com.pcstore.dao.UserDAO;
import com.pcstore.exception.ValidationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class AdminUserServiceTest {
    @Test
    void invalidRoleOrStatusIsRejectedBeforeQuerying() {
        AdminUserService service = new AdminUserService(new UserDAO());
        assertThrows(ValidationException.class, () -> service.listUsers("UNKNOWN", null, null, 0, 10));
        assertThrows(ValidationException.class, () -> service.listUsers(null, "UNKNOWN", null, 0, 10));
    }
}
