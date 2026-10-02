package com.pcstore.controller;
import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.BrandDao;
import com.pcstore.dto.BrandResponse;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet(name="brandServlet", urlPatterns="/api/brands")
public class BrandServlet extends HttpServlet {
    private final ObjectMapper mapper = new ObjectMapper();

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setContentType("application/json"); res.setCharacterEncoding("UTF-8");
        
        try (var em = PersistenceManager.get().createEntityManager()) {
            var result = new BrandDao(em).findActive().stream().map(b -> new BrandResponse(
                b.getBrandId(), b.getName(), b.getDescription(), b.getLogoUrl())).toList();
            mapper.writeValue(res.getWriter(), result);
        }
    }
}
