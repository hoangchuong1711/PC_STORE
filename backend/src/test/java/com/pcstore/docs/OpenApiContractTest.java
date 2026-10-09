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
            if (path.startsWith("/api/admin/") || path.startsWith("/api/customer/") || path.startsWith("/api/orders") || path.endsWith("/me") || path.endsWith("/logout")) {
                assertNotNull(op.getSecurity(), path);
                assertTrue(op.getSecurity().stream().anyMatch(s -> s.containsKey("sessionCookie")), path);
            }
        }));
        assertEquals(Set.of("GET /api/setups", "GET /api/setups/{id}", "GET /api/customer/setups/eligibility",
                "GET /api/customer/setups", "POST /api/customer/setups", "GET /api/customer/setups/{id}",
                "PUT /api/customer/setups/{id}", "DELETE /api/customer/setups/{id}",
                "POST /api/auth/register", "POST /api/auth/login", "POST /api/auth/logout",
                "GET /api/auth/me", "GET /api/products", "GET /api/products/{id}",
                "GET /api/builder/products", "POST /api/builder/compatibility",
                "GET /api/categories", "GET /api/brands", "POST /api/admin/products",
                "GET /api/admin/products/{id}", "PATCH /api/admin/products/{id}",
                "PATCH /api/admin/products/{id}/inventory",
                "GET /api/customer/cart", "POST /api/customer/cart/items",
                "PATCH /api/customer/cart/items/{id}", "DELETE /api/customer/cart/items/{id}",
                "GET /api/customer/builds", "POST /api/customer/builds",
                "GET /api/customer/builds/{id}", "PUT /api/customer/builds/{id}",
                "DELETE /api/customer/builds/{id}", "POST /api/customer/builds/{id}/cart",
                "POST /api/orders", "GET /api/orders", "GET /api/orders/{id}", "POST /api/orders/{id}/cancel",
                "POST /api/orders/{id}/payment/vnpay-url", "GET /api/payment/vnpay/ipn",
                "GET /api/admin/orders", "GET /api/admin/orders/{id}", "PUT /api/admin/orders/{id}/status",
                "POST /api/admin/orders/{id}/reconcile",
                "POST /api/customer/media/images", "POST /api/customer/media/videos",
                "GET /api/media/{mediaId}/content",
                "GET /api/admin/categories", "POST /api/admin/categories", "PUT /api/admin/categories/{id}", "PUT /api/admin/categories/{id}/status",
                "GET /api/admin/brands", "POST /api/admin/brands", "PUT /api/admin/brands/{id}", "PUT /api/admin/brands/{id}/status"), operations);
        assertEquals("JSESSIONID", api.getComponents().getSecuritySchemes().get("sessionCookie").getName());
        assertEquals("cookie", api.getComponents().getSecuritySchemes().get("sessionCookie").getIn().toString());
    }
}
