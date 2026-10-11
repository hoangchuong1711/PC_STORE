package com.pcstore.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public class AddressDto {
    public record Request(
            String recipientName,
            String phone,
            String label,
            String address,
            String addressDetail,
            Boolean isDefault
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Response(
            int addressId,
            String addressDetail,
            String recipientName,
            String phone,
            String label,
            String address,
            boolean isDefault
    ) {}
}
