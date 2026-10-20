package com.pcstore.dto;

import java.util.List;
import java.util.UUID;

public class ReviewDto {
    private ReviewDto() {}

    public enum Sort {
        NEWEST,
        OLDEST,
        RATING_DESC,
        RATING_ASC,
        HELPFUL
    }

    public static class CreateRequest {
        private Integer orderItemId;
        private Integer productId;
        private Integer rating;
        private String content;
        private List<UUID> mediaIds;

        public CreateRequest() {}

        public CreateRequest(
                Integer orderItemId,
                Integer productId,
                Integer rating,
                String content,
                List<UUID> mediaIds) {
            this.orderItemId = orderItemId;
            this.productId = productId;
            this.rating = rating;
            this.content = content;
            this.mediaIds = mediaIds;
        }

        public Integer getOrderItemId() {
            return orderItemId;
        }

        public void setOrderItemId(Integer orderItemId) {
            this.orderItemId = orderItemId;
        }

        public Integer getProductId() {
            return productId;
        }

        public void setProductId(Integer productId) {
            this.productId = productId;
        }

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public List<UUID> getMediaIds() {
            return mediaIds;
        }

        public void setMediaIds(List<UUID> mediaIds) {
            this.mediaIds = mediaIds;
        }
    }

    public static class UpdateRequest {
        private Integer rating;
        private String content;
        private List<UUID> mediaIds;

        public UpdateRequest() {}

        public UpdateRequest(Integer rating, String content, List<UUID> mediaIds) {
            this.rating = rating;
            this.content = content;
            this.mediaIds = mediaIds;
        }

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public List<UUID> getMediaIds() {
            return mediaIds;
        }

        public void setMediaIds(List<UUID> mediaIds) {
            this.mediaIds = mediaIds;
        }
    }

    public static class Author {
        private int userId;
        private String fullName;

        public Author() {}

        public Author(int userId, String fullName) {
            this.userId = userId;
            this.fullName = fullName;
        }

        public int getUserId() {
            return userId;
        }

        public void setUserId(int userId) {
            this.userId = userId;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }
    }

    public static class Media {
        private UUID mediaId;
        private String mediaType;
        private String mimeType;
        private long sizeBytes;
        private Integer durationSecond;
        private int sortOrder;
        private String contentUrl;

        public Media() {}

        public Media(
                UUID mediaId,
                String mediaType,
                String mimeType,
                long sizeBytes,
                Integer durationSecond,
                int sortOrder,
                String contentUrl) {
            this.mediaId = mediaId;
            this.mediaType = mediaType;
            this.mimeType = mimeType;
            this.sizeBytes = sizeBytes;
            this.durationSecond = durationSecond;
            this.sortOrder = sortOrder;
            this.contentUrl = contentUrl;
        }

        public UUID getMediaId() {
            return mediaId;
        }

        public void setMediaId(UUID mediaId) {
            this.mediaId = mediaId;
        }

        public String getMediaType() {
            return mediaType;
        }

        public void setMediaType(String mediaType) {
            this.mediaType = mediaType;
        }

        public String getMimeType() {
            return mimeType;
        }

        public void setMimeType(String mimeType) {
            this.mimeType = mimeType;
        }

        public long getSizeBytes() {
            return sizeBytes;
        }

        public void setSizeBytes(long sizeBytes) {
            this.sizeBytes = sizeBytes;
        }

        public Integer getDurationSecond() {
            return durationSecond;
        }

        public void setDurationSecond(Integer durationSecond) {
            this.durationSecond = durationSecond;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public void setSortOrder(int sortOrder) {
            this.sortOrder = sortOrder;
        }

        public String getContentUrl() {
            return contentUrl;
        }

        public void setContentUrl(String contentUrl) {
            this.contentUrl = contentUrl;
        }
    }

    public static class Response {
        private int reviewId;
        private int orderItemId;
        private int orderId;
        private int productId;
        private String productName;
        private Author author;
        private int rating;
        private String content;
        private String status;
        private List<Media> media;
        private long likeCount;
        private boolean likedByCurrentUser;
        private boolean verifiedPurchase;

        public Response() {}

        public Response(
                int reviewId,
                int orderItemId,
                int orderId,
                int productId,
                String productName,
                Author author,
                int rating,
                String content,
                String status,
                List<Media> media,
                long likeCount,
                boolean likedByCurrentUser,
                boolean verifiedPurchase) {
            this.reviewId = reviewId;
            this.orderItemId = orderItemId;
            this.orderId = orderId;
            this.productId = productId;
            this.productName = productName;
            this.author = author;
            this.rating = rating;
            this.content = content;
            this.status = status;
            this.media = media;
            this.likeCount = likeCount;
            this.likedByCurrentUser = likedByCurrentUser;
            this.verifiedPurchase = verifiedPurchase;
        }

        public int getReviewId() {
            return reviewId;
        }

        public void setReviewId(int reviewId) {
            this.reviewId = reviewId;
        }

        public int getOrderItemId() {
            return orderItemId;
        }

        public void setOrderItemId(int orderItemId) {
            this.orderItemId = orderItemId;
        }

        public int getOrderId() {
            return orderId;
        }

        public void setOrderId(int orderId) {
            this.orderId = orderId;
        }

        public int getProductId() {
            return productId;
        }

        public void setProductId(int productId) {
            this.productId = productId;
        }

        public String getProductName() {
            return productName;
        }

        public void setProductName(String productName) {
            this.productName = productName;
        }

        public Author getAuthor() {
            return author;
        }

        public void setAuthor(Author author) {
            this.author = author;
        }

        public int getRating() {
            return rating;
        }

        public void setRating(int rating) {
            this.rating = rating;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public List<Media> getMedia() {
            return media;
        }

        public void setMedia(List<Media> media) {
            this.media = media;
        }

        public long getLikeCount() {
            return likeCount;
        }

        public void setLikeCount(long likeCount) {
            this.likeCount = likeCount;
        }

        public boolean getLikedByCurrentUser() {
            return likedByCurrentUser;
        }

        public void setLikedByCurrentUser(boolean likedByCurrentUser) {
            this.likedByCurrentUser = likedByCurrentUser;
        }

        public boolean getVerifiedPurchase() {
            return verifiedPurchase;
        }

        public void setVerifiedPurchase(boolean verifiedPurchase) {
            this.verifiedPurchase = verifiedPurchase;
        }
    }

    public static class Distribution {
        private int rating;
        private long count;
        private double percentage;

        public Distribution() {}

        public Distribution(int rating, long count, double percentage) {
            this.rating = rating;
            this.count = count;
            this.percentage = percentage;
        }

        public int getRating() {
            return rating;
        }

        public void setRating(int rating) {
            this.rating = rating;
        }

        public long getCount() {
            return count;
        }

        public void setCount(long count) {
            this.count = count;
        }

        public double getPercentage() {
            return percentage;
        }

        public void setPercentage(double percentage) {
            this.percentage = percentage;
        }
    }

    public static class Summary {
        private int productId;
        private double averageRating;
        private long totalReviews;
        private List<Distribution> distribution;

        public Summary() {}

        public Summary(
                int productId,
                double averageRating,
                long totalReviews,
                List<Distribution> distribution) {
            this.productId = productId;
            this.averageRating = averageRating;
            this.totalReviews = totalReviews;
            this.distribution = distribution;
        }

        public int getProductId() {
            return productId;
        }

        public void setProductId(int productId) {
            this.productId = productId;
        }

        public double getAverageRating() {
            return averageRating;
        }

        public void setAverageRating(double averageRating) {
            this.averageRating = averageRating;
        }

        public long getTotalReviews() {
            return totalReviews;
        }

        public void setTotalReviews(long totalReviews) {
            this.totalReviews = totalReviews;
        }

        public List<Distribution> getDistribution() {
            return distribution;
        }

        public void setDistribution(List<Distribution> distribution) {
            this.distribution = distribution;
        }
    }

    public static class PageResponse {
        private List<Response> items;
        private int page;
        private int size;
        private long totalItems;
        private int totalPages;
        private Summary summary;

        public PageResponse() {}

        public PageResponse(
                List<Response> items,
                int page,
                int size,
                long totalItems,
                int totalPages,
                Summary summary) {
            this.items = items;
            this.page = page;
            this.size = size;
            this.totalItems = totalItems;
            this.totalPages = totalPages;
            this.summary = summary;
        }

        public List<Response> getItems() {
            return items;
        }

        public void setItems(List<Response> items) {
            this.items = items;
        }

        public int getPage() {
            return page;
        }

        public void setPage(int page) {
            this.page = page;
        }

        public int getSize() {
            return size;
        }

        public void setSize(int size) {
            this.size = size;
        }

        public long getTotalItems() {
            return totalItems;
        }

        public void setTotalItems(long totalItems) {
            this.totalItems = totalItems;
        }

        public int getTotalPages() {
            return totalPages;
        }

        public void setTotalPages(int totalPages) {
            this.totalPages = totalPages;
        }

        public Summary getSummary() {
            return summary;
        }

        public void setSummary(Summary summary) {
            this.summary = summary;
        }
    }
}
