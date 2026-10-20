package com.pcstore.dto;

import java.time.LocalDateTime;

public class SetupSocialDto {
    private SetupSocialDto() {}

    public static class Like {
        private int postId;
        private long likeCount;
        private boolean liked;

        public Like() {}

        public Like(int postId, long likeCount, boolean liked) {
            this.postId = postId;
            this.likeCount = likeCount;
            this.liked = liked;
        }

        public int getPostId() {
            return postId;
        }

        public void setPostId(int postId) {
            this.postId = postId;
        }

        public long getLikeCount() {
            return likeCount;
        }

        public void setLikeCount(long likeCount) {
            this.likeCount = likeCount;
        }

        public boolean getLiked() {
            return liked;
        }

        public void setLiked(boolean liked) {
            this.liked = liked;
        }
    }

    public static class Ranked {
        private SetupDto.Response post;
        private long likeCount;
        private boolean liked;

        public Ranked() {}

        public Ranked(SetupDto.Response post, long likeCount, boolean liked) {
            this.post = post;
            this.likeCount = likeCount;
            this.liked = liked;
        }

        public SetupDto.Response getPost() {
            return post;
        }

        public void setPost(SetupDto.Response post) {
            this.post = post;
        }

        public long getLikeCount() {
            return likeCount;
        }

        public void setLikeCount(long likeCount) {
            this.likeCount = likeCount;
        }

        public boolean getLiked() {
            return liked;
        }

        public void setLiked(boolean liked) {
            this.liked = liked;
        }
    }

    public static class ModerationRequest {
        private String status;
        private String reason;

        public ModerationRequest() {}

        public ModerationRequest(String status, String reason) {
            this.status = status;
            this.reason = reason;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class Moderated {
        private SetupDto.Response post;
        private long likeCount;
        private String moderationReason;
        private Integer moderatedBy;
        private LocalDateTime moderatedAt;

        public Moderated() {}

        public Moderated(
                SetupDto.Response post,
                long likeCount,
                String moderationReason,
                Integer moderatedBy,
                LocalDateTime moderatedAt) {
            this.post = post;
            this.likeCount = likeCount;
            this.moderationReason = moderationReason;
            this.moderatedBy = moderatedBy;
            this.moderatedAt = moderatedAt;
        }

        public SetupDto.Response getPost() {
            return post;
        }

        public void setPost(SetupDto.Response post) {
            this.post = post;
        }

        public long getLikeCount() {
            return likeCount;
        }

        public void setLikeCount(long likeCount) {
            this.likeCount = likeCount;
        }

        public String getModerationReason() {
            return moderationReason;
        }

        public void setModerationReason(String moderationReason) {
            this.moderationReason = moderationReason;
        }

        public Integer getModeratedBy() {
            return moderatedBy;
        }

        public void setModeratedBy(Integer moderatedBy) {
            this.moderatedBy = moderatedBy;
        }

        public LocalDateTime getModeratedAt() {
            return moderatedAt;
        }

        public void setModeratedAt(LocalDateTime moderatedAt) {
            this.moderatedAt = moderatedAt;
        }
    }
}
