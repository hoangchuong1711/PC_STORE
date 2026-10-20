package com.pcstore.dto;

import com.pcstore.entity.enums.ActiveStatus;
import com.pcstore.entity.enums.ComponentType;

public final class AdminTaxonomyDto {
    private AdminTaxonomyDto() { }
    public record CategoryInput(String name, String description, ComponentType componentType, ActiveStatus status) { }
    public record BrandInput(String name, String description, String logoUrl, ActiveStatus status) { }
    public record StatusInput(ActiveStatus status) { }
    public record Entry(Integer id, String name, String description, ActiveStatus status,
                        ComponentType componentType, String logoUrl, long productCount) { }
}
