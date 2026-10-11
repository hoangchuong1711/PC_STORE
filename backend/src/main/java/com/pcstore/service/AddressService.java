package com.pcstore.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.dao.AddressDao;
import com.pcstore.dto.AddressDto;
import com.pcstore.entity.Address;
import com.pcstore.entity.User;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AddressService {
    private final EntityManager em;
    private final AddressDao dao;
    private final ObjectMapper mapper = new ObjectMapper();

    public AddressService(EntityManager em) {
        this.em = em;
        this.dao = new AddressDao(em);
    }

    public List<AddressDto.Response> list(int userId) {
        return dao.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    public AddressDto.Response get(int userId, int addressId) {
        Address address = dao.findByIdAndUserId(addressId, userId);
        if (address == null) {
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy địa chỉ.");
        }
        return toResponse(address);
    }

    public AddressDto.Response create(int userId, AddressDto.Request body) {
        validateRequest(body);
        em.getTransaction().begin();
        try {
            dao.lockUser(userId);
            User user = em.find(User.class, userId);
            if (user == null) {
                throw new AppException(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
            }

            long currentCount = dao.countByUserId(userId);
            boolean makeDefault = Boolean.TRUE.equals(body.isDefault()) || currentCount == 0;
            if (makeDefault) {
                dao.unsetDefault(userId);
            }

            Address address = new Address();
            address.setUser(user);
            address.setAddressDetail(buildDetail(body));
            address.setDefault(makeDefault);

            dao.persist(address);
            dao.flush();
            em.getTransaction().commit();
            return toResponse(address);
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) em.getTransaction().rollback();
            throw e;
        }
    }

    public AddressDto.Response update(int userId, int addressId, AddressDto.Request body) {
        validateRequest(body);
        em.getTransaction().begin();
        try {
            dao.lockUser(userId);
            Address address = dao.findByIdAndUserId(addressId, userId);
            if (address == null) {
                throw new AppException(404, "NOT_FOUND", "Không tìm thấy địa chỉ.");
            }

            if (Boolean.TRUE.equals(body.isDefault()) && !address.isDefault()) {
                dao.unsetDefault(userId);
                address.setDefault(true);
            }

            address.setAddressDetail(buildDetail(body));
            dao.flush();
            em.getTransaction().commit();
            return toResponse(address);
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) em.getTransaction().rollback();
            throw e;
        }
    }

    public AddressDto.Response setDefault(int userId, int addressId) {
        em.getTransaction().begin();
        try {
            dao.lockUser(userId);
            Address address = dao.findByIdAndUserId(addressId, userId);
            if (address == null) {
                throw new AppException(404, "NOT_FOUND", "Không tìm thấy địa chỉ.");
            }

            dao.unsetDefault(userId);
            address.setDefault(true);
            dao.flush();
            em.getTransaction().commit();
            return toResponse(address);
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) em.getTransaction().rollback();
            throw e;
        }
    }

    public void delete(int userId, int addressId) {
        em.getTransaction().begin();
        try {
            dao.lockUser(userId);
            Address address = dao.findByIdAndUserId(addressId, userId);
            if (address == null) {
                throw new AppException(404, "NOT_FOUND", "Không tìm thấy địa chỉ.");
            }

            boolean wasDefault = address.isDefault();
            dao.remove(address);
            dao.flush();

            if (wasDefault) {
                List<Address> remaining = dao.findByUserId(userId);
                if (!remaining.isEmpty()) {
                    remaining.getFirst().setDefault(true);
                    dao.flush();
                }
            }
            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) em.getTransaction().rollback();
            throw e;
        }
    }

    private void validateRequest(AddressDto.Request body) {
        if (body == null) {
            throw new AppException(400, "INVALID_ADDRESS", "Dữ liệu địa chỉ không hợp lệ.");
        }
        String detail = body.address() != null && !body.address().isBlank()
                ? body.address().trim()
                : (body.addressDetail() != null ? body.addressDetail().trim() : "");
        if (detail.isEmpty()) {
            throw new AppException(400, "INVALID_ADDRESS", "Địa chỉ chi tiết không được để trống.");
        }
        if (body.recipientName() != null && !body.recipientName().isBlank() && body.recipientName().trim().length() < 2) {
            throw new AppException(400, "INVALID_NAME", "Họ và tên người nhận phải có ít nhất 2 ký tự.");
        }
        if (body.phone() != null && !body.phone().isBlank()) {
            String cleanPhone = body.phone().trim().replaceAll("[\\s.-]", "");
            if (!cleanPhone.matches("^(0|\\+84)[35789]\\d{8}$")) {
                throw new AppException(400, "INVALID_PHONE", "Số điện thoại không đúng định dạng Việt Nam (Ví dụ: 0901234567 hoặc +84901234567).");
            }
        }
    }

    private String buildDetail(AddressDto.Request body) {
        String detailText = body.address() != null && !body.address().isBlank()
                ? body.address().trim()
                : (body.addressDetail() != null ? body.addressDetail().trim() : "");

        Map<String, String> map = new HashMap<>();
        map.put("address", detailText);
        if (body.recipientName() != null && !body.recipientName().isBlank()) {
            map.put("recipientName", body.recipientName().trim());
        }
        if (body.phone() != null && !body.phone().isBlank()) {
            String cleanPhone = body.phone().trim().replaceAll("[\\s.-]", "");
            map.put("phone", cleanPhone);
        }
        if (body.label() != null && !body.label().isBlank()) {
            map.put("label", body.label().trim());
        }

        try {
            return mapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return detailText;
        }
    }

    private AddressDto.Response toResponse(Address address) {
        String raw = address.getAddressDetail();
        String recipientName = null;
        String phone = null;
        String label = null;
        String addressText = raw;

        if (raw != null && raw.startsWith("{") && raw.endsWith("}")) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(raw, Map.class);
                if (map.containsKey("address")) addressText = String.valueOf(map.get("address"));
                if (map.containsKey("recipientName")) recipientName = String.valueOf(map.get("recipientName"));
                if (map.containsKey("phone")) phone = String.valueOf(map.get("phone"));
                if (map.containsKey("label")) label = String.valueOf(map.get("label"));
            } catch (IOException ignored) {}
        }

        return new AddressDto.Response(
                address.getAddressId(),
                addressText,
                recipientName,
                phone,
                label,
                addressText,
                address.isDefault()
        );
    }
}
