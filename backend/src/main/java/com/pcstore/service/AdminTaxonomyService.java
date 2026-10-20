package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.AdminTaxonomyDao;
import com.pcstore.dto.AdminTaxonomyDto.*;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.enums.ActiveStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ValidationException;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

public class AdminTaxonomyService {
    public List<Entry> list(boolean categories) {
        try (var em = PersistenceManager.get().createEntityManager()) {
            var dao = new AdminTaxonomyDao(em);
            var counts = dao.counts(categories);
            return categories
                ? dao.categories().stream().map(c -> entry(c, counts.getOrDefault(c.getCategoryId(), 0L))).toList()
                : dao.brands().stream().map(b -> entry(b, counts.getOrDefault(b.getBrandId(), 0L))).toList();
        }
    }

    public Entry saveCategory(Integer id, CategoryInput input) {
        if (input == null) throw invalid();
        String name = name(input.name());
        requireStatus(input.status());
        return transaction(dao -> {
            Category category = id == null ? new Category() : required(dao.category(id));
            long count = id == null ? 0 : dao.counts(true).getOrDefault(id, 0L);
            if (count > 0 && !Objects.equals(category.getComponentType(), input.componentType()))
                throw new AppException(409, "CATEGORY_IN_USE", "Không thể đổi loại linh kiện của danh mục đã có sản phẩm.");
            category.setName(name);
            category.setDescription(clean(input.description()));
            category.setComponentType(input.componentType());
            category.setStatus(input.status());
            if (id == null) dao.persist(category);
            return entry(category, count);
        });
    }

    public Entry saveBrand(Integer id, BrandInput input) {
        if (input == null) throw invalid();
        String name = name(input.name());
        requireStatus(input.status());
        String logo = clean(input.logoUrl());
        if (logo != null) {
            try {
                URI uri = URI.create(logo);
                if (logo.length() > 2048 || uri.getHost() == null || uri.getUserInfo() != null
                        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) throw invalid();
            } catch (IllegalArgumentException e) { throw invalid(); }
        }
        String logoUrl = logo;
        return transaction(dao -> {
            Brand brand = id == null ? new Brand(name) : required(dao.brand(id));
            brand.setName(name);
            brand.setDescription(clean(input.description()));
            brand.setLogoUrl(logoUrl);
            brand.setStatus(input.status());
            if (id == null) dao.persist(brand);
            return entry(brand, id == null ? 0 : dao.counts(false).getOrDefault(id, 0L));
        });
    }

    public Entry status(boolean categories, int id, StatusInput input) {
        if (input == null) throw invalid();
        requireStatus(input.status());
        return transaction(dao -> {
            long count = dao.counts(categories).getOrDefault(id, 0L);
            if (categories) {
                Category category = required(dao.category(id));
                category.setStatus(input.status());
                return entry(category, count);
            }
            Brand brand = required(dao.brand(id));
            brand.setStatus(input.status());
            return entry(brand, count);
        });
    }

    private Entry transaction(Function<AdminTaxonomyDao, Entry> action) {
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            try {
                em.getTransaction().begin();
                Entry result = action.apply(new AdminTaxonomyDao(em));
                em.getTransaction().commit();
                return result;
            } catch (RuntimeException e) {
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
                throw e;
            }
        }
    }
    private static Entry entry(Category c, long count) { return new Entry(c.getCategoryId(), c.getName(), c.getDescription(), c.getStatus(), c.getComponentType(), null, count); }
    private static Entry entry(Brand b, long count) { return new Entry(b.getBrandId(), b.getName(), b.getDescription(), b.getStatus(), null, b.getLogoUrl(), count); }
    private static <T> T required(T value) {
        if (value == null) throw new AppException(404, "RESOURCE_NOT_FOUND", "Không tìm thấy danh mục hoặc thương hiệu.");
        return value;
    }
    private static String name(String value) {
        String name = clean(value);
        if (name == null || name.length() > 255) throw invalid();
        return name;
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static void requireStatus(ActiveStatus status) { if (status == null) throw invalid(); }
    private static ValidationException invalid() { return new ValidationException("Tên/trạng thái không hợp lệ hoặc URL logo phải là HTTP(S) hợp lệ."); }
}
