package com.pcstore.service;

import java.util.List;
import java.util.stream.Collectors;

import com.pcstore.dao.UserDAO;
import com.pcstore.dao.impl.UserDAOImpl;
import com.pcstore.dto.AdminUserDto;
import com.pcstore.dto.UpdateUserStatusRequest;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.ValidationException;
import com.pcstore.util.PersistenceManager;

import jakarta.persistence.EntityManager;

public class AdminUserService {
    private final UserDAO userDAO;

    public AdminUserService() {
        this(new UserDAOImpl());
    }

    public AdminUserService(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    public List<AdminUserDto> listUsers(String role, String status, String query, int offset, int limit) {
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            List<User> users = userDAO.listUsers(em, role, status, query, offset, limit);
            return users.stream().map(u -> toDto(em, u)).collect(Collectors.toList());
        }
    }

    public AdminUserDto updateUserStatus(int adminUserId, int targetUserId, UpdateUserStatusRequest req) {
        if (adminUserId == targetUserId) {
            throw new ValidationException("Không thể tự thay đổi trạng thái của chính mình.");
        }
        if (req == null || req.status() == null || req.status().isBlank()) {
            throw new ValidationException("Trạng thái người dùng không hợp lệ.");
        }

        String rawStatus = req.status().trim().toUpperCase();
        UserStatus targetStatus;
        if ("BANNED".equals(rawStatus) || "INACTIVE".equals(rawStatus)) {
            targetStatus = UserStatus.INACTIVE;
        } else if ("ACTIVE".equals(rawStatus)) {
            targetStatus = UserStatus.ACTIVE;
        } else {
            throw new ValidationException("Trạng thái người dùng không hợp lệ. Chỉ chấp nhận ACTIVE, INACTIVE hoặc BANNED.");
        }

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = userDAO.findById(em, targetUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));
                user.setStatus(targetStatus);
                em.getTransaction().commit();
                return toDto(em, user);
            } catch (RuntimeException e) {
                if (em.getTransaction().isActive()) {
                    em.getTransaction().rollback();
                }
                throw e;
            }
        }
    }

    private AdminUserDto toDto(EntityManager em, User user) {
        Object[] stats = userDAO.getUserOrderStats(em, user.getUserId());
        long orderCount = stats != null && stats[0] != null ? ((Number) stats[0]).longValue() : 0L;
        long totalSpent = stats != null && stats[1] != null ? ((Number) stats[1]).longValue() : 0L;
        return new AdminUserDto(
                user.getUserId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone() != null ? user.getPhone() : "",
                user.getRole().name(),
                user.getStatus().name(),
                orderCount,
                totalSpent
        );
    }
}
