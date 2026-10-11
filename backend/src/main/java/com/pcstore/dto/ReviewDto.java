package com.pcstore.dto;

import java.util.List;
import java.util.UUID;

public final class ReviewDto {
    private ReviewDto() { }

    public enum Sort { NEWEST, OLDEST, RATING_DESC, RATING_ASC, HELPFUL }

    public record CreateRequest(Integer orderItemId, Integer productId, Integer rating,
                                String content, List<UUID> mediaIds) { }
    public record UpdateRequest(Integer rating, String content, List<UUID> mediaIds) { }
    public record Author(int userId, String fullName) { }
    public record Media(UUID mediaId, String mediaType, String mimeType, long sizeBytes,
                        Integer durationSecond, int sortOrder, String contentUrl) { }
    public record Response(int reviewId, int orderItemId, int orderId, int productId,
                           String productName, Author author, int rating, String content,
                           String status, List<Media> media, long likeCount,
                           boolean likedByCurrentUser, boolean verifiedPurchase) { }
    public record Distribution(int rating, long count, double percentage) { }
    public record Summary(int productId, double averageRating, long totalReviews,
                          List<Distribution> distribution) { }
    public record PageResponse(List<Response> items, int page, int size, long totalItems,
                               int totalPages, Summary summary) { }
}
