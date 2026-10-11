package com.pcstore.config;

import java.util.Objects;

public class VNPayConfig {
    public static final String DEFAULT_PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public static final String DEFAULT_API_URL = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    public static final String DEFAULT_RETURN_URL = "http://localhost:3000/orders/payment-return";

    private final boolean enabled;
    private final String tmnCode;
    private final String hashSecret;
    private final String payUrl;
    private final String apiUrl;
    private final String returnUrl;

    public VNPayConfig() {
        this(
                Boolean.parseBoolean(System.getenv("VNPAY_ENABLED")),
                envOrDefault("VNPAY_TMN_CODE", ""),
                envOrDefault("VNPAY_HASH_SECRET", ""),
                envOrDefault("VNPAY_PAY_URL", DEFAULT_PAY_URL),
                envOrDefault("VNPAY_API_URL", DEFAULT_API_URL),
                envOrDefault("VNPAY_RETURN_URL", DEFAULT_RETURN_URL)
        );
    }

    public VNPayConfig(boolean enabled, String tmnCode, String hashSecret, String payUrl, String apiUrl, String returnUrl) {
        this.enabled = enabled;
        this.tmnCode = tmnCode != null ? tmnCode.trim() : "";
        this.hashSecret = hashSecret != null ? hashSecret.trim() : "";
        this.payUrl = (payUrl != null && !payUrl.isBlank()) ? payUrl.trim() : DEFAULT_PAY_URL;
        this.apiUrl = (apiUrl != null && !apiUrl.isBlank()) ? apiUrl.trim() : DEFAULT_API_URL;
        this.returnUrl = (returnUrl != null && !returnUrl.isBlank()) ? returnUrl.trim() : DEFAULT_RETURN_URL;

        if (this.enabled) {
            if (this.tmnCode.isEmpty()) {
                throw new IllegalStateException("VNPAY_TMN_CODE không được để trống khi VNPAY_ENABLED=true");
            }
            if (this.hashSecret.isEmpty()) {
                throw new IllegalStateException("VNPAY_HASH_SECRET không được để trống khi VNPAY_ENABLED=true");
            }
        }
    }

    public boolean isEnabled() { return enabled; }
    public String getTmnCode() { return tmnCode; }
    public String getHashSecret() { return hashSecret; }
    public String getPayUrl() { return payUrl; }
    public String getApiUrl() { return apiUrl; }
    public String getReturnUrl() { return returnUrl; }

    private static String envOrDefault(String name, String fallback) {
        String val = System.getenv(name);
        return (val != null && !val.isBlank()) ? val.trim() : fallback;
    }
}
