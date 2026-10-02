package com.pcstore.controller;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.CategoryDao;
import com.pcstore.dto.CategoryResponse;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
@WebServlet(name="categoryServlet", urlPatterns="/api/categories")
public class CategoryServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();
    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setContentType("application/json"); res.setCharacterEncoding("UTF-8");
        try (var em = PersistenceManager.get().createEntityManager()) {
            var result = new CategoryDao(em).findActive().stream().map(c -> new CategoryResponse(c.getCategoryId(), c.getName(), c.getDescription(), c.getComponentType() == null ? null : c.getComponentType().name())).toList();
            mapper.writeValue(res.getWriter(), result);
        }
    }
}
