package com.pcstore.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.AdminProductDao;
import com.pcstore.dto.AdminProductResponse;
import com.pcstore.dto.CreateProductRequest;
import com.pcstore.dto.UpdateInventoryRequest;
import com.pcstore.dto.UpdateProductRequest;
import com.pcstore.entity.Brand;
import com.pcstore.entity.Category;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.Product;
import com.pcstore.entity.enums.ActiveStatus;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.ValidationException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

/**
 * AdminProductService: Lớp xử lý nghiệp vụ quản trị Sản phẩm, Tồn kho và Thông số kỹ thuật (Specs).
 * Tuân thủ mô hình MVC môn học:
 * - Kiểm tra chặt chẽ các ràng buộc nghiệp vụ (giá không âm, tồn không âm, danh mục & hãng hợp lệ).
 * - Quản lý Transaction ACID nguyên tử: Tạo Product, Inventory và Specs trong cùng 1 Transaction duy nhất.
 */
public class AdminProductService {

    private final Supplier<EntityManager> entityManagerSupplier;

    public AdminProductService() {
        this(() -> PersistenceManager.get().createEntityManager());
    }

    public AdminProductService(Supplier<EntityManager> entityManagerSupplier) {
        this.entityManagerSupplier = Objects.requireNonNull(entityManagerSupplier);
    }

    private EntityManager createEntityManager() {
        return entityManagerSupplier.get();
    }

    /**
     * THÊM MỚI SẢN PHẨM:
     * Quy trình giải quyết bài toán:
     * 1. Validate toàn bộ thông tin đầu vào (tên, giá, tồn kho, danh mục, hãng).
     * 2. Mở Transaction.
     * 3. Tìm Danh mục và Hãng sản xuất.
     * 4. Tạo đối tượng Product và lưu vào CSDL -> sinh ra productId.
     * 5. Tạo đối tượng Inventory ban đầu với số lượng nhập kho tương ứng.
     * 6. Nếu có thông số kỹ thuật (Specs), kiểm tra và lưu vào bảng specs của loại linh kiện đó.
     * 7. Commit Transaction. Nếu có bất kỳ lỗi nào, rollback toàn bộ để bảo vệ CSDL.
     */
    public AdminProductResponse create(CreateProductRequest request) {
        if (request == null) {
            throw new ValidationException("Dữ liệu yêu cầu tạo sản phẩm không được để trống.");
        }

        // Validate các trường cơ bản
        String name = validateName(request.name());
        String description = cleanDescription(request.description());
        BigDecimal price = validatePrice(request.price());
        int quantityOnHand = validateQuantity(request.quantityOnHand());
        ProductStatus status = request.status() == null ? ProductStatus.DRAFT : request.status();

        if (request.categoryId() == null) throw new ValidationException("Danh mục là bắt buộc.");
        if (request.brandId() == null) throw new ValidationException("Thương hiệu là bắt buộc.");

        try (EntityManager em = createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminProductDao dao = new AdminProductDao(em);

                // Kiểm tra sự tồn tại của Danh mục và Thương hiệu
                Category category = findCategory(dao, request.categoryId());
                Brand brand = findBrand(dao, request.brandId());
                validateActiveDependencies(status, category, brand);

                // Bước 1: Lưu đối tượng Product
                Product product = new Product();
                product.setName(name);
                product.setDescription(description);
                product.setPrice(price);
                product.setStatus(status);
                product.setCategory(category);
                product.setBrand(brand);
                dao.persistProduct(product);

                // Bước 2: Lưu đối tượng Inventory ban đầu
                Inventory inventory = new Inventory();
                inventory.setProduct(product);
                inventory.setQuantityOnHand(quantityOnHand);
                inventory.setReservedQuantity(0);
                dao.persistInventory(inventory);

                // Bước 3: Lưu thông số kỹ thuật Specs (nếu có)
                if (request.spec() != null) {
                    ComponentType componentType = category.getComponentType();
                    Map<String, Object> validatedSpec = ProductSpecSchema.validate(componentType, request.spec());
                    dao.flush();
                    dao.specs().replace(product.getProductId(), null, componentType, validatedSpec);
                }

                dao.flush();
                tx.commit();

                return toResponse(dao, product, inventory);

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    /**
     * CẬP NHẬT THÔNG TIN SẢN PHẨM:
     */
    public AdminProductResponse update(int productId, UpdateProductRequest request) {
        validateProductId(productId);
        if (request == null || !hasUpdateField(request)) {
            throw new ValidationException("Phải cung cấp ít nhất một trường thông tin cần cập nhật.");
        }

        try (EntityManager em = createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminProductDao dao = new AdminProductDao(em);

                Product product = findProduct(dao, productId);
                Category currentCategory = product.getCategory();
                Brand currentBrand = product.getBrand();

                // Cập nhật tên nếu có
                if (request.name() != null) {
                    product.setName(validateName(request.name()));
                }
                // Cập nhật mô tả nếu có
                if (request.description() != null) {
                    product.setDescription(cleanDescription(request.description()));
                }
                // Cập nhật giá nếu có
                if (request.price() != null) {
                    product.setPrice(validatePrice(request.price()));
                }
                // Cập nhật danh mục nếu có
                if (request.categoryId() != null) {
                    currentCategory = findCategory(dao, request.categoryId());
                    product.setCategory(currentCategory);
                }
                // Cập nhật hãng nếu có
                if (request.brandId() != null) {
                    currentBrand = findBrand(dao, request.brandId());
                    product.setBrand(currentBrand);
                }
                // Cập nhật trạng thái nếu có
                ProductStatus targetStatus = request.status() != null ? request.status() : product.getStatus();
                validateActiveDependencies(targetStatus, currentCategory, currentBrand);
                product.setStatus(targetStatus);

                // Cập nhật thông số kỹ thuật Specs
                ComponentType newType = currentCategory.getComponentType();
                Map<String, Object> oldSpec = dao.specs().find(productId, newType);
                if (request.spec() == null && oldSpec != null && oldSpec.isEmpty()) {
                    throw new ValidationException("Đổi loại linh kiện cần cung cấp bộ thông số mới.");
                }
                if (request.spec() != null) {
                    Map<String, Object> validatedSpec = ProductSpecSchema.validate(newType, request.spec());
                    dao.flush();
                    dao.specs().replace(productId, oldSpec == null ? null : newType, newType, validatedSpec);
                }

                Inventory inventory = dao.findInventoryByProductId(productId);
                if (inventory == null) {
                    throw new ResourceNotFoundException("Không tìm thấy tồn kho của sản phẩm.");
                }

                dao.flush();
                tx.commit();

                return toResponse(dao, product, inventory);

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    /**
     * CẬP NHẬT TỒN KHO THỰC TẾ:
     * Admin chỉnh sửa số lượng thực có trong kho.
     * Ràng buộc: Số lượng mới không được nhỏ hơn số lượng đang giữ chỗ trong các đơn hàng chờ giao.
     */
    public AdminProductResponse updateInventory(int productId, UpdateInventoryRequest request) {
        validateProductId(productId);
        if (request == null) {
            throw new ValidationException("Request cập nhật tồn kho không hợp lệ.");
        }
        int newQuantity = validateQuantity(request.quantityOnHand());

        try (EntityManager em = createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                AdminProductDao dao = new AdminProductDao(em);

                Product product = findProduct(dao, productId);
                Inventory inventory = dao.findInventoryByProductIdForUpdate(productId);
                if (inventory == null) {
                    throw new ResourceNotFoundException("Không tìm thấy tồn kho của sản phẩm.");
                }

                // Kiểm tra xung đột với đơn hàng đang giữ chỗ
                if (newQuantity < inventory.getReservedQuantity()) {
                    throw new AppException(409, "INVENTORY_CONFLICT",
                            "Tồn kho mới không được nhỏ hơn số lượng đang giữ chỗ cho các đơn hàng.");
                }

                inventory.setQuantityOnHand(newQuantity);
                dao.flush();
                tx.commit();

                return toResponse(dao, product, inventory);

            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    /**
     * Xem chi tiết một sản phẩm theo ID (phục vụ màn hình Admin xem và sửa).
     */
    public AdminProductResponse get(int productId) {
        validateProductId(productId);
        try (EntityManager em = createEntityManager()) {
            AdminProductDao dao = new AdminProductDao(em);
            Product product = findProduct(dao, productId);
            Inventory inventory = dao.findInventoryByProductId(productId);
            if (inventory == null) {
                throw new ResourceNotFoundException("Không tìm thấy tồn kho của sản phẩm.");
            }
            return toResponse(dao, product, inventory);
        }
    }

    /**
     * Lấy danh sách toàn bộ sản phẩm hiển thị trên Dashboard Admin.
     */
    public List<AdminProductResponse> list() {
        try (EntityManager em = createEntityManager()) {
            AdminProductDao dao = new AdminProductDao(em);
            List<Product> allProducts = dao.findAllProducts();

            List<Integer> productIds = new ArrayList<>();
            for (Product product : allProducts) {
                productIds.add(product.getProductId());
            }

            Map<Integer, Inventory> inventoryMap = dao.findInventories(productIds);

            List<AdminProductResponse> responseList = new ArrayList<>();
            for (Product product : allProducts) {
                Inventory inventory = inventoryMap.get(product.getProductId());
                responseList.add(toResponse(dao, product, inventory));
            }
            return responseList;
        }
    }

    // =========================================================================
    // CÁC HÀM VALIDATION & PHỤ TRỢ
    // =========================================================================

    private Product findProduct(AdminProductDao dao, int productId) {
        Product product = dao.findProductById(productId);
        if (product == null) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm có ID: " + productId);
        }
        return product;
    }

    private Category findCategory(AdminProductDao dao, int categoryId) {
        if (categoryId <= 0) throw new ValidationException("Category id không hợp lệ.");
        Category category = dao.findCategoryById(categoryId);
        if (category == null) throw new ResourceNotFoundException("Không tìm thấy danh mục.");
        return category;
    }

    private Brand findBrand(AdminProductDao dao, int brandId) {
        if (brandId <= 0) throw new ValidationException("Brand id không hợp lệ.");
        Brand brand = dao.findBrandById(brandId);
        if (brand == null) throw new ResourceNotFoundException("Không tìm thấy thương hiệu.");
        return brand;
    }

    private void validateActiveDependencies(ProductStatus status, Category category, Brand brand) {
        if (status != ProductStatus.ACTIVE) return;
        if (category.getStatus() != ActiveStatus.ACTIVE) {
            throw new ValidationException("Không thể kích hoạt sản phẩm thuộc danh mục đang ẩn.");
        }
        if (brand.getStatus() != ActiveStatus.ACTIVE) {
            throw new ValidationException("Không thể kích hoạt sản phẩm thuộc thương hiệu đang ẩn.");
        }
    }

    private void validateProductId(int productId) {
        if (productId <= 0) throw new ValidationException("Product id không hợp lệ.");
    }

    private String validateName(String value) {
        if (value == null) throw new ValidationException("Tên sản phẩm là bắt buộc.");
        String name = value.trim();
        if (name.isEmpty()) throw new ValidationException("Tên sản phẩm không được để trống.");
        if (name.length() > 255) throw new ValidationException("Tên sản phẩm tối đa 255 ký tự.");
        return name;
    }

    private String cleanDescription(String value) {
        if (value == null) return null;
        String description = value.trim();
        return description.isEmpty() ? null : description;
    }

    private BigDecimal validatePrice(BigDecimal value) {
        if (value == null) throw new ValidationException("Giá sản phẩm là bắt buộc.");
        if (value.signum() < 0) throw new ValidationException("Giá sản phẩm không được âm.");

        BigDecimal normalized;
        try {
            normalized = value.setScale(0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new ValidationException("Giá VND phải là số nguyên.");
        }
        if (normalized.precision() > 19) {
            throw new ValidationException("Giá sản phẩm vượt quá giới hạn cho phép.");
        }
        return normalized;
    }

    private int validateQuantity(Integer value) {
        if (value == null) throw new ValidationException("Số lượng tồn là bắt buộc.");
        if (value < 0) throw new ValidationException("Số lượng tồn không được âm.");
        return value;
    }

    private boolean hasUpdateField(UpdateProductRequest request) {
        return request.name() != null
                || request.description() != null
                || request.price() != null
                || request.categoryId() != null
                || request.brandId() != null
                || request.status() != null
                || request.spec() != null;
    }

    private AdminProductResponse toResponse(AdminProductDao dao, Product product, Inventory inventory) {
        int qoh = inventory != null ? inventory.getQuantityOnHand() : 0;
        int reserved = inventory != null ? inventory.getReservedQuantity() : 0;
        int available = qoh - reserved;

        ComponentType compType = product.getCategory().getComponentType();
        Map<String, Object> specsMap = dao.specs().find(product.getProductId(), compType);

        return new AdminProductResponse(
                product.getProductId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getStatus().name(),
                product.getCategory().getCategoryId(),
                product.getCategory().getName(),
                product.getBrand().getBrandId(),
                product.getBrand().getName(),
                qoh,
                reserved,
                available,
                specsMap
        );
    }
}
