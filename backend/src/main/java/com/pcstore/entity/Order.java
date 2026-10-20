package com.pcstore.entity;

import com.pcstore.entity.enums.OrderStatus;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity(name = "PurchaseOrder")
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Integer orderId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 0)
    private BigDecimal totalAmount;

    @Column(name = "shipping_name", nullable = false, length = 255)
    private String shippingName;

    @Column(name = "shipping_phone", nullable = false, length = 32)
    private String shippingPhone;

    @Column(name = "shipping_address_text", nullable = false, columnDefinition = "text")
    private String shippingAddressText;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "checkout_idempotency_key", length = 128)
    private String checkoutIdempotencyKey;

    @Column(name = "checkout_request_hash", length = 64)
    private String checkoutRequestHash;

    @Column(name = "payment_expires_at")
    private LocalDateTime paymentExpiresAt;

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items = new ArrayList<>();

    public Order() {
    }

    public Integer getOrderId() { return orderId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getShippingName() { return shippingName; }
    public void setShippingName(String shippingName) { this.shippingName = shippingName; }
    public String getShippingPhone() { return shippingPhone; }
    public void setShippingPhone(String shippingPhone) { this.shippingPhone = shippingPhone; }
    public String getShippingAddressText() { return shippingAddressText; }
    public void setShippingAddressText(String shippingAddressText) { this.shippingAddressText = shippingAddressText; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public String getCheckoutIdempotencyKey() { return checkoutIdempotencyKey; }
    public void setCheckoutIdempotencyKey(String checkoutIdempotencyKey) { this.checkoutIdempotencyKey = checkoutIdempotencyKey; }
    public String getCheckoutRequestHash() { return checkoutRequestHash; }
    public void setCheckoutRequestHash(String checkoutRequestHash) { this.checkoutRequestHash = checkoutRequestHash; }
    public LocalDateTime getPaymentExpiresAt() { return paymentExpiresAt; }
    public void setPaymentExpiresAt(LocalDateTime paymentExpiresAt) { this.paymentExpiresAt = paymentExpiresAt; }
    public List<OrderItem> getItems() { return items; }
}
