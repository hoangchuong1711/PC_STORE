package com.pcstore.dao;

import com.pcstore.entity.enums.ComponentType;
import com.pcstore.exception.ValidationException;
import com.pcstore.service.ProductSpecSchema;
import com.pcstore.service.ProductSpecSchema.Definition;
import com.pcstore.service.ProductSpecSchema.Field;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Only trusted schema definitions contribute SQL identifiers; values are always bound. */
public class ProductSpecDao {
    private final EntityManager em;

    public ProductSpecDao(EntityManager em) { this.em = em; }

    public Map<String, Object> find(int productId, ComponentType type) {
        Definition definition = ProductSpecSchema.forType(type);
        if (definition == null) return null;
        String columns = definition.fields().stream().map(Field::column).collect(Collectors.joining(", "));
        List<?> rows = em.createNativeQuery("SELECT " + columns + " FROM " + definition.table()
                + " WHERE product_id = :productId").setParameter("productId", productId).getResultList();
        if (rows.isEmpty()) return null;
        Object[] values = rows.getFirst() instanceof Object[] array ? array : new Object[]{rows.getFirst()};
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < definition.fields().size(); index++) {
            if (values[index] != null) result.put(definition.fields().get(index).key(), values[index]);
        }
        if (definition.supportKey() != null) {
            List<?> codes = em.createNativeQuery("SELECT " + definition.supportCodeColumn() + " FROM "
                    + definition.supportTable() + " WHERE " + definition.supportProductColumn()
                    + " = :productId ORDER BY " + definition.supportCodeColumn())
                    .setParameter("productId", productId).getResultList();
            result.put(definition.supportKey(), new ArrayList<>(codes));
        }
        return result;
    }

    public void replace(int productId, ComponentType oldType, ComponentType newType, Map<String, Object> spec) {
        if (oldType != null) {
            Definition old = ProductSpecSchema.forType(oldType);
            em.createNativeQuery("DELETE FROM " + old.table() + " WHERE product_id = :productId")
                    .setParameter("productId", productId).executeUpdate();
        }
        Definition definition = ProductSpecSchema.forType(newType);
        validateReferences(definition, spec);
        List<Field> fields = definition.fields();
        String columns = fields.stream().map(Field::column).collect(Collectors.joining(", "));
        String placeholders = fields.stream().map(field -> ":" + field.key()).collect(Collectors.joining(", "));
        Query insert = em.createNativeQuery("INSERT INTO " + definition.table() + " (product_id, " + columns
                + ") VALUES (:productId, " + placeholders + ")").setParameter("productId", productId);
        fields.forEach(field -> insert.setParameter(field.key(), spec.get(field.key())));
        insert.executeUpdate();
        if (definition.supportKey() != null) {
            @SuppressWarnings("unchecked") List<String> codes = (List<String>) spec.get(definition.supportKey());
            for (String code : codes) {
                em.createNativeQuery("INSERT INTO " + definition.supportTable() + " ("
                        + definition.supportProductColumn() + ", " + definition.supportCodeColumn()
                        + ") VALUES (:productId, :code)")
                        .setParameter("productId", productId).setParameter("code", code).executeUpdate();
            }
        }
    }

    public void delete(int productId, ComponentType type) {
        Definition definition = ProductSpecSchema.forType(type);
        if (definition != null) em.createNativeQuery("DELETE FROM " + definition.table()
                + " WHERE product_id = :productId").setParameter("productId", productId).executeUpdate();
    }

    private void validateReferences(Definition definition, Map<String, Object> spec) {
        if (spec.containsKey("socketCode")) checkCode("sockets", "socket_code", (String) spec.get("socketCode"));
        if (spec.containsKey("formFactorCode"))
            checkCode("form_factors", "form_factor_code", (String) spec.get("formFactorCode"));
        if (definition.supportKey() != null) {
            @SuppressWarnings("unchecked") List<String> codes = (List<String>) spec.get(definition.supportKey());
            codes.forEach(code -> checkCode(definition.lookupTable(), definition.lookupCodeColumn(), code));
        }
    }

    private void checkCode(String table, String column, String code) {
        List<?> rows = em.createNativeQuery("SELECT 1 FROM " + table + " WHERE " + column + " = :code")
                .setParameter("code", code).setMaxResults(1).getResultList();
        if (rows.isEmpty()) throw new ValidationException("Mã " + code + " chưa có trong danh mục chuẩn " + table + ".");
    }
}
