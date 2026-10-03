package com.pcstore.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ProductSearchQueryTest {
    @Test
    void parsesDefaultsAndFilters() {
        var query = ProductSearchQuery.parse("rtx", "2", "3", "1000000", "9000000", "1", "20");

        assertEquals("rtx", query.keyword());
        assertEquals(2, query.categoryId());
        assertEquals(3, query.brandId());
        assertEquals(new BigDecimal("1000000"), query.minPrice());
        assertEquals(new BigDecimal("9000000"), query.maxPrice());
        assertEquals(1, query.page());
        assertEquals(20, query.size());
    }

    @Test
    void rejectsInvalidRangeAndPagination() {
        assertThrows(IllegalArgumentException.class,
                () -> ProductSearchQuery.parse("", null, null, "9", "1", "0", "20"));
        assertThrows(IllegalArgumentException.class,
                () -> ProductSearchQuery.parse("", null, null, null, null, "-1", "20"));
        assertThrows(IllegalArgumentException.class,
                () -> ProductSearchQuery.parse("", null, null, null, null, "0", "101"));
    }
}
