package com.pcstore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items", uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "product_id"}))
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Integer orderItemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "base_unit_price", nullable = false, precision = 19, scale = 0)
    private BigDecimal baseUnitPrice;

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 0)
    private BigDecimal unitPrice;

    public OrderItem() {
    }

    public Integer getOrderItemId() { return orderItemId; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getBaseUnitPrice() { return baseUnitPrice; }
    public void setBaseUnitPrice(BigDecimal baseUnitPrice) { this.baseUnitPrice = baseUnitPrice; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
}

