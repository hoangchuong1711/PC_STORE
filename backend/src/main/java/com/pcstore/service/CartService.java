package com.pcstore.service;

import com.pcstore.dao.CartDao;
import com.pcstore.dao.ProductDao;
import com.pcstore.dto.CartItemResponse;
import com.pcstore.dto.CartResponse;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.*;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Supplier;

public class CartService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final EntityManager em;
    private final CartDao carts;
    private final ProductDao products;

    public CartService(EntityManager em) {
        this.em = em;
        this.carts = new CartDao(em);
        this.products = new ProductDao(em);
    }

    public CartResponse getCart(int userId) {
        return transaction(() -> {
            customer(userId, false);
            return response(carts.findCart(userId, false));
        });
    }

    public CartResponse addItem(int userId, Integer productId, Integer quantity) {
        positiveId(productId);
        positiveQuantity(quantity);
        return transaction(() -> {
            // Lock the user even before their first cart exists, then the cart itself.
            User user = customer(userId, true);
            Cart cart = carts.findCart(userId, true);
            Product product = carts.findProduct(productId);
            if (product == null) throw new AppException(404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
            CartItem item = cart == null ? null : carts.findItemByProduct(cart.getCartId(), productId);
            long nextQuantity = (item == null ? 0L : item.getQuantity()) + quantity;
            checkAvailability(product, nextQuantity);

            LocalDateTime now = LocalDateTime.now(ZONE);
            if (cart == null) {
                cart = new Cart();
                cart.setUser(user);
                cart.setCreatedAt(now);
                cart.setUpdatedAt(now);
                carts.save(cart);
            }
            if (item == null) {
                item = new CartItem();
                item.setCart(cart);
                item.setProduct(product);
                item.setQuantity((int) nextQuantity);
                carts.save(item);
            } else {
                item.setQuantity((int) nextQuantity);
            }
            cart.setUpdatedAt(now);
            em.flush();
            return response(cart);
        });
    }

    /** The caller owns the transaction so every component is added or none are. */
    CartResponse addItemsInTransaction(int userId, List<Selection> selections) {
        User user = customer(userId, true);
        Cart cart = carts.findCart(userId, true);
        LocalDateTime now = LocalDateTime.now(ZONE);
        for (Selection selection : selections) {
            positiveId(selection.productId());
            positiveQuantity(selection.quantity());
            Product product = carts.findProduct(selection.productId());
            if (product == null) throw new AppException(404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
            CartItem item = cart == null ? null : carts.findItemByProduct(cart.getCartId(), selection.productId());
            long nextQuantity = (item == null ? 0L : item.getQuantity()) + selection.quantity();
            checkAvailability(product, nextQuantity);
            if (cart == null) {
                cart = new Cart();
                cart.setUser(user);
                cart.setCreatedAt(now);
                cart.setUpdatedAt(now);
                carts.save(cart);
                em.flush();
            }
            if (item == null) {
                item = new CartItem();
                item.setCart(cart);
                item.setProduct(product);
                item.setQuantity((int) nextQuantity);
                carts.save(item);
            } else item.setQuantity((int) nextQuantity);
        }
        cart.setUpdatedAt(now);
        em.flush();
        return response(cart);
    }

    public CartResponse updateItem(int userId, Integer itemId, Integer quantity) {
        positiveId(itemId);
        nonNegativeQuantity(quantity);
        return transaction(() -> {
            customer(userId, true);
            Cart cart = carts.findCart(userId, true);
            CartItem item = ownedItem(cart, itemId);
            if (quantity == 0) {
                carts.delete(item);
            } else {
                checkAvailability(item.getProduct(), quantity);
                item.setQuantity(quantity);
            }
            cart.setUpdatedAt(LocalDateTime.now(ZONE));
            em.flush();
            return response(cart);
        });
    }

    public void deleteItem(int userId, Integer itemId) {
        positiveId(itemId);
        transaction(() -> {
            customer(userId, true);
            Cart cart = carts.findCart(userId, true);
            CartItem item = ownedItem(cart, itemId);
            carts.delete(item);
            cart.setUpdatedAt(LocalDateTime.now(ZONE));
            return null;
        });
    }

    private User customer(int userId, boolean lock) {
        User user = userId <= 0 ? null : carts.findUser(userId, lock);
        if (user == null || user.getStatus() != UserStatus.ACTIVE)
            throw new AppException(401, "UNAUTHORIZED", "Phiên đăng nhập không còn hợp lệ.");
        if (user.getRole() != UserRole.CUSTOMER)
            throw new AppException(403, "FORBIDDEN", "Chỉ khách hàng được sử dụng giỏ.");
        return user;
    }

    private CartItem ownedItem(Cart cart, int itemId) {
        CartItem item = cart == null ? null : carts.findItem(cart.getCartId(), itemId);
        if (item == null) throw new AppException(404, "CART_ITEM_NOT_FOUND", "Không tìm thấy dòng giỏ.");
        return item;
    }

    private static boolean sellable(Product product) {
        return product.getStatus() == ProductStatus.ACTIVE
                && product.getCategory().getStatus() == ActiveStatus.ACTIVE
                && product.getBrand().getStatus() == ActiveStatus.ACTIVE;
    }

    private void checkAvailability(Product product, long quantity) {
        Inventory inventory = carts.findInventory(product.getProductId());
        if (!sellable(product) || inventory == null)
            throw new AppException(409, "PRODUCT_NOT_AVAILABLE", "Sản phẩm không được phép bán.");
        if (quantity > (long) inventory.getQuantityOnHand() - inventory.getReservedQuantity())
            throw new AppException(409, "OUT_OF_STOCK", "Số lượng vượt tồn khả dụng.");
    }

    private CartResponse response(Cart cart) {
        if (cart == null) return new CartResponse(null, List.of(), BigDecimal.ZERO);
        List<CartItem> rows = carts.findItems(cart.getCartId());
        var quantities = products.availableQuantities(rows.stream().map(i -> i.getProduct().getProductId()).toList());
        List<CartItemResponse> items = rows.stream().map(item -> {
            Product product = item.getProduct();
            int available = quantities.getOrDefault(product.getProductId(), 0);
            BigDecimal price = product.getPrice();
            return new CartItemResponse(item.getCartItemId(), product.getProductId(), product.getName(),
                    item.getQuantity(), price, price.multiply(BigDecimal.valueOf(item.getQuantity())),
                    available, sellable(product) && available >= item.getQuantity());
        }).toList();
        BigDecimal total = items.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(cart.getCartId(), items, total);
    }

    private static void positiveId(Integer id) {
        if (id == null || id <= 0) throw new AppException(400, "INVALID_ID", "ID phải là số nguyên dương.");
    }

    private static void positiveQuantity(Integer quantity) {
        if (quantity == null || quantity <= 0)
            throw new AppException(400, "INVALID_QUANTITY", "Số lượng phải là số nguyên dương.");
    }

    private static void nonNegativeQuantity(Integer quantity) {
        if (quantity == null || quantity < 0)
            throw new AppException(400, "INVALID_QUANTITY", "Số lượng phải là số nguyên không âm.");
    }

    private <T> T transaction(Supplier<T> operation) {
        var transaction = em.getTransaction();
        transaction.begin();
        try {
            T result = operation.get();
            transaction.commit();
            return result;
        } catch (RuntimeException exception) {
            if (transaction.isActive()) transaction.rollback();
            throw exception;
        }
    }
}
