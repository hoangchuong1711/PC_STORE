package com.pcstore.docs;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import io.swagger.v3.parser.OpenAPIV3Parser;
import io.swagger.v3.parser.core.models.ParseOptions;

class OpenApiContractTest {
    @Test
    void publishedContractResolvesAndDescribesImplementedOperations() {
        Path spec = Path.of("src/main/webapp/api-docs/openapi.yaml");
        assertTrue(Files.isRegularFile(spec), "Published OpenAPI document is missing");
        ParseOptions options = new ParseOptions();
        options.setResolve(true);
        options.setResolveFully(true);
        var result = new OpenAPIV3Parser().readLocation(spec.toUri().toString(), null, options);
        assertNotNull(result.getOpenAPI(), () -> result.getMessages().toString());
        assertTrue(result.getMessages().isEmpty(), () -> result.getMessages().toString());
        var api = result.getOpenAPI();
        Set<String> operations = new HashSet<>();
        Set<String> ids = new HashSet<>();
        api.getPaths().forEach((path, item) -> item.readOperationsMap().forEach((method, op) -> {
            operations.add(method.name() + " " + path);
            assertNotNull(op.getOperationId());
            assertTrue(ids.add(op.getOperationId()), "Duplicate operationId");
            assertFalse(op.getResponses().isEmpty());
            if (path.startsWith("/api/admin/") || path.endsWith("/me") || path.endsWith("/logout")) {
                assertNotNull(op.getSecurity(), path);
                assertTrue(op.getSecurity().stream().anyMatch(s -> s.containsKey("sessionCookie")), path);
            }
        }));
        assertEquals(Set.of("POST /api/auth/register", "POST /api/auth/login", "POST /api/auth/logout",
                "GET /api/auth/me", "GET /api/products", "GET /api/products/{id}",
                "GET /api/categories", "GET /api/brands", "POST /api/admin/products",
                "PATCH /api/admin/products/{id}", "PATCH /api/admin/products/{id}/inventory"), operations);
        assertEquals("JSESSIONID", api.getComponents().getSecuritySchemes().get("sessionCookie").getName());
        assertEquals("cookie", api.getComponents().getSecuritySchemes().get("sessionCookie").getIn().toString());
    }
}
