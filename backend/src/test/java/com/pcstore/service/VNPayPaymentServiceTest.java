package com.pcstore.service;

import com.pcstore.config.VNPayConfig;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class VNPayPaymentServiceTest {
    private final VNPayConfig config = new VNPayConfig(
            true,
            "TESTTMN1",
            "TESTSECRET1234567890ABCDEF123456",
            VNPayConfig.DEFAULT_PAY_URL,
            VNPayConfig.DEFAULT_API_URL,
            VNPayConfig.DEFAULT_RETURN_URL
    );
    private final VNPayPaymentService service = new VNPayPaymentService(null, config);

    @Test
    void buildPaymentUrl_generatesValidSignedUrl() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 9, 14, 0, 0);
        LocalDateTime expiresAt = now.plusMinutes(15);
        BigDecimal amount = BigDecimal.valueOf(5_000_000);

        String url = service.buildPaymentUrl("PCS_12_1_123456789", amount, 12, now, expiresAt, "127.0.0.1");

        assertNotNull(url);
        assertTrue(url.startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?"));
        assertTrue(url.contains("vnp_Amount=500000000"));
        assertTrue(url.contains("vnp_Command=pay"));
        assertTrue(url.contains("vnp_CreateDate=20261009140000"));
        assertTrue(url.contains("vnp_ExpireDate=20261009141500"));
        assertTrue(url.contains("vnp_CurrCode=VND"));
        assertTrue(url.contains("vnp_Locale=vn"));
        assertTrue(url.contains("vnp_OrderType=other"));
        assertTrue(url.contains("vnp_TmnCode=TESTTMN1"));
        assertTrue(url.contains("vnp_TxnRef=PCS_12_1_123456789"));
        assertTrue(url.contains("vnp_Version=2.1.0"));
        assertTrue(url.contains("vnp_SecureHash="));

        // Parse query params to verify signature
        URI uri = URI.create(url);
        String query = uri.getQuery();
        Map<String, String> params = new HashMap<>();
        String secureHash = null;
        for (String pair : query.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
            String value = parts.length > 1 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "";
            if ("vnp_SecureHash".equals(key)) {
                secureHash = value;
            } else {
                params.put(key, value);
            }
        }

        assertNotNull(secureHash);
        assertTrue(service.verifySignature(params, secureHash));

        // Tamper parameter should fail signature verification
        params.put("vnp_Amount", "999999999");
        assertFalse(service.verifySignature(params, secureHash));
    }

    @Test
    void hmacSHA512_calculatesCorrectDigest() {
        String key = "secret";
        String data = "hello world";
        String hash = VNPayPaymentService.hmacSHA512(key, data);
        assertNotNull(hash);
        assertEquals(128, hash.length()); // SHA-512 hex is 128 chars
        // Idempotent calculation
        assertEquals(hash, VNPayPaymentService.hmacSHA512(key, data));
    }

    @Test
    void processIpn_returnsInvalidChecksum_whenSignatureInvalid() {
        var response = service.processIpn(Map.of("vnp_SecureHash", "invalid_hash", "vnp_TxnRef", "PCS_1_1_1"));
        assertEquals("97", response.rspCode());
        assertEquals("Invalid Checksum", response.message());
    }

    @Test
    void processIpn_returnsOrderNotFound_whenTxnRefMissing() {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Amount", "100000000");
        String hash = VNPayPaymentService.hmacSHA512(config.getHashSecret(), "vnp_Amount=100000000");
        params.put("vnp_SecureHash", hash);

        var response = service.processIpn(params);
        assertEquals("01", response.rspCode());
        assertEquals("Order not found", response.message());
    }
}
