package com.pcstore.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ReviewBeanJsonTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void likeKeepsIsLikedPropertyExpectedByFrontend() throws Exception {
        ReviewLikeResponse response = new ReviewLikeResponse(12, 3, true);
        assertEquals(json.readTree("{\"reviewId\":12,\"likesCount\":3,\"isLiked\":true}"),
                wireJson(response));
    }

    @Test
    void reviewResponseKeepsNestedAuthorAndBooleanPropertyNames() throws Exception {
        ReviewDto.Response response = new ReviewDto.Response(1, 2, 3, 4, "CPU",
                new ReviewDto.Author(5, "An"), 4, "Good", "PUBLISHED", List.of(), 6, true, true);
        String expected = """
                {"reviewId":1,"orderItemId":2,"orderId":3,"productId":4,"productName":"CPU",
                 "author":{"userId":5,"fullName":"An"},"rating":4,"content":"Good",
                 "status":"PUBLISHED","media":[],"likeCount":6,"likedByCurrentUser":true,
                 "verifiedPurchase":true}
                """;
        assertEquals(json.readTree(expected), wireJson(response));
    }

    @Test
    void omittedPatchFieldsRemainNullSoTheyDoNotOverwriteExistingValues() throws Exception {
        ReviewDto.UpdateRequest request = json.readValue("{\"content\":\"Updated\"}", ReviewDto.UpdateRequest.class);
        assertEquals("Updated", request.getContent());
        assertNull(request.getRating());
        assertNull(request.getMediaIds());
    }
    private com.fasterxml.jackson.databind.JsonNode wireJson(Object value) throws Exception {
        // So sánh JSON thật trên HTTP; valueToTree giữ riêng kiểu số int/long của Java.
        return json.readTree(json.writeValueAsString(value));
    }
}
