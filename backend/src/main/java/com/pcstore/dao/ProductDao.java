package com.pcstore.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.entity.Product;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

/**
 * ProductDao: Lớp Data Access Object chịu trách nhiệm truy vấn dữ liệu sản phẩm từ CSDL.
 * Tuân thủ mô hình MVC: Tách biệt hoàn toàn việc truy vấn CSDL khỏi Controller (Servlet) và Service.
 */
public class ProductDao {
    private final EntityManager em;

    public ProductDao(EntityManager em) {
        this.em = em;
    }

    /**
     * Tìm kiếm và lọc danh sách sản phẩm theo các tiêu chí (từ khóa, danh mục, hãng, khoảng giá, sắp xếp, phân trang).
     * Chỉ trả về các sản phẩm đang ACTIVE, danh mục và hãng ACTIVE, và kho còn hàng để bán.
     */
    public List<Product> search(ProductSearchQuery query) {
        // Xử lý mệnh đề ORDER BY theo lựa chọn sắp xếp của khách hàng
        String orderClause = " ORDER BY p.productId ASC";
        if (query.sort() != null) {
            String sortOption = query.sort().trim().toLowerCase();
            if ("price-low".equals(sortOption) || "price_asc".equals(sortOption) || "asc".equals(sortOption)) {
                // Sắp xếp giá từ thấp đến cao
                orderClause = " ORDER BY p.price ASC, p.productId ASC";
            } else if ("price-high".equals(sortOption) || "price_desc".equals(sortOption) || "desc".equals(sortOption)) {
                // Sắp xếp giá từ cao đến thấp
                orderClause = " ORDER BY p.price DESC, p.productId ASC";
            }
        }

        // Tạo câu truy vấn JPQL lấy dữ liệu sản phẩm
        String jpql = buildSearchJpql(query, false) + orderClause;
        TypedQuery<Product> typedQuery = em.createQuery(jpql, Product.class);

        // Gán tham số vào câu truy vấn (chống SQL Injection)
        bindQueryParams(typedQuery, query);

        // Phân trang bằng setFirstResult và setMaxResults của JPA:
        // - FirstResult: Bỏ qua (page * size) bản ghi đầu
        // - MaxResults: Lấy tối đa (size) bản ghi cho trang hiện tại
        int offset = query.page() * query.size();
        return typedQuery.setFirstResult(offset)
                         .setMaxResults(query.size())
                         .getResultList();
    }

    /**
     * Đếm tổng số sản phẩm thỏa mãn tiêu chí tìm kiếm/lọc để phục vụ tính toán số trang.
     */
    public long count(ProductSearchQuery query) {
        String jpql = buildSearchJpql(query, true);
        TypedQuery<Long> typedQuery = em.createQuery(jpql, Long.class);

        // Gán tham số tương tự như câu search
        bindQueryParams(typedQuery, query);

        return typedQuery.getSingleResult();
    }

    /**
     * Tìm chi tiết một sản phẩm công khai theo ID.
     * Điều kiện: Sản phẩm ACTIVE, Danh mục ACTIVE, Hãng ACTIVE và Tồn kho khả dụng > 0.
     */
    public Product findPublic(Integer productId) {
        String jpql = """
            SELECT DISTINCT p
            FROM Product p
            JOIN FETCH p.category c
            JOIN FETCH p.brand b
            JOIN Inventory i ON i.product = p
            WHERE p.productId = :id
              AND p.status = com.pcstore.entity.enums.ProductStatus.ACTIVE
              AND c.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE
              AND b.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE
              AND (i.quantityOnHand - i.reservedQuantity) > 0
            """;

        List<Product> results = em.createQuery(jpql, Product.class)
                .setParameter("id", productId)
                .getResultList();

        return results.isEmpty() ? null : results.getFirst();
    }

    /**
     * Lấy danh sách linh kiện máy tính hợp lệ phục vụ tính năng PC Builder (ráp máy).
     * Yêu cầu: Là linh kiện có componentType và còn hàng khả dụng.
     */
    public List<Product> findPublicBuilderProducts() {
        String jpql = """
            SELECT DISTINCT p
            FROM Product p
            JOIN FETCH p.category c
            JOIN FETCH p.brand b
            JOIN Inventory i ON i.product = p
            WHERE p.status = com.pcstore.entity.enums.ProductStatus.ACTIVE
              AND c.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE
              AND b.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE
              AND c.componentType IS NOT NULL
              AND (i.quantityOnHand - i.reservedQuantity) > 0
            ORDER BY p.productId ASC
            """;

        return em.createQuery(jpql, Product.class).getResultList();
    }

    /**
     * Tra cứu số lượng tồn kho khả dụng (Available Quantity =OnHand - Reserved) cho danh sách ID sản phẩm.
     * Trả về Map<ProductId, AvailableQuantity> phục vụ kiểm tra giỏ hàng và danh mục.
     */
    public Map<Integer, Integer> availableQuantities(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }

        String jpql = """
            SELECT i.product.productId, (i.quantityOnHand - i.reservedQuantity)
            FROM Inventory i
            WHERE i.product.productId IN :ids
            """;

        List<Object[]> rows = em.createQuery(jpql, Object[].class)
                .setParameter("ids", productIds)
                .getResultList();

        Map<Integer, Integer> quantities = new HashMap<>();
        for (Object[] row : rows) {
            Integer id = (Integer) row[0];
            int available = ((Number) row[1]).intValue();
            quantities.put(id, available);
        }
        return quantities;
    }

    /**
     * Hàm phụ trợ dựng câu lệnh JPQL tìm kiếm.
     * @param count true: Dựng câu đếm COUNT; false: Dựng câu SELECT danh sách Product
     */
    private String buildSearchJpql(ProductSearchQuery query, boolean count) {
        StringBuilder jpql = new StringBuilder();

        if (count) {
            jpql.append("SELECT COUNT(DISTINCT p.productId) ");
        } else {
            jpql.append("SELECT DISTINCT p ");
        }

        // Kết nối bảng: Product liên kết với Category, Brand và bảng Tồn kho Inventory
        jpql.append("FROM Product p ");
        jpql.append("JOIN p.category c ");
        jpql.append("JOIN p.brand b ");
        jpql.append("JOIN Inventory i ON i.product = p ");

        // Điều kiện nghiệp vụ bắt buộc: Chỉ lấy sản phẩm hợp lệ được phép bán ra thị trường
        jpql.append("WHERE p.status = com.pcstore.entity.enums.ProductStatus.ACTIVE ");
        jpql.append("  AND c.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE ");
        jpql.append("  AND b.status = com.pcstore.entity.enums.ActiveStatus.ACTIVE ");
        jpql.append("  AND (i.quantityOnHand - i.reservedQuantity) > 0 ");

        // Các điều kiện lọc động theo yêu cầu của khách hàng
        if (query.keyword() != null) {
            jpql.append("  AND LOWER(p.name) LIKE :keyword ");
        }
        if (query.categoryId() != null) {
            jpql.append("  AND c.categoryId = :categoryId ");
        }
        if (query.brandId() != null) {
            jpql.append("  AND b.brandId = :brandId ");
        }
        if (query.minPrice() != null) {
            jpql.append("  AND p.price >= :minPrice ");
        }
        if (query.maxPrice() != null) {
            jpql.append("  AND p.price <= :maxPrice ");
        }

        return jpql.toString();
    }

    /**
     * Gán các tham số tìm kiếm vào câu lệnh TypedQuery.
     */
    private void bindQueryParams(TypedQuery<?> query, ProductSearchQuery criteria) {
        if (criteria.keyword() != null) {
            query.setParameter("keyword", "%" + criteria.keyword().toLowerCase() + "%");
        }
        if (criteria.categoryId() != null) {
            query.setParameter("categoryId", criteria.categoryId());
        }
        if (criteria.brandId() != null) {
            query.setParameter("brandId", criteria.brandId());
        }
        if (criteria.minPrice() != null) {
            query.setParameter("minPrice", criteria.minPrice());
        }
        if (criteria.maxPrice() != null) {
            query.setParameter("maxPrice", criteria.maxPrice());
        }
    }
}
