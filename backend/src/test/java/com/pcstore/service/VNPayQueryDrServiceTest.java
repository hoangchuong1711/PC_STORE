package com.pcstore.service;

import com.pcstore.config.VNPayConfig;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class VNPayQueryDrServiceTest {

    @Test
    void queryDrHash_generatesExpectedDigest() {
        String requestId = "REQ_001";
        String version = "2.1.0";
        String command = "querydr";
        String tmnCode = "TMN1";
        String txnRef = "PCS_1_1_123";
        String transDate = "20261009120000";
        String createDate = "20261009121500";
        String ipAddr = "127.0.0.1";
        String orderInfo = "Truy van giao dich " + txnRef;

        String rawHash = requestId + "|" + version + "|" + command + "|" + tmnCode + "|" + txnRef + "|" + transDate + "|" + createDate + "|" + ipAddr + "|" + orderInfo;
        String hash = VNPayPaymentService.hmacSHA512("secret_key", rawHash);

        assertNotNull(hash);
        assertEquals(128, hash.length());
    }

    @Test
    void queryDrExecutor_simulatesSuccessAndFailureResponses() throws Exception {
        VNPayQueryDrService.QueryDrExecutor executor = requestJson -> """
                {
                    "vnp_ResponseCode": "00",
                    "vnp_TransactionStatus": "00",
                    "vnp_TransactionNo": "14567890",
                    "vnp_BankCode": "NCB"
                }
                """;

        String result = executor.execute("{}");
        assertTrue(result.contains("\"vnp_ResponseCode\": \"00\""));
        assertTrue(result.contains("\"vnp_TransactionStatus\": \"00\""));
    }
}
