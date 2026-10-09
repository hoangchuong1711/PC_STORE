package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.dto.VNPayIpnResponse;
import com.pcstore.service.VNPayPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PaymentIpnServletTest {

    @Test
    void doGet_returnsSuccessResponseFromService() throws Exception {
        Map<String, String> testParams = new HashMap<>();
        testParams.put("vnp_TxnRef", "PCS_10_1_123");
        testParams.put("vnp_Amount", "100000000");
        testParams.put("vnp_ResponseCode", "00");
        testParams.put("vnp_SecureHash", "abc");

        VNPayPaymentService mockService = new VNPayPaymentService(null, null) {
            @Override
            public VNPayIpnResponse processIpn(Map<String, String> params) {
                return VNPayIpnResponse.success();
            }
        };

        PaymentIpnServlet servlet = new PaymentIpnServlet(mockService);
        JsonNode body = executeServlet(servlet, testParams);

        assertEquals("00", body.path("RspCode").asText());
        assertEquals("Confirm Success", body.path("Message").asText());
    }

    @Test
    void doGet_returnsInvalidChecksumWhenServiceReturns97() throws Exception {
        VNPayPaymentService mockService = new VNPayPaymentService(null, null) {
            @Override
            public VNPayIpnResponse processIpn(Map<String, String> params) {
                return VNPayIpnResponse.invalidChecksum();
            }
        };

        PaymentIpnServlet servlet = new PaymentIpnServlet(mockService);
        JsonNode body = executeServlet(servlet, Map.of("vnp_SecureHash", "wrong"));

        assertEquals("97", body.path("RspCode").asText());
        assertEquals("Invalid Checksum", body.path("Message").asText());
    }

    private JsonNode executeServlet(PaymentIpnServlet servlet, Map<String, String> params) throws Exception {
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class},
                (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> "GET";
                    case "getParameter" -> params.get((String) args[0]);
                    case "getParameterNames" -> Collections.enumeration(params.keySet());
                    default -> null;
                }
        );

        StringWriter output = new StringWriter();
        HttpServletResponse res = (HttpServletResponse) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class},
                (proxy, invocation, args) -> {
                    if ("getWriter".equals(invocation.getName())) return new PrintWriter(output);
                    return null;
                }
        );

        servlet.doGet(req, res);
        return new ObjectMapper().readTree(output.toString());
    }
}
