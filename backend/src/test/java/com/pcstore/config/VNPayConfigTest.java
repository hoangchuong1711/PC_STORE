package com.pcstore.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VNPayConfigTest {

    @Test
    void disabledConfigAllowsBlankSecrets() {
        VNPayConfig config = new VNPayConfig(false, "", "", null, null, null);
        assertFalse(config.isEnabled());
        assertEquals("", config.getTmnCode());
        assertEquals("", config.getHashSecret());
        assertEquals(VNPayConfig.DEFAULT_PAY_URL, config.getPayUrl());
        assertEquals(VNPayConfig.DEFAULT_API_URL, config.getApiUrl());
        assertEquals(VNPayConfig.DEFAULT_RETURN_URL, config.getReturnUrl());
    }

    @Test
    void enabledConfigRequiresTmnCodeAndHashSecret() {
        assertThrows(IllegalStateException.class,
                () -> new VNPayConfig(true, "", "secret", null, null, null));
        assertThrows(IllegalStateException.class,
                () -> new VNPayConfig(true, "PCSTORE1", "", null, null, null));
        assertThrows(IllegalStateException.class,
                () -> new VNPayConfig(true, "   ", "secret", null, null, null));
        assertThrows(IllegalStateException.class,
                () -> new VNPayConfig(true, "PCSTORE1", "   ", null, null, null));
    }

    @Test
    void validEnabledConfigLoadsProperly() {
        VNPayConfig config = new VNPayConfig(
                true,
                "PCSTORE1",
                "SECRET123456",
                "https://sandbox.vnpayment.vn/custom-pay",
                "https://sandbox.vnpayment.vn/custom-api",
                "http://localhost:3000/custom-return"
        );
        assertTrue(config.isEnabled());
        assertEquals("PCSTORE1", config.getTmnCode());
        assertEquals("SECRET123456", config.getHashSecret());
        assertEquals("https://sandbox.vnpayment.vn/custom-pay", config.getPayUrl());
        assertEquals("https://sandbox.vnpayment.vn/custom-api", config.getApiUrl());
        assertEquals("http://localhost:3000/custom-return", config.getReturnUrl());
    }
}
