package com.pcstore.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.AdminTaxonomyDao;
import com.pcstore.dto.AdminTaxonomyDto.BrandInput;
import com.pcstore.dto.AdminTaxonomyDto.CategoryInput;
import com.pcstore.dto.AdminTaxonomyDto.Entry;
import com.pcstore.dto.AdminTaxonomyDto.StatusInput;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.enums.ActiveStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ValidationException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

/**
 * AdminTaxonomyService: Lớp xử lý nghiệp vụ quản lý Danh mục (Category) và Thương hiệu (Brand).
 * Tuân thủ mô hình MVC: Quản lý Transaction trực tiếp bằng khối try-catch-finally,
 * kiểm tra các ràng buộc toàn vẹn dữ liệu trước khi lưu vào CSDL.
 */
public class AdminTaxonomyService {

    /**
     * Lấy danh sách toàn bộ danh mục hoặc thương hiệu kèm theo số lượng sản phẩm liên kết.
     * @param isCategory true nếu lấy Danh mục, false nếu lấy Thương hiệu
     */
    public List<Entry> list(boolean isCategory) {
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            AdminTaxonomyDao dao = new AdminTaxonomyDao(em);
            Map<Integer, Long> productCounts = dao.counts(isCategory);

            List<Entry> resultList = new ArrayList<>();
            if (isCategory) {
                List<Category> categories = dao.categories();
                for (Category category : categories) {
                    long count = productCounts.getOrDefault(category.getCategoryId(), 0L);
                    resultList.add(toCategoryEntry(category, count));
                }
            } else {
                List<Brand> brands = dao.brands();
                for (Brand brand : brands) {
                    long count = productCounts.getOrDefault(brand.getBrandId(), 0L);
                    resultList.add(toBrandEntry(brand, count));
                }
            }
            return resultList;
        }
    }

    /**
     * Thêm mới hoặc Cập nhật một Danh mục sản phẩm.
     * Ràng buộc nghiệp vụ: Nếu danh mục đã có sản phẩm (count > 0), KHÔNG được phép đổi ComponentType
     * để tránh làm sai lệch thông số kỹ thuật (Specs) của các sản phẩm đang có.
     */
    public Entry saveCategory(Integer categoryId, CategoryInput input) {
        if (input == null) {
            throw createInvalidException("Dữ liệu danh mục không được để trống.");
        }
        String validName = validateName(input.name());
        validateStatus(input.status());

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminTaxonomyDao dao = new AdminTaxonomyDao(em);

                Category category;
                long productCount = 0;

                if (categoryId == null) {
                    // Thao tác THÊM MỚI danh mục
                    category = new Category();
                } else {
                    // Thao tác CẬP NHẬT danh mục đã tồn tại
                    category = dao.category(categoryId);
                    if (category == null) {
                        throw new AppException(404, "RESOURCE_NOT_FOUND", "Không tìm thấy danh mục có ID: " + categoryId);
                    }
                    productCount = dao.counts(true).getOrDefault(categoryId, 0L);

                    // Kiểm tra ràng buộc cấm đổi loại linh kiện khi đã có hàng
                    if (productCount > 0 && !Objects.equals(category.getComponentType(), input.componentType())) {
                        throw new AppException(409, "CATEGORY_IN_USE", "Không thể đổi loại linh kiện của danh mục đã có sản phẩm.");
                    }
                }

                category.setName(validName);
                category.setDescription(cleanString(input.description()));
                category.setComponentType(input.componentType());
                category.setStatus(input.status());

                if (categoryId == null) {
                    dao.persist(category);
                }

                tx.commit();
                return toCategoryEntry(category, productCount);

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    /**
     * Thêm mới hoặc Cập nhật một Thương hiệu (Brand).
     */
    public Entry saveBrand(Integer brandId, BrandInput input) {
        if (input == null) {
            throw createInvalidException("Dữ liệu thương hiệu không được để trống.");
        }
        String validName = validateName(input.name());
        validateStatus(input.status());
        String logoUrl = validateLogoUrl(input.logoUrl());

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminTaxonomyDao dao = new AdminTaxonomyDao(em);

                Brand brand;
                long productCount = 0;

                if (brandId == null) {
                    // Thao tác THÊM MỚI thương hiệu
                    brand = new Brand(validName);
                } else {
                    // Thao tác CẬP NHẬT thương hiệu đã tồn tại
                    brand = dao.brand(brandId);
                    if (brand == null) {
                        throw new AppException(404, "RESOURCE_NOT_FOUND", "Không tìm thấy thương hiệu có ID: " + brandId);
                    }
                    productCount = dao.counts(false).getOrDefault(brandId, 0L);
                }

                brand.setName(validName);
                brand.setDescription(cleanString(input.description()));
                brand.setLogoUrl(logoUrl);
                brand.setStatus(input.status());

                if (brandId == null) {
                    dao.persist(brand);
                }

                tx.commit();
                return toBrandEntry(brand, productCount);

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    /**
     * Cập nhật trạng thái hiển thị (ACTIVE / HIDDEN) của Danh mục hoặc Thương hiệu.
     */
    public Entry updateStatus(boolean isCategory, int id, StatusInput input) {
        if (input == null) {
            throw createInvalidException("Trạng thái không được để trống.");
        }
        validateStatus(input.status());

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminTaxonomyDao dao = new AdminTaxonomyDao(em);
                long productCount = dao.counts(isCategory).getOrDefault(id, 0L);

                Entry resultEntry;
                if (isCategory) {
                    Category category = dao.category(id);
                    if (category == null) {
                        throw new AppException(404, "RESOURCE_NOT_FOUND", "Không tìm thấy danh mục có ID: " + id);
                    }
                    category.setStatus(input.status());
                    resultEntry = toCategoryEntry(category, productCount);
                } else {
                    Brand brand = dao.brand(id);
                    if (brand == null) {
                        throw new AppException(404, "RESOURCE_NOT_FOUND", "Không tìm thấy thương hiệu có ID: " + id);
                    }
                    brand.setStatus(input.status());
                    resultEntry = toBrandEntry(brand, productCount);
                }

                tx.commit();
                return resultEntry;

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    // =========================================================================
    // CÁC HÀM TIỆN ÍCH KIỂM TRA DỮ LIỆU & CHUYỂN ĐỔI DTO
    // =========================================================================

    private static Entry toCategoryEntry(Category category, long count) {
        return new Entry(
                category.getCategoryId(),
                category.getName(),
                category.getDescription(),
                category.getStatus(),
                category.getComponentType(),
                null,
                count
        );
    }

    private static Entry toBrandEntry(Brand brand, long count) {
        return new Entry(
                brand.getBrandId(),
                brand.getName(),
                brand.getDescription(),
                brand.getStatus(),
                null,
                brand.getLogoUrl(),
                count
        );
    }

    private static String validateName(String name) {
        String cleaned = cleanString(name);
        if (cleaned == null || cleaned.isEmpty() || cleaned.length() > 255) {
            throw createInvalidException("Tên không được để trống và không vượt quá 255 ký tự.");
        }
        return cleaned;
    }

    private static void validateStatus(ActiveStatus status) {
        if (status == null) {
            throw createInvalidException("Trạng thái (status) là bắt buộc.");
        }
    }

    private static String validateLogoUrl(String url) {
        String cleaned = cleanString(url);
        if (cleaned == null) {
            return null;
        }
        try {
            URI uri = URI.create(cleaned);
            if (cleaned.length() > 2048 || uri.getHost() == null || uri.getUserInfo() != null
                    || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) {
                throw createInvalidException("URL logo phải là đường dẫn HTTP hoặc HTTPS hợp lệ.");
            }
        } catch (IllegalArgumentException e) {
            throw createInvalidException("Định dạng URL logo không hợp lệ.");
        }
        return cleaned;
    }

    private static String cleanString(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private static ValidationException createInvalidException(String message) {
        return new ValidationException(message != null ? message : "Tên/trạng thái không hợp lệ hoặc URL logo không đúng.");
    }
}
