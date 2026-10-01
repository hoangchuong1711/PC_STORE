package com.pcstore.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "product_images", uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "sort_order"}))
public class ProductImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Integer imageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public ProductImage() {
    }

    public Integer getImageId() { return imageId; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public boolean isPrimary() { return isPrimary; }
    public void setPrimary(boolean isPrimary) { this.isPrimary = isPrimary; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}

