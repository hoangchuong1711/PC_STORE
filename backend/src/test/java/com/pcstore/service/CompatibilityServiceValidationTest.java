package com.pcstore.service;

import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.exception.ValidationException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;

class CompatibilityServiceValidationTest {
    private final CompatibilityService service = new CompatibilityService(null);

    @Test void rejectsBadQuantityBeforeReadingDatabase() {
        assertThrows(ValidationException.class, () -> service.evaluate(List.of(new Selection(1, 0))));
    }

    @Test void rejectsRepeatedProductBeforeReadingDatabase() {
        assertThrows(ValidationException.class, () -> service.evaluate(List.of(
                new Selection(1, 1), new Selection(1, 1))));
    }
}
