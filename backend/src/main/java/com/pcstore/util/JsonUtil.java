package com.pcstore.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

public final class JsonUtil {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private JsonUtil() { }

    public static <T> T read(HttpServletRequest request, Class<T> type) throws IOException {
        return MAPPER.readValue(request.getInputStream(), type);
    }
    public static void write(HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        MAPPER.writeValue(response.getWriter(), body);
    }
}
