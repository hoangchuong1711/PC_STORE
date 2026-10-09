package com.pcstore.service;

import com.pcstore.config.VNPayConfig;
import com.pcstore.dao.OrderDao;
import com.pcstore.dao.PaymentAttemptDao;
import com.pcstore.dto.VNPayIpnResponse;
import com.pcstore.dto.VNPayUrlResponse;
import com.pcstore.entity.Order;
import com.pcstore.entity.Payment;
import com.pcstore.entity.PaymentAttempt;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentAttemptStatus;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.entity.enums.PaymentStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.config.PersistenceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class VNPayPaymentService {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final EntityManagerFactory entityManagerFactory;
    private final VNPayConfig vnpayConfig;
    private final Clock clock;

    public VNPayPaymentService() {
        this(PersistenceManager.get(), new VNPayConfig(), Clock.systemDefaultZone());
    }

    public VNPayPaymentService(EntityManagerFactory entityManagerFactory, VNPayConfig vnpayConfig) {
        this(entityManagerFactory, vnpayConfig, Clock.systemDefaultZone());
    }

    public VNPayPaymentService(EntityManagerFactory entityManagerFactory, VNPayConfig vnpayConfig, Clock clock) {
        this.entityManagerFactory = entityManagerFactory;
        this.vnpayConfig = vnpayConfig;
        this.clock = clock;
    }

    public VNPayUrlResponse createPaymentUrl(int userId, int orderId, String clientIp) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                OrderDao orderDao = new OrderDao(em);
                PaymentAttemptDao attemptDao = new PaymentAttemptDao(em);

                Order order = orderDao.find(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng."));

                if (!order.getUser().getUserId().equals(userId)) {
                    throw new ResourceNotFoundException("Không tìm thấy đơn hàng.");
                }

                if (order.getStatus() != OrderStatus.PENDING) {
                    throw new AppException(409, "INVALID_ORDER_STATUS", "Đơn hàng không ở trạng thái chờ thanh toán.");
                }

                Payment payment = orderDao.findPayment(orderId)
                        .orElseThrow(() -> new AppException(409, "PAYMENT_MISSING", "Đơn hàng không có bản ghi thanh toán."));

                if (payment.getMethod() != PaymentMethod.VNPAY) {
                    throw new AppException(400, "INVALID_PAYMENT_METHOD", "Đơn hàng không sử dụng phương thức VNPay.");
                }

                if (payment.getStatus() == PaymentStatus.PAID) {
                    throw new AppException(400, "PAYMENT_ALREADY_PAID", "Đơn hàng đã được thanh toán thành công.");
                }

                LocalDateTime now = LocalDateTime.now(clock);
                if (order.getPaymentExpiresAt() == null || !now.isBefore(order.getPaymentExpiresAt())) {
                    throw new AppException(409, "PAYMENT_EXPIRED", "Đơn hàng đã hết hạn thanh toán 15 phút.");
                }

                // Check existing active attempt
                Optional<PaymentAttempt> latestAttemptOpt = attemptDao.findLatestByOrderId(orderId);
                if (latestAttemptOpt.isPresent()) {
                    PaymentAttempt latest = latestAttemptOpt.get();
                    if ((latest.getStatus() == PaymentAttemptStatus.INITIATED || latest.getStatus() == PaymentAttemptStatus.PENDING)
                            && now.isBefore(latest.getExpiresAt())) {
                        String url = buildPaymentUrl(latest.getReferenceCode(), latest.getAmount(), orderId, latest.getCreatedAt(), latest.getExpiresAt(), clientIp);
                        tx.commit();
                        return new VNPayUrlResponse(
                                orderId,
                                PaymentMethod.VNPAY.name(),
                                latest.getReferenceCode(),
                                url,
                                latest.getExpiresAt()
                        );
                    }
                }

                long count = attemptDao.countByOrderId(orderId);
                String refCode = String.format("PCS_%d_%d_%d", orderId, count + 1, System.currentTimeMillis());

                PaymentAttempt attempt = new PaymentAttempt();
                attempt.setOrder(order);
                attempt.setPayment(payment);
                attempt.setReferenceCode(refCode);
                attempt.setAmount(order.getTotalAmount());
                attempt.setCreatedAt(now);
                attempt.setExpiresAt(order.getPaymentExpiresAt());
                attempt.setStatus(PaymentAttemptStatus.INITIATED);
                attemptDao.persist(attempt);

                em.flush();
                String paymentUrl = buildPaymentUrl(refCode, order.getTotalAmount(), orderId, now, order.getPaymentExpiresAt(), clientIp);
                tx.commit();

                return new VNPayUrlResponse(
                        orderId,
                        PaymentMethod.VNPAY.name(),
                        refCode,
                        paymentUrl,
                        attempt.getExpiresAt()
                );
            } catch (AppException exception) {
                if (tx.isActive()) tx.rollback();
                throw exception;
            } catch (RuntimeException exception) {
                if (tx.isActive()) tx.rollback();
                throw exception;
            }
        }
    }

    public String buildPaymentUrl(String referenceCode, BigDecimal amount, int orderId,
                                  LocalDateTime createdAt, LocalDateTime expiresAt, String clientIp) {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amount.longValue() * 100L));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", referenceCode);
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang #" + orderId);
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", (clientIp != null && !clientIp.isBlank()) ? clientIp : "127.0.0.1");

        ZonedDateTime createZdt = createdAt.atZone(clock.getZone()).withZoneSameInstant(VN_ZONE);
        ZonedDateTime expireZdt = expiresAt.atZone(clock.getZone()).withZoneSameInstant(VN_ZONE);
        vnpParams.put("vnp_CreateDate", createZdt.format(DATE_TIME_FORMATTER));
        vnpParams.put("vnp_ExpireDate", expireZdt.format(DATE_TIME_FORMATTER));

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        for (Iterator<String> itr = fieldNames.iterator(); itr.hasNext(); ) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                String encodedKey = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII);
                String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);

                hashData.append(fieldName).append('=').append(encodedValue);
                query.append(encodedKey).append('=').append(encodedValue);

                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String secureHash = hmacSHA512(vnpayConfig.getHashSecret(), hashData.toString());
        return vnpayConfig.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    public static String hmacSHA512(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac.init(secretKey);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception ex) {
            throw new IllegalStateException("Lỗi tính HMAC-SHA512", ex);
        }
    }

    public boolean verifySignature(Map<String, String> fields, String secureHash) {
        if (secureHash == null || secureHash.isBlank()) return false;
        List<String> fieldNames = fields.keySet().stream()
                .filter(fieldName -> !"vnp_SecureHash".equals(fieldName) && !"vnp_SecureHashType".equals(fieldName))
                .filter(fieldName -> fields.get(fieldName) != null && !fields.get(fieldName).isEmpty())
                .sorted()
                .toList();

        StringBuilder hashData = new StringBuilder();
        for (Iterator<String> itr = fieldNames.iterator(); itr.hasNext(); ) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII);
            hashData.append(fieldName).append('=').append(encodedValue);
            if (itr.hasNext()) {
                hashData.append('&');
            }
        }
        String calculated = hmacSHA512(vnpayConfig.getHashSecret(), hashData.toString());
        return calculated.equalsIgnoreCase(secureHash);
    }

    public VNPayIpnResponse processIpn(Map<String, String> params) {
        String secureHash = params.get("vnp_SecureHash");
        if (!verifySignature(params, secureHash)) {
            return VNPayIpnResponse.invalidChecksum();
        }

        String referenceCode = params.get("vnp_TxnRef");
        if (referenceCode == null || referenceCode.isBlank()) {
            return VNPayIpnResponse.orderNotFound();
        }

        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                PaymentAttemptDao attemptDao = new PaymentAttemptDao(em);
                OrderDao orderDao = new OrderDao(em);

                PaymentAttempt attempt = attemptDao.lockByReferenceCode(referenceCode).orElse(null);
                if (attempt == null) {
                    tx.rollback();
                    return VNPayIpnResponse.orderNotFound();
                }

                Order order = orderDao.lock(attempt.getOrder().getOrderId()).orElse(null);
                if (order == null) {
                    tx.rollback();
                    return VNPayIpnResponse.orderNotFound();
                }

                Payment payment = orderDao.findPayment(order.getOrderId()).orElse(null);
                if (payment == null) {
                    tx.rollback();
                    return VNPayIpnResponse.orderNotFound();
                }

                if (payment.getStatus() == PaymentStatus.PAID) {
                    tx.commit();
                    return VNPayIpnResponse.alreadyConfirmed();
                }

                String vnpAmountStr = params.get("vnp_Amount");
                if (vnpAmountStr == null) {
                    tx.rollback();
                    return VNPayIpnResponse.invalidAmount();
                }

                long vnpAmount = Long.parseLong(vnpAmountStr);
                long expectedAmount = order.getTotalAmount().longValue() * 100L;
                if (vnpAmount != expectedAmount) {
                    tx.rollback();
                    return VNPayIpnResponse.invalidAmount();
                }

                LocalDateTime now = LocalDateTime.now(clock);
                String responseCode = params.get("vnp_ResponseCode");
                String transactionStatus = params.get("vnp_TransactionStatus");
                String transactionNo = params.get("vnp_TransactionNo");
                String bankCode = params.get("vnp_BankCode");

                attempt.setVnpTransactionNo(transactionNo);
                attempt.setVnpBankCode(bankCode);
                attempt.setLastReconciledAt(now);

                boolean isSuccess = "00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus));
                if (isSuccess) {
                    attempt.setStatus(PaymentAttemptStatus.SUCCESS);
                    attempt.setVerifiedResult("IPN_SUCCESS: " + responseCode);

                    payment.setStatus(PaymentStatus.PAID);
                    payment.setPaidAt(now);

                    if (order.getStatus() == OrderStatus.EXPIRED_PENDING_RECONCILIATION) {
                        order.setStatus(OrderStatus.PENDING);
                    }
                } else {
                    attempt.setStatus(PaymentAttemptStatus.FAILED);
                    attempt.setErrorMessage("IPN_FAILED: ResponseCode=" + responseCode);
                    attempt.setVerifiedResult("IPN_FAILED");
                }

                em.flush();
                tx.commit();
                return VNPayIpnResponse.success();
            } catch (Exception ex) {
                if (tx.isActive()) tx.rollback();
                throw ex;
            }
        }
    }
}
