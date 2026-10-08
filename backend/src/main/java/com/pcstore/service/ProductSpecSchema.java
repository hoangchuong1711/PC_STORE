package com.pcstore.service;

import com.pcstore.entity.enums.ComponentType;
import com.pcstore.exception.ValidationException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Fixed, trusted column definitions shared by validation and persistence. */
public final class ProductSpecSchema {
    public record Field(String key, String column, Kind kind, double minimum, boolean optional) {}
    public enum Kind { TEXT, INTEGER, DECIMAL }
    public record Definition(String table, List<Field> fields, String supportKey, String supportTable,
                             String supportProductColumn, String supportCodeColumn, String lookupTable,
                             String lookupCodeColumn) {}

    private static final Map<ComponentType, Definition> DEFINITIONS = new EnumMap<>(ComponentType.class);

    static {
        define(ComponentType.CPU, "cpu_specs", fields(
                text("socketCode", "socket_code"), integer("cores", "cores", 1),
                integer("threads", "threads", 1), decimal("baseClockGhz", "base_clock_ghz", 0),
                decimal("boostClockGhz", "boost_clock_ghz", 0), integer("tdpWatts", "tdp_watts", 0)));
        define(ComponentType.MOTHERBOARD, "motherboard_specs", fields(
                text("socketCode", "socket_code"), text("chipset", "chipset"),
                text("ramType", "ram_type"), text("pcieVersion", "pcie_version"),
                text("formFactorCode", "form_factor_code"), integer("ramSlots", "ram_slots", 1),
                integer("maxRamGb", "max_ram_gb", 1)));
        define(ComponentType.RAM, "ram_specs", fields(text("ramType", "ram_type"),
                integer("capacityGb", "capacity_gb", 1), integer("speedMhz", "speed_mhz", 1),
                integer("moduleCount", "module_count", 1)));
        define(ComponentType.GPU, "gpu_specs", fields(integer("vramGb", "vram_gb", 1),
                text("memoryType", "memory_type"), text("interfaceType", "interface_type"),
                integer("lengthMm", "length_mm", 1), integer("powerConsumptionW", "power_consumption_w", 0),
                integer("recommendedPsuW", "recommended_psu_w", 1)));
        define(ComponentType.STORAGE, "storage_specs", fields(text("storageType", "storage_type"),
                text("interfaceType", "interface_type"), integer("capacityGb", "capacity_gb", 1),
                integer("readSpeedMBps", "read_speed_mbps", 0), integer("writeSpeedMBps", "write_speed_mbps", 0)));
        define(ComponentType.PSU, "psu_specs", fields(integer("wattage", "wattage", 1),
                text("efficiencyRating", "efficiency_rating"), text("modularType", "modular_type")));
        define(ComponentType.CASE, "case_specs", fields(integer("maxGpuLengthMm", "max_gpu_length_mm", 1),
                integer("maxCoolerHeightMm", "max_cooler_height_mm", 1),
                integer("maxRadiatorSizeMm", "max_radiator_size_mm", 0)),
                "supportedFormFactors", "case_supported_form_factors", "case_product_id",
                "form_factor_code", "form_factors", "form_factor_code");
        define(ComponentType.COOLER, "cooler_specs", fields(text("coolerType", "cooler_type"),
                integer("maxTdpW", "max_tdp_w", 1), optionalInteger("heightMm", "height_mm", 1),
                optionalInteger("radiatorSizeMm", "radiator_size_mm", 1)),
                "supportedSockets", "cooler_supported_sockets", "cooler_product_id",
                "socket_code", "sockets", "socket_code");
    }

    private ProductSpecSchema() {}

    public static Definition forType(ComponentType type) { return DEFINITIONS.get(type); }

    public static Map<String, Object> validate(ComponentType type, Map<String, Object> input) {
        Definition definition = forType(type);
        if (definition == null) throw new ValidationException("Danh mục này không hỗ trợ thông số linh kiện.");
        if (input == null || input.isEmpty()) throw new ValidationException("Thông số linh kiện không được để trống.");
        Set<String> allowed = new java.util.HashSet<>();
        definition.fields().forEach(field -> allowed.add(field.key()));
        if (definition.supportKey() != null) allowed.add(definition.supportKey());
        for (String key : input.keySet()) {
            if (!allowed.contains(key)) throw new ValidationException("Thông số không thuộc loại linh kiện này: " + key);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Field field : definition.fields()) {
            Object value = input.get(field.key());
            if (value == null && field.optional()) continue;
            if (field.kind() == Kind.TEXT) {
                if (!(value instanceof String text) || text.trim().isEmpty() || text.trim().length() >
                        (field.key().equals("socketCode") || field.key().equals("formFactorCode") ? 32 : 255)) {
                    throw new ValidationException("Thông số " + field.key() + " không hợp lệ.");
                }
                result.put(field.key(), text.trim());
            } else {
                BigDecimal number;
                try { number = value instanceof Number ? new BigDecimal(value.toString()) : null; }
                catch (NumberFormatException exception) { number = null; }
                if (number == null || number.compareTo(BigDecimal.valueOf(field.minimum())) < 0
                        || (field.minimum() == 0 && field.kind() == Kind.DECIMAL && number.signum() == 0)) {
                    throw new ValidationException("Thông số " + field.key() + " không hợp lệ.");
                }
                try {
                    if (field.kind() == Kind.INTEGER) result.put(field.key(), number.intValueExact());
                    else result.put(field.key(), number.doubleValue());
                } catch (ArithmeticException exception) {
                    throw new ValidationException("Thông số " + field.key() + " phải là số nguyên hợp lệ.");
                }
                if (field.kind() == Kind.DECIMAL && !Double.isFinite((Double) result.get(field.key()))) {
                    throw new ValidationException("Thông số " + field.key() + " không hợp lệ.");
                }
            }
        }
        if (type == ComponentType.CPU) {
            if ((int) result.get("threads") < (int) result.get("cores")
                    || (double) result.get("boostClockGhz") < (double) result.get("baseClockGhz")) {
                throw new ValidationException("Số luồng và xung boost của CPU không hợp lệ.");
            }
        }
        if (type == ComponentType.COOLER) {
            String coolerType = ((String) result.get("coolerType")).toUpperCase();
            if (!(coolerType.equals("AIR") || coolerType.equals("AIO") || coolerType.equals("LIQUID"))) {
                throw new ValidationException("Loại tản nhiệt phải là AIR, AIO hoặc LIQUID.");
            }
            if (coolerType.equals("AIR") && !result.containsKey("heightMm"))
                throw new ValidationException("Tản nhiệt khí cần chiều cao.");
            if (!coolerType.equals("AIR") && !result.containsKey("radiatorSizeMm"))
                throw new ValidationException("Tản nhiệt nước cần kích thước radiator.");
            result.put("coolerType", coolerType);
        }
        if (definition.supportKey() != null) {
            Object raw = input.get(definition.supportKey());
            if (!(raw instanceof List<?> list) || list.isEmpty())
                throw new ValidationException("Danh sách " + definition.supportKey() + " là bắt buộc.");
            List<String> codes = new ArrayList<>();
            for (Object entry : list) {
                if (!(entry instanceof String code) || code.trim().isEmpty() || code.trim().length() > 32)
                    throw new ValidationException("Mã hỗ trợ không hợp lệ.");
                String cleaned = code.trim();
                if (codes.contains(cleaned)) throw new ValidationException("Mã hỗ trợ bị trùng.");
                codes.add(cleaned);
            }
            result.put(definition.supportKey(), codes);
        }
        return result;
    }

    private static List<Field> fields(Field... fields) { return List.of(fields); }
    private static Field text(String key, String column) { return new Field(key, column, Kind.TEXT, 0, false); }
    private static Field integer(String key, String column, double min) { return new Field(key, column, Kind.INTEGER, min, false); }
    private static Field optionalInteger(String key, String column, double min) { return new Field(key, column, Kind.INTEGER, min, true); }
    private static Field decimal(String key, String column, double min) { return new Field(key, column, Kind.DECIMAL, min, false); }
    private static void define(ComponentType type, String table, List<Field> fields) {
        DEFINITIONS.put(type, new Definition(table, fields, null, null, null, null, null, null));
    }
    private static void define(ComponentType type, String table, List<Field> fields, String key,
                               String supportTable, String productColumn, String codeColumn,
                               String lookupTable, String lookupCodeColumn) {
        DEFINITIONS.put(type, new Definition(table, fields, key, supportTable, productColumn,
                codeColumn, lookupTable, lookupCodeColumn));
    }
}
