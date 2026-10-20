package com.pcstore.controller;

import com.pcstore.dto.VNPayIpnResponse;
import com.pcstore.service.VNPayPaymentService;
import com.pcstore.util.JsonUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@WebServlet(name = "paymentIpnServlet", urlPatterns = {"/api/payment/vnpay/ipn"})
public class PaymentIpnServlet extends HttpServlet {
    private VNPayPaymentService vnPayPaymentService;

    public PaymentIpnServlet() {
    }

    public PaymentIpnServlet(VNPayPaymentService vnPayPaymentService) {
        this.vnPayPaymentService = vnPayPaymentService;
    }

    @Override
    public void init() {
        if (vnPayPaymentService == null) {
            vnPayPaymentService = new VNPayPaymentService();
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            Map<String, String> params = new HashMap<>();
            Enumeration<String> paramNames = request.getParameterNames();
            while (paramNames.hasMoreElements()) {
                String name = paramNames.nextElement();
                params.put(name, request.getParameter(name));
            }

            VNPayIpnResponse ipnResponse = vnPayPaymentService.processIpn(params);
            JsonUtil.write(response, HttpServletResponse.SC_OK, ipnResponse);
        } catch (Exception ex) {
            getServletContext().log("VNPay IPN processing error", ex);
            JsonUtil.write(response, HttpServletResponse.SC_OK, VNPayIpnResponse.error("System error"));
        }
    }
}
