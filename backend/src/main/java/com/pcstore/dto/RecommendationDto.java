package com.pcstore.dto;

import java.math.BigDecimal;
import java.util.List;

public final class RecommendationDto {
    private RecommendationDto() {}
    public record Answers(BigDecimal pcBudget, List<String> purposes, String purposeNotes,
            String softwareText, String gamesText, String targetResolution, Integer targetFps,
            int minStorageGb) {}
    public record Threshold(String componentType, String field, int minimum, int preferred) {}
    public record Criteria(List<Threshold> thresholds, List<String> assumptions) {}
    public record SearchResult(List<BuilderCatalogDto.Product> products, BigDecimal total,
            String level, boolean limited, long visitedNodes) {}
    public record Result(BuildDto.Response build, List<BuilderCatalogDto.Product> products,
            BigDecimal estimatedTotal, String level, boolean searchLimited, long visitedNodes, String reason) {}
    public record Response(int requestId, String status, Answers answers, Criteria criteria,
            String failureCode, String failureReason, Result result) {}
}
