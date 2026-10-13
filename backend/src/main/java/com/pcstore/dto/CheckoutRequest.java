package com.pcstore.dto;

import com.pcstore.entity.enums.PaymentMethod;

import java.util.List;

public record CheckoutRequest(
        String shippingName,
        String shippingPhone,
        String shippingAddressText,
        PaymentMethod paymentMethod,
        List<Integer> cartItemIds) {

    public CheckoutRequest(String shippingName, String shippingPhone, String shippingAddressText,
                           PaymentMethod paymentMethod) {
        this(shippingName, shippingPhone, shippingAddressText, paymentMethod, null);
    }
}
