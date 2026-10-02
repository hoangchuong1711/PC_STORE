package com.pcstore.dto;

import java.math.BigDecimal;

public record   ProductSearchQuery(String keyword, Integer categoryId, Integer brandId,
                                BigDecimal minPrice, BigDecimal maxPrice, int page, int size) {
        
    //hàm khởi tạo: kiểm tra các giá trị truyền vào có hợp lệ hay không
    public ProductSearchQuery {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination");
        if (minPrice != null && minPrice.signum() < 0 || maxPrice != null && maxPrice.signum() < 0)
            throw new IllegalArgumentException("Invalid price");
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0)
            throw new IllegalArgumentException("Invalid price range");
    }

    //hàm parse: chuyển đổi query parameters từ String sang ProductSearchQuery
    public static ProductSearchQuery parse(String keyword, String categoryId, String brandId,
                                        String minPrice, String maxPrice, String page, String size) {
        return new ProductSearchQuery(blankToNull(keyword), parseInt(categoryId, "categoryId"),
                parseInt(brandId, "brandId"), parseDecimal(minPrice, "minPrice"),
                parseDecimal(maxPrice, "maxPrice"), parseIntOrDefault(page, 0, "page"),
                parseIntOrDefault(size, 20, "size"));
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static Integer parseInt(String value, String field) {
        if (value == null || value.isBlank()) return null;
        try { return Integer.valueOf(value); } catch (NumberFormatException e) { throw new IllegalArgumentException("Invalid " + field); }
    }
    private static int parseIntOrDefault(String value, int fallback, String field) {
        Integer parsed = parseInt(value, field); return parsed == null ? fallback : parsed;
    }
    private static BigDecimal parseDecimal(String value, String field) {
        if (value == null || value.isBlank()) return null;
        try { return new BigDecimal(value); } catch (NumberFormatException e) { throw new IllegalArgumentException("Invalid " + field); }
    }
}
