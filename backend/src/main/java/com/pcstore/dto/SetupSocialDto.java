package com.pcstore.dto;

import java.time.LocalDateTime;

public final class SetupSocialDto {
    private SetupSocialDto() { }
    public record Like(int postId, long likeCount, boolean liked) { }
    public record Ranked(SetupDto.Response post, long likeCount, boolean liked) { }
    public record ModerationRequest(String status, String reason) { }
    public record Moderated(SetupDto.Response post, long likeCount, String moderationReason,
                            Integer moderatedBy, LocalDateTime moderatedAt) { }
}
