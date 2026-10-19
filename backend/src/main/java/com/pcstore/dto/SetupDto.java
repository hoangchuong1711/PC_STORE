package com.pcstore.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class SetupDto {
    private SetupDto() {}

    public static class Request {
        private String title;
        private String description;
        private List<UUID> mediaIds;
        private List<Integer> productIds;

        public Request() {}

        public Request(
                String title, String description, List<UUID> mediaIds, List<Integer> productIds) {
            this.title = title;
            this.description = description;
            this.mediaIds = mediaIds;
            this.productIds = productIds;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public List<UUID> getMediaIds() {
            return mediaIds;
        }

        public void setMediaIds(List<UUID> mediaIds) {
            this.mediaIds = mediaIds;
        }

        public List<Integer> getProductIds() {
            return productIds;
        }

        public void setProductIds(List<Integer> productIds) {
            this.productIds = productIds;
        }
    }

    public static class Product {
        private int productId;
        private String name;

        public Product() {}

        public Product(int productId, String name) {
            this.productId = productId;
            this.name = name;
        }

        public int getProductId() {
            return productId;
        }

        public void setProductId(int productId) {
            this.productId = productId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class Response {
        private int postId;
        private int authorId;
        private String title;
        private String description;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<UUID> mediaIds;
        private List<Product> products;

        public Response() {}

        public Response(
                int postId,
                int authorId,
                String title,
                String description,
                String status,
                LocalDateTime createdAt,
                LocalDateTime updatedAt,
                List<UUID> mediaIds,
                List<Product> products) {
            this.postId = postId;
            this.authorId = authorId;
            this.title = title;
            this.description = description;
            this.status = status;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
            this.mediaIds = mediaIds;
            this.products = products;
        }

        public int getPostId() {
            return postId;
        }

        public void setPostId(int postId) {
            this.postId = postId;
        }

        public int getAuthorId() {
            return authorId;
        }

        public void setAuthorId(int authorId) {
            this.authorId = authorId;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }

        public LocalDateTime getUpdatedAt() {
            return updatedAt;
        }

        public void setUpdatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
        }

        public List<UUID> getMediaIds() {
            return mediaIds;
        }

        public void setMediaIds(List<UUID> mediaIds) {
            this.mediaIds = mediaIds;
        }

        public List<Product> getProducts() {
            return products;
        }

        public void setProducts(List<Product> products) {
            this.products = products;
        }
    }

    public static class Eligibility {
        private boolean eligible;
        private String reason;

        public Eligibility() {}

        public Eligibility(boolean eligible, String reason) {
            this.eligible = eligible;
            this.reason = reason;
        }

        public boolean getEligible() {
            return eligible;
        }

        public void setEligible(boolean eligible) {
            this.eligible = eligible;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }
}
