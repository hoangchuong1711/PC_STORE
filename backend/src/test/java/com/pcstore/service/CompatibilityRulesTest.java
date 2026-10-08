package com.pcstore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.pcstore.dto.CompatibilityDto.Part;
import com.pcstore.dto.CompatibilityDto.Status;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.exception.ValidationException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CompatibilityRulesTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Test void matchesEveryT22ExpectedResult() throws Exception {
        JsonNode catalog = JSON.readTree(Path.of("../docs/data/t09_catalog.json").toFile());
        JsonNode fixture = JSON.readTree(Path.of("../docs/data/t22_builder_cases.json").toFile());
        Map<String, JsonNode> products = new HashMap<>();
        for (JsonNode product : catalog.get("products")) products.put(product.get("catalogCode").asText(), product);
        Map<String, JsonNode> builds = new HashMap<>();
        for (JsonNode build : fixture.get("builds")) {
            builds.put(build.get("id").asText(), build);
            var report = CompatibilityRules.evaluate(parts(build.get("selection"), products, null, null));
            assertEquals(Status.PASS, report.status(), build.get("id").asText());
            for (var expected : iterable(build.get("expected").fields())) {
                var rule = report.rules().stream().filter(r -> r.id().equals(expected.getKey())).findFirst().orElseThrow();
                assertEquals(Status.valueOf(expected.getValue().asText()), rule.status(), build.get("id").asText() + ": " + rule.id());
                assertFalse(rule.reason().isBlank());
            }
        }
        for (JsonNode testCase : fixture.get("cases")) {
            JsonNode build = builds.get(testCase.get("baseBuild").asText());
            var report = CompatibilityRules.evaluate(parts(build.get("selection"), products,
                    testCase.get("replace"), testCase.get("overrides")));
            String id = testCase.get("rule").asText();
            var rule = report.rules().stream().filter(r -> r.id().equals(id)).findFirst().orElseThrow();
            assertEquals(Status.valueOf(testCase.get("expected").asText()), rule.status(), testCase.get("id").asText());
            assertFalse(rule.reason().isBlank());
        }
    }

    @Test void missingSpecRowCannotPassItsRules() {
        List<Part> parts = List.of(
                new Part(ComponentType.CPU, 1, Map.of(), Map.of()),
                new Part(ComponentType.MOTHERBOARD, 1, Map.of("socketCode", "AM4"), Map.of())
        );
        var report = CompatibilityRules.evaluate(parts);
        var socket = report.rules().stream().filter(r -> r.id().equals("cpu_main_socket")).findFirst().orElseThrow();
        assertEquals(Status.UNKNOWN, socket.status());
        assertEquals(Status.UNKNOWN, report.status());
    }

    @Test void missingStorageSpecCannotMakeACompleteBuildPass() throws Exception {
        JsonNode catalog = JSON.readTree(Path.of("../docs/data/t09_catalog.json").toFile());
        JsonNode fixture = JSON.readTree(Path.of("../docs/data/t22_builder_cases.json").toFile());
        Map<String, JsonNode> products = new HashMap<>();
        for (JsonNode product : catalog.get("products")) products.put(product.get("catalogCode").asText(), product);
        List<Part> selected = parts(fixture.get("builds").get(0).get("selection"), products, null, null);
        List<Part> missingStorageSpec = selected.stream().map(part -> part.type() == ComponentType.STORAGE
                ? new Part(part.type(), part.quantity(), Map.of(), part.support()) : part).toList();
        assertEquals(Status.UNKNOWN, CompatibilityRules.evaluate(missingStorageSpec).status());
    }

    @Test void knownRamOverflowFailsEvenWhenAnotherKitLacksSpecs() {
        List<Part> parts = List.of(
                new Part(ComponentType.MOTHERBOARD, 1, Map.of("ramSlots", 4, "maxRamGb", 128), Map.of()),
                new Part(ComponentType.RAM, 3, Map.of("moduleCount", 2, "capacityGb", 32), Map.of()),
                new Part(ComponentType.RAM, 1, Map.of(), Map.of())
        );
        var report = CompatibilityRules.evaluate(parts);
        var slots = report.rules().stream().filter(r -> r.id().equals("ram_slots")).findFirst().orElseThrow();
        assertEquals(Status.FAIL, slots.status());
    }

    @Test void rejectsMultipleUnitsOfSingleSlotComponent() {
        assertThrows(ValidationException.class, () -> CompatibilityRules.evaluate(List.of(
                new Part(ComponentType.CPU, 2, Map.of("socketCode", "AM4"), Map.of())
        )));
    }

    private static List<Part> parts(JsonNode selection, Map<String, JsonNode> catalog, JsonNode replace, JsonNode overrides) {
        Map<ComponentType, JsonNode> chosen = new EnumMap<>(ComponentType.class);
        selection.fields().forEachRemaining(entry -> chosen.put(ComponentType.valueOf(entry.getKey()), entry.getValue()));
        if (replace != null) replace.fields().forEachRemaining(entry -> chosen.put(ComponentType.valueOf(entry.getKey()), entry.getValue()));
        Map<ComponentType, JsonNode> productCopies = new EnumMap<>(ComponentType.class);
        chosen.forEach((type, item) -> productCopies.put(type, catalog.get(item.get("catalogCode").asText()).deepCopy()));
        if (overrides != null) overrides.fields().forEachRemaining(entry -> {
            String[] path = entry.getKey().split("\\.");
            ((com.fasterxml.jackson.databind.node.ObjectNode) productCopies.get(ComponentType.valueOf(path[0])).get(path[1]))
                    .set(path[2], entry.getValue() == null ? NullNode.instance : entry.getValue());
        });
        List<Part> parts = new ArrayList<>();
        chosen.forEach((type, item) -> {
            JsonNode product = productCopies.get(type);
            Map<String, Object> spec = JSON.convertValue(product.get("spec"), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            Map<String, List<String>> support = JSON.convertValue(product.path("support"), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            parts.add(new Part(type, item.get("quantity").asInt(), spec, support));
        });
        return parts;
    }

    private static <T> Iterable<T> iterable(java.util.Iterator<T> iterator) {
        return () -> iterator;
    }
}
