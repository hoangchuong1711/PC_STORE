package com.pcstore.dto;

import com.pcstore.entity.enums.ComponentType;

import java.util.List;
import java.util.Map;

public final class CompatibilityDto {
    private CompatibilityDto() {}

    public enum Status { PASS, FAIL, UNKNOWN }

    public record Selection(int productId, int quantity) {}

    public record Part(ComponentType type, int quantity, Map<String, Object> spec,
                       Map<String, List<String>> support) {}

    public record RuleResult(String id, Status status, String reason) {}

    public record Report(Status status, List<RuleResult> rules) {}
}
