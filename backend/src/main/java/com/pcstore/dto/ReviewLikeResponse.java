package com.pcstore.dto;

public record ReviewLikeResponse(int reviewId, long likesCount, boolean isLiked) { }
