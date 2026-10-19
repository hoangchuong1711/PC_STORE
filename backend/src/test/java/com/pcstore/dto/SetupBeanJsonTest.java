package com.pcstore.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SetupBeanJsonTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void eligibilityAndLikeKeepTheirOriginalJsonNames() throws Exception {
        assertEquals(json.readTree("{\"eligible\":false,\"reason\":\"SETUP_PURCHASE_REQUIRED\"}"),
                wireJson(new SetupDto.Eligibility(false, "SETUP_PURCHASE_REQUIRED")));
        assertEquals(json.readTree("{\"postId\":9,\"likeCount\":2,\"liked\":true}"),
                wireJson(new SetupSocialDto.Like(9, 2, true)));
    }

    @Test
    void requestReadsProductAndMediaListsWithoutChangingTheirOrder() throws Exception {
        SetupDto.Request request = json.readValue(
                "{\"title\":\"Desk\",\"description\":\"My PC\",\"mediaIds\":[],\"productIds\":[3,1]}",
                SetupDto.Request.class);
        assertEquals("Desk", request.getTitle());
        assertEquals(java.util.List.of(3, 1), request.getProductIds());
        assertTrue(request.getMediaIds().isEmpty());
    }
    private com.fasterxml.jackson.databind.JsonNode wireJson(Object value) throws Exception {
        // So sánh JSON thật trên HTTP; valueToTree giữ riêng kiểu số int/long của Java.
        return json.readTree(json.writeValueAsString(value));
    }
}
