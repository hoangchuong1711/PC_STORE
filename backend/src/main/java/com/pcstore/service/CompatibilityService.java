package com.pcstore.service;

import com.pcstore.dao.CompatibilityDao;
import com.pcstore.dto.CompatibilityDto.Part;
import com.pcstore.dto.CompatibilityDto.Report;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.exception.ValidationException;
import jakarta.persistence.EntityManager;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Entry point for T24 to evaluate selected catalog products. */
public class CompatibilityService {
    private final CompatibilityDao parts;

    public CompatibilityService(EntityManager em) { this.parts = new CompatibilityDao(em); }

    public Report evaluate(List<Selection> selections) {
        if (selections == null) throw new ValidationException("Danh sách linh kiện là bắt buộc");
        Set<Integer> selectedIds = new HashSet<>();
        for (Selection item : selections) {
            if (item == null || item.productId() <= 0 || item.quantity() <= 0) {
                throw new ValidationException("Sản phẩm và số lượng phải hợp lệ");
            }
            if (!selectedIds.add(item.productId())) throw new ValidationException("Sản phẩm bị chọn trùng trong build");
        }
        List<Part> loaded = new ArrayList<>();
        for (Selection item : selections) {
            loaded.add(parts.findPart(item));
        }
        return CompatibilityRules.evaluate(loaded);
    }
}
