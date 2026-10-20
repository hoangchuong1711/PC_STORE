package com.pcstore.service;

import com.pcstore.dto.CompatibilityDto.Part;
import com.pcstore.dto.CompatibilityDto.Report;
import com.pcstore.dto.CompatibilityDto.RuleResult;
import com.pcstore.dto.CompatibilityDto.Status;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.exception.ValidationException;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Basic, explicitly bounded Builder checks. Missing evidence always remains UNKNOWN. */
public final class CompatibilityRules {
    private static final Set<ComponentType> MULTIPLE_ALLOWED = Set.of(ComponentType.RAM, ComponentType.STORAGE);

    private CompatibilityRules() {}

    public static Report evaluate(List<Part> parts) {
        if (parts == null) throw new ValidationException("Danh sách linh kiện là bắt buộc");
        Map<ComponentType, List<Part>> byType = new EnumMap<>(ComponentType.class);
        for (Part part : parts) {
            if (part == null || part.type() == null || part.quantity() <= 0) {
                throw new ValidationException("Loại linh kiện và số lượng phải hợp lệ");
            }
            if (!MULTIPLE_ALLOWED.contains(part.type()) && part.quantity() != 1) {
                throw new ValidationException("Nhóm " + part.type() + " chỉ nhận một sản phẩm");
            }
            byType.computeIfAbsent(part.type(), ignored -> new ArrayList<>()).add(part);
            if (!MULTIPLE_ALLOWED.contains(part.type()) && byType.get(part.type()).size() > 1) {
                throw new ValidationException("Build có nhiều linh kiện ở nhóm " + part.type());
            }
        }

        Part cpu = one(byType, ComponentType.CPU);
        Part main = one(byType, ComponentType.MOTHERBOARD);
        Part gpu = one(byType, ComponentType.GPU);
        Part psu = one(byType, ComponentType.PSU);
        Part pcCase = one(byType, ComponentType.CASE);
        Part cooler = one(byType, ComponentType.COOLER);
        List<Part> ram = byType.getOrDefault(ComponentType.RAM, List.of());

        List<RuleResult> rules = new ArrayList<>();
        boolean complete = byType.keySet().containsAll(Set.of(ComponentType.values()))
                && parts.stream().allMatch(part -> part.spec() != null && !part.spec().isEmpty());
        rules.add(rule("build_completeness", complete ? Status.PASS : Status.UNKNOWN,
                "Đã chọn đủ 8 nhóm linh kiện có thông số", "Build thiếu linh kiện hoặc dòng thông số"));
        rules.add(equal("cpu_main_socket", string(cpu, "socketCode"), string(main, "socketCode"), "Socket CPU và main"));
        rules.add(in("cpu_cooler_socket", string(cpu, "socketCode"), codes(cooler, "supportedSocketCodes"), "Socket CPU và tản nhiệt"));
        rules.add(ramType(ram, main));
        rules.add(ramTotal("ram_slots", ram, main, "moduleCount", "ramSlots", "Số thanh RAM"));
        rules.add(ramTotal("ram_capacity", ram, main, "capacityGb", "maxRamGb", "Dung lượng RAM"));
        rules.add(in("main_case_form_factor", string(main, "formFactorCode"),
                codes(pcCase, "supportedFormFactorCodes"), "Kích thước main và case"));
        rules.add(atMost("gpu_case_length", integer(gpu, "lengthMm"), integer(pcCase, "maxGpuLengthMm"), "Chiều dài GPU"));
        rules.add(coolerHeight(cooler, pcCase));
        rules.add(atLeast("psu_gpu_wattage", integer(psu, "wattage"), integer(gpu, "recommendedPsuW"), "Công suất PSU"));

        Status overall = rules.stream().anyMatch(r -> r.status() == Status.FAIL) ? Status.FAIL
                : rules.stream().anyMatch(r -> r.status() == Status.UNKNOWN) ? Status.UNKNOWN : Status.PASS;
        return new Report(overall, List.copyOf(rules));
    }

    private static Part one(Map<ComponentType, List<Part>> byType, ComponentType type) {
        List<Part> found = byType.get(type);
        return found == null || found.isEmpty() ? null : found.getFirst();
    }

    private static Object field(Part part, String name) {
        return part == null || part.spec() == null ? null : part.spec().get(name);
    }

    private static String string(Part part, String name) {
        Object value = field(part, name);
        return value instanceof String text && !text.isBlank() ? text : null;
    }

    private static Integer integer(Part part, String name) {
        Object value = field(part, name);
        return value instanceof Number number ? number.intValue() : null;
    }

    private static List<String> codes(Part part, String name) {
        List<String> values = part == null || part.support() == null ? null : part.support().get(name);
        return values == null || values.isEmpty() ? null : values;
    }

    private static RuleResult rule(String id, Status status, String pass, String other) {
        return new RuleResult(id, status, status == Status.PASS ? pass : other);
    }

    private static RuleResult equal(String id, String left, String right, String label) {
        if (left == null || right == null) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu thông số");
        Status result = left.equals(right) ? Status.PASS : Status.FAIL;
        return new RuleResult(id, result, label + ": " + left + (result == Status.PASS ? " khớp " : " không khớp ") + right);
    }

    private static RuleResult in(String id, String value, List<String> allowed, String label) {
        if (value == null || allowed == null) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu thông số hỗ trợ");
        Status result = allowed.contains(value) ? Status.PASS : Status.FAIL;
        return new RuleResult(id, result, label + ": " + value + (result == Status.PASS ? " được hỗ trợ" : " không được hỗ trợ"));
    }

    private static RuleResult atMost(String id, Integer actual, Integer limit, String label) {
        if (actual == null || limit == null) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu kích thước");
        Status result = actual <= limit ? Status.PASS : Status.FAIL;
        return new RuleResult(id, result, label + ": " + actual + " mm / giới hạn " + limit + " mm");
    }

    private static RuleResult atLeast(String id, Integer actual, Integer minimum, String label) {
        if (actual == null || minimum == null) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu công suất");
        Status result = actual >= minimum ? Status.PASS : Status.FAIL;
        return new RuleResult(id, result, label + ": " + actual + " W / tối thiểu " + minimum + " W");
    }

    private static RuleResult ramType(List<Part> ram, Part main) {
        String expected = string(main, "ramType");
        if (expected == null || ram.isEmpty()) return new RuleResult("ram_type", Status.UNKNOWN, "Thiếu loại RAM hoặc main");
        boolean unknown = false;
        for (Part kit : ram) {
            String actual = string(kit, "ramType");
            if (actual == null) unknown = true;
            else if (!actual.equals(expected)) return new RuleResult("ram_type", Status.FAIL, "RAM " + actual + " không khớp main " + expected);
        }
        return unknown ? new RuleResult("ram_type", Status.UNKNOWN, "Thiếu loại RAM của một kit")
                : new RuleResult("ram_type", Status.PASS, "Tất cả kit RAM khớp " + expected);
    }

    private static RuleResult ramTotal(String id, List<Part> ram, Part main, String perKitField, String limitField, String label) {
        Integer limit = integer(main, limitField);
        if (limit == null || ram.isEmpty()) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu dữ liệu RAM hoặc main");
        long total = 0;
        boolean unknown = false;
        for (Part kit : ram) {
            Integer perKit = integer(kit, perKitField);
            if (perKit == null) {
                unknown = true;
                continue;
            }
            total += (long) kit.quantity() * perKit;
            if (total > limit) return new RuleResult(id, Status.FAIL, label + ": đã vượt giới hạn " + limit);
        }
        if (unknown) return new RuleResult(id, Status.UNKNOWN, label + ": thiếu thông số của một kit");
        return new RuleResult(id, Status.PASS, label + ": " + total + " / giới hạn " + limit);
    }

    private static RuleResult coolerHeight(Part cooler, Part pcCase) {
        String type = string(cooler, "coolerType");
        if (type == null) return new RuleResult("cooler_case_height", Status.UNKNOWN, "Thiếu loại tản nhiệt");
        if (!type.equals("AIR")) return new RuleResult("cooler_case_height", Status.UNKNOWN,
                "Chưa kiểm tra vị trí lắp radiator của tản nhiệt " + type);
        return atMost("cooler_case_height", integer(cooler, "heightMm"), integer(pcCase, "maxCoolerHeightMm"), "Chiều cao tản nhiệt");
    }
}
