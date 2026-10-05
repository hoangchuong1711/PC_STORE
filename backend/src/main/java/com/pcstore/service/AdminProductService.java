package com.pcstore.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.function.Function;
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
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.ValidationException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

public class AdminProductService {
    private final Supplier<EntityManager> entityManagers;

    public AdminProductService() {
        this(() -> PersistenceManager.get().createEntityManager());
    }

    /** Constructor này giúp integration test dùng EntityManagerFactory riêng. */
    public AdminProductService(Supplier<EntityManager> entityManagers) {
        this.entityManagers = Objects.requireNonNull(entityManagers);
    }

    /** Tạo Product và Inventory trong cùng một transaction. */
    public AdminProductResponse create(CreateProductRequest request) {
        if (request == null) throw new ValidationException("Request không hợp lệ.");

        String name = validateName(request.name());
        String description = cleanDescription(request.description());
        BigDecimal price = validatePrice(request.price());
        int quantityOnHand = validateQuantity(request.quantityOnHand());
        ProductStatus status = request.status() == null ? ProductStatus.DRAFT : request.status();

        if (request.categoryId() == null) throw new ValidationException("Danh mục là bắt buộc.");
        if (request.brandId() == null) throw new ValidationException("Thương hiệu là bắt buộc.");

        return inTransaction(dao -> {
            Category category = findCategory(dao, request.categoryId());
            Brand brand = findBrand(dao, request.brandId());
            validateActiveDependencies(status, category, brand);

            Product product = new Product();
            product.setName(name);
            product.setDescription(description);
            product.setPrice(price);
            product.setStatus(status);
            product.setCategory(category);
            product.setBrand(brand);
            dao.persistProduct(product);

            Inventory inventory = new Inventory();
            inventory.setProduct(product);
            inventory.setQuantityOnHand(quantityOnHand);
            inventory.setReservedQuantity(0);
            dao.persistInventory(inventory);

            return toResponse(product, inventory);
        });
    }

    /** Cập nhật các trường khác null; chuỗi description rỗng được chuẩn hóa thành null. */
    public AdminProductResponse update(int productId, UpdateProductRequest request) {
        validateProductId(productId);
        if (request == null) throw new ValidationException("Request không hợp lệ.");
        if (!hasUpdateField(request)) {
            throw new ValidationException("Phải cung cấp ít nhất một trường cần cập nhật.");
        }

        return inTransaction(dao -> {
            Product product = findProduct(dao, productId);

            if (request.name() != null) product.setName(validateName(request.name()));
            if (request.description() != null) product.setDescription(cleanDescription(request.description()));
            if (request.price() != null) product.setPrice(validatePrice(request.price()));
            if (request.categoryId() != null) product.setCategory(findCategory(dao, request.categoryId()));
            if (request.brandId() != null) product.setBrand(findBrand(dao, request.brandId()));
            if (request.status() != null) product.setStatus(request.status());

            validateActiveDependencies(product.getStatus(), product.getCategory(), product.getBrand());

            Inventory inventory = dao.findInventoryByProductId(productId);
            if (inventory == null) {
                throw new ResourceNotFoundException("Không tìm thấy tồn kho của sản phẩm.");
            }
            return toResponse(product, inventory);
        });
    }

    /** Admin chỉ đổi tồn thực tế; reservedQuantity do luồng đặt hàng quản lý. */
    public AdminProductResponse updateInventory(int productId, UpdateInventoryRequest request) {
        validateProductId(productId);
        if (request == null) throw new ValidationException("Request không hợp lệ.");
        int newQuantity = validateQuantity(request.quantityOnHand());

        return inTransaction(dao -> {
            Product product = findProduct(dao, productId);
            Inventory inventory = dao.findInventoryByProductIdForUpdate(productId);
            if (inventory == null) {
                throw new ResourceNotFoundException("Không tìm thấy tồn kho của sản phẩm.");
            }
            if (newQuantity < inventory.getReservedQuantity()) {
                throw new AppException(409, "INVENTORY_CONFLICT",
                        "Tồn kho không được nhỏ hơn số lượng đang giữ chỗ.");
            }

            inventory.setQuantityOnHand(newQuantity);
            return toResponse(product, inventory);
        });
    }

    private Product findProduct(AdminProductDao dao, int productId) {
        Product product = dao.findProductById(productId);
        if (product == null) throw new ResourceNotFoundException("Không tìm thấy sản phẩm.");
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
                || request.status() != null;
    }

    private AdminProductResponse toResponse(Product product, Inventory inventory) {
        return new AdminProductResponse(
                product.getProductId(), product.getName(), product.getDescription(), product.getPrice(),
                product.getStatus().name(), product.getCategory().getCategoryId(), product.getCategory().getName(),
                product.getBrand().getBrandId(), product.getBrand().getName(), inventory.getQuantityOnHand(),
                inventory.getReservedQuantity(), inventory.getQuantityOnHand() - inventory.getReservedQuantity());
    }

    private <T> T inTransaction(Function<AdminProductDao, T> operation) {
        try (EntityManager em = entityManagers.get()) {
            EntityTransaction transaction = em.getTransaction();
            try {
                transaction.begin();
                T result = operation.apply(new AdminProductDao(em));
                em.flush();
                transaction.commit();
                return result;
            } catch (RuntimeException exception) {
                rollback(transaction);
                throw exception;
            }
        }
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) transaction.rollback();
    }
}
