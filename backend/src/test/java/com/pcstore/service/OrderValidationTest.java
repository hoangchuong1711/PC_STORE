package com.pcstore.service;

import com.pcstore.dto.CheckoutRequest;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

/** Invalid requests must be rejected before opening a transaction. */
class OrderValidationTest {
    private final OrderService service = new OrderService(null);
    private final CheckoutRequest valid = new CheckoutRequest("Customer", "0901234567", "Test address", PaymentMethod.COD);

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "short", "bad/key-001", "bad key-001"})
    void rejectsMissingOrMalformedIdempotencyKey(String key) {
        assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, key, valid)).getStatus());
    }

    @Test
    void rejectsKeyLongerThan128Characters() {
        assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, "a".repeat(129), valid)).getStatus());
    }

    @Test
    void rejectsNullRequest() {
        assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, "valid-key-001", null)).getStatus());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t"})
    void requiresRecipientNamePhoneAndAddress(String value) {
        for (var body : new CheckoutRequest[]{
                new CheckoutRequest(value, "0901234567", "Address", PaymentMethod.COD),
                new CheckoutRequest("Customer", value, "Address", PaymentMethod.COD),
                new CheckoutRequest("Customer", "0901234567", value, PaymentMethod.COD)}) {
            assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, "valid-key-001", body)).getStatus());
        }
    }

    @Test
    void rejectsRecipientFieldsExceedingStorageLimits() {
        for (var body : new CheckoutRequest[]{
                new CheckoutRequest("a".repeat(256), "0901234567", "Address", PaymentMethod.COD),
                new CheckoutRequest("Customer", "1".repeat(33), "Address", PaymentMethod.COD)}) {
            assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, "valid-key-001", body)).getStatus());
        }
    }

    @Test
    void requiresPaymentMethod() {
        var body = new CheckoutRequest("Customer", "0901234567", "Address", null);
        assertEquals(400, assertThrows(AppException.class, () -> service.checkout(1, "valid-key-001", body)).getStatus());
    }

    @Test
    void acceptsVnpayPaymentMethodInValidation() {
        var body = new CheckoutRequest("Customer", "0901234567", "Address", PaymentMethod.VNPAY);
        assertThrows(NullPointerException.class, () -> service.checkout(1, "valid-key-001", body));
    }
}
