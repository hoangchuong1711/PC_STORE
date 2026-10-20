package com.pcstore.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class SetupDto {
    private SetupDto() { }
    public record Request(String title, String description, List<UUID> mediaIds, List<Integer> productIds) { }
    public record Product(int productId, String name) { }
    public record Response(int postId, int authorId, String title, String description, String status,
                           LocalDateTime createdAt, LocalDateTime updatedAt, List<UUID> mediaIds,
                           List<Product> products) { }
    public record Eligibility(boolean eligible, String reason) { }
}
