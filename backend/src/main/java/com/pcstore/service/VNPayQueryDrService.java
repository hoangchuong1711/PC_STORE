package com.pcstore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.config.VNPayConfig;
import com.pcstore.dao.OrderDao;
import com.pcstore.dao.PaymentAttemptDao;
import com.pcstore.dto.OrderResponse;
import com.pcstore.entity.Order;
import com.pcstore.entity.Payment;
import com.pcstore.entity.PaymentAttempt;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentAttemptStatus;
import com.pcstore.entity.enums.PaymentStatus;
import com.pcstore.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class VNPayQueryDrService {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final EntityManagerFactory entityManagerFactory;
    private final VNPayConfig vnpayConfig;
    private final OrderService orderService;
    private final Clock clock;
    private final QueryDrExecutor queryDrExecutor;

    @FunctionalInterface
    public interface QueryDrExecutor {
        String execute(String requestJson) throws Exception;
    }

    public VNPayQueryDrService() {
        this(PersistenceManager.get(), new VNPayConfig(), new OrderService(), Clock.systemDefaultZone(), null);
    }

    public VNPayQueryDrService(EntityManagerFactory emf, VNPayConfig config, OrderService orderService, Clock clock, QueryDrExecutor executor) {
        this.entityManagerFactory = emf;
        this.vnpayConfig = config;
        this.orderService = orderService;
        this.clock = clock;
        this.queryDrExecutor = executor != null ? executor : this::defaultHttpExecute;
    }

    private String defaultHttpExecute(String requestJson) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(vnpayConfig.getApiUrl()))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    public OrderResponse reconcileOrder(int orderId) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                OrderDao orderDao = new OrderDao(em);
                PaymentAttemptDao attemptDao = new PaymentAttemptDao(em);

                Order order = orderDao.lock(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng."));

                Payment payment = orderDao.findPayment(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản ghi thanh toán."));

                if (payment.getStatus() == PaymentStatus.PAID) {
                    tx.commit();
                    return orderService.findOrderForAdmin(orderId);
                }

                List<PaymentAttempt> attempts = attemptDao.findByOrderId(orderId);
                LocalDateTime now = LocalDateTime.now(clock);

                for (PaymentAttempt attempt : attempts) {
                    if (attempt.getStatus() == PaymentAttemptStatus.SUCCESS) {
                        payment.setStatus(PaymentStatus.PAID);
                        payment.setPaidAt(attempt.getLastReconciledAt() != null ? attempt.getLastReconciledAt() : now);
                        if (order.getStatus() == OrderStatus.EXPIRED_PENDING_RECONCILIATION) {
                            order.setStatus(OrderStatus.PENDING);
                        }
                        break;
                    }

                    if (attempt.getStatus() == PaymentAttemptStatus.INITIATED
                            || attempt.getStatus() == PaymentAttemptStatus.PENDING
                            || attempt.getStatus() == PaymentAttemptStatus.UNKNOWN) {
                        reconcileAttempt(attempt, order, payment, now);
                        if (payment.getStatus() == PaymentStatus.PAID) {
                            break;
                        }
                    }
                }

                em.flush();
                tx.commit();

                // If all attempts failed and order is EXPIRED_PENDING_RECONCILIATION, cancel order and release hold
                if (order.getStatus() == OrderStatus.EXPIRED_PENDING_RECONCILIATION && payment.getStatus() != PaymentStatus.PAID) {
                    boolean allTerminalFailed = attempts.stream().allMatch(a ->
                            a.getStatus() == PaymentAttemptStatus.FAILED || a.getStatus() == PaymentAttemptStatus.EXPIRED);
                    if (allTerminalFailed && !attempts.isEmpty()) {
                        return orderService.updateStatusForAdmin(orderId, OrderStatus.CANCELLED);
                    }
                }

                return orderService.findOrderForAdmin(orderId);
            } catch (Exception ex) {
                if (tx.isActive()) tx.rollback();
                throw (ex instanceof RuntimeException ? (RuntimeException) ex : new RuntimeException(ex));
            }
        }
    }

    private void reconcileAttempt(PaymentAttempt attempt, Order order, Payment payment, LocalDateTime now) {
        String requestId = "REQ_" + System.currentTimeMillis();
        String version = "2.1.0";
        String command = "querydr";
        String tmnCode = vnpayConfig.getTmnCode();
        String txnRef = attempt.getReferenceCode();
        String orderInfo = "Truy van giao dich " + txnRef;
        String transDate = attempt.getCreatedAt().atZone(VN_ZONE).format(DATE_TIME_FORMATTER);
        String createDate = now.atZone(VN_ZONE).format(DATE_TIME_FORMATTER);
        String ipAddr = "127.0.0.1";

        String rawHash = requestId + "|" + version + "|" + command + "|" + tmnCode + "|" + txnRef + "|" + transDate + "|" + createDate + "|" + ipAddr + "|" + orderInfo;
        String secureHash = VNPayPaymentService.hmacSHA512(vnpayConfig.getHashSecret(), rawHash);

        Map<String, String> requestMap = new HashMap<>();
        requestMap.put("vnp_RequestId", requestId);
        requestMap.put("vnp_Version", version);
        requestMap.put("vnp_Command", command);
        requestMap.put("vnp_TmnCode", tmnCode);
        requestMap.put("vnp_TxnRef", txnRef);
        requestMap.put("vnp_OrderInfo", orderInfo);
        requestMap.put("vnp_TransactionDate", transDate);
        requestMap.put("vnp_CreateDate", createDate);
        requestMap.put("vnp_IpAddr", ipAddr);
        requestMap.put("vnp_SecureHash", secureHash);

        try {
            String requestJson = OBJECT_MAPPER.writeValueAsString(requestMap);
            String responseJson = queryDrExecutor.execute(requestJson);
            if (responseJson == null || responseJson.isBlank()) {
                markRetry(attempt, now, "Phản hồi rỗng từ VNPay QueryDR");
                return;
            }

            JsonNode root = OBJECT_MAPPER.readTree(responseJson);
            String responseCode = root.path("vnp_ResponseCode").asText("");
            String transactionStatus = root.path("vnp_TransactionStatus").asText("");
            String transactionNo = root.path("vnp_TransactionNo").asText("");
            String bankCode = root.path("vnp_BankCode").asText("");

            attempt.setLastReconciledAt(now);
            if (!transactionNo.isBlank()) attempt.setVnpTransactionNo(transactionNo);
            if (!bankCode.isBlank()) attempt.setVnpBankCode(bankCode);

            if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
                attempt.setStatus(PaymentAttemptStatus.SUCCESS);
                attempt.setVerifiedResult("QUERYDR_SUCCESS");
                payment.setStatus(PaymentStatus.PAID);
                payment.setPaidAt(now);
                if (order.getStatus() == OrderStatus.EXPIRED_PENDING_RECONCILIATION) {
                    order.setStatus(OrderStatus.PENDING);
                }
            } else if ("00".equals(responseCode) && ("02".equals(transactionStatus) || "04".equals(transactionStatus) || "07".equals(transactionStatus))) {
                attempt.setStatus(PaymentAttemptStatus.FAILED);
                attempt.setVerifiedResult("QUERYDR_FAILED: Status=" + transactionStatus);
            } else if ("91".equals(responseCode) && now.isAfter(attempt.getExpiresAt())) {
                // Transaction not found at VNPay and attempt is expired
                attempt.setStatus(PaymentAttemptStatus.FAILED);
                attempt.setVerifiedResult("QUERYDR_NOT_FOUND_EXPIRED");
            } else {
                markRetry(attempt, now, "VNPay QueryDR ResponseCode=" + responseCode + ", Status=" + transactionStatus);
            }
        } catch (Exception ex) {
            markRetry(attempt, now, "Lỗi gọi QueryDR: " + ex.getMessage());
        }
    }

    private static void markRetry(PaymentAttempt attempt, LocalDateTime now, String error) {
        attempt.setRetryCount(attempt.getRetryCount() + 1);
        attempt.setErrorMessage(error);
        if (attempt.getRetryCount() >= 5) {
            attempt.setRequiresAdminReview(true);
        } else {
            attempt.setNextRetryAt(now.plusMinutes(2L * attempt.getRetryCount()));
        }
    }
}
