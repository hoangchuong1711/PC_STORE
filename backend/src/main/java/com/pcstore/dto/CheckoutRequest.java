package com.pcstore.dto;

import com.pcstore.entity.enums.PaymentMethod;

public record CheckoutRequest(
        String shippingName,
        String shippingPhone,
        String shippingAddressText,
        PaymentMethod paymentMethod) {
}
