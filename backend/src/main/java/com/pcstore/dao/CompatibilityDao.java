package com.pcstore.dao;

import com.pcstore.dto.CompatibilityDto.Part;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.entity.Product;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.ValidationException;
import jakarta.persistence.EntityManager;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Reads Builder spec tables through JPA without exposing Product entities to callers. */
public class CompatibilityDao {
    private final EntityManager em;

    public CompatibilityDao(EntityManager em) { this.em = em; }

    public Part findPart(Selection selection) {
        Product product = em.find(Product.class, selection.productId());
        if (product == null) throw new ResourceNotFoundException("Không tìm thấy sản phẩm trong build");
        ComponentType type = product.getCategory().getComponentType();
        if (type == null) throw new ValidationException("Sản phẩm không thuộc nhóm linh kiện Builder");

        Map<String, Object> spec = spec(type, selection.productId());
        Map<String, List<String>> support = new HashMap<>();
        if (type == ComponentType.CASE) {
            support.put("supportedFormFactorCodes", codes("case_supported_form_factors", "case_product_id", "form_factor_code", selection.productId()));
        } else if (type == ComponentType.COOLER) {
            support.put("supportedSocketCodes", codes("cooler_supported_sockets", "cooler_product_id", "socket_code", selection.productId()));
        }
        return new Part(type, selection.quantity(), spec, support);
    }

    private Map<String, Object> spec(ComponentType type, int productId) {
        SpecQuery query = switch (type) {
            case CPU -> new SpecQuery("cpu_specs", new String[]{"socket_code"}, new String[]{"socketCode"});
            case MOTHERBOARD -> new SpecQuery("motherboard_specs",
                    new String[]{"socket_code", "ram_type", "form_factor_code", "ram_slots", "max_ram_gb"},
                    new String[]{"socketCode", "ramType", "formFactorCode", "ramSlots", "maxRamGb"});
            case RAM -> new SpecQuery("ram_specs", new String[]{"ram_type", "capacity_gb", "module_count"},
                    new String[]{"ramType", "capacityGb", "moduleCount"});
            case GPU -> new SpecQuery("gpu_specs", new String[]{"length_mm", "recommended_psu_w"},
                    new String[]{"lengthMm", "recommendedPsuW"});
            case STORAGE -> new SpecQuery("storage_specs", new String[]{"storage_type"}, new String[]{"storageType"});
            case PSU -> new SpecQuery("psu_specs", new String[]{"wattage"}, new String[]{"wattage"});
            case CASE -> new SpecQuery("case_specs", new String[]{"max_gpu_length_mm", "max_cooler_height_mm"},
                    new String[]{"maxGpuLengthMm", "maxCoolerHeightMm"});
            case COOLER -> new SpecQuery("cooler_specs", new String[]{"cooler_type", "height_mm"},
                    new String[]{"coolerType", "heightMm"});
        };
        List<?> rows = em.createNativeQuery("SELECT " + String.join(",", query.columns()) + " FROM " + query.table()
                + " WHERE product_id=:id").setParameter("id", productId).getResultList();
        if (rows.isEmpty()) return Map.of();
        Object row = rows.getFirst();
        Object[] values = row instanceof Object[] array ? array : new Object[]{row};
        Map<String, Object> result = new HashMap<>();
        for (int i = 0; i < query.fields().length; i++) {
            if (values[i] != null) result.put(query.fields()[i], values[i]);
        }
        return result;
    }

    private List<String> codes(String table, String idColumn, String codeColumn, int productId) {
        return em.createNativeQuery("SELECT " + codeColumn + " FROM " + table + " WHERE " + idColumn + "=:id")
                .setParameter("id", productId).getResultStream().map(String::valueOf).toList();
    }

    private record SpecQuery(String table, String[] columns, String[] fields) {}
}
