package com.pcstore.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "inventory")
public class Inventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_id")
    private Integer inventoryId;

    @Column(name = "quantity_on_hand", nullable = false)
    private int quantityOnHand;

    @Column(name = "reserved_quantity", nullable = false)
    private int reservedQuantity;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, unique = true)
    private Product product;

    public Inventory() {
    }

    public Integer getInventoryId() { return inventoryId; }
    public int getQuantityOnHand() { return quantityOnHand; }
    public void setQuantityOnHand(int quantityOnHand) { this.quantityOnHand = quantityOnHand; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}

