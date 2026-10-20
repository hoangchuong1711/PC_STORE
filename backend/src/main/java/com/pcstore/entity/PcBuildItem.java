package com.pcstore.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pc_build_items", uniqueConstraints = @UniqueConstraint(columnNames = {"build_id", "product_id"}))
public class PcBuildItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "build_item_id")
    private Integer buildItemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "build_id", nullable = false)
    private PcBuild build;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    public Integer getBuildItemId() { return buildItemId; }
    public PcBuild getBuild() { return build; }
    public void setBuild(PcBuild build) { this.build = build; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}
