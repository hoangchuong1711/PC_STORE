package com.pcstore.util;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public final class JsonUtil {
    private static final ObjectMapper MAPPER = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private JsonUtil() { }

    // đọc dữ liệu JSON từ HttpServletRequest và chuyển đổi thành đối tượng Java
    public static <T> T read(HttpServletRequest request, Class<T> type) throws IOException {
        return MAPPER.readValue(request.getInputStream(), type);
    }

    // ghi dữ liệu Java dưới dạng JSON vào HttpServletResponse
    public static void write(HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        MAPPER.writeValue(response.getWriter(), body);
    }
}
