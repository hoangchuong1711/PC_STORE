package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.OrderDao;
import com.pcstore.dto.CheckoutRequest;
import com.pcstore.dto.OrderItemResponse;
import com.pcstore.dto.OrderPaymentResponse;
import com.pcstore.dto.OrderResponse;
import com.pcstore.entity.CartItem;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.Order;
import com.pcstore.entity.OrderItem;
import com.pcstore.entity.Payment;
import com.pcstore.entity.Product;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.ActiveStatus;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.entity.enums.PaymentStatus;
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ResourceNotFoundException;
import com.pcstore.exception.UnauthorizedException;
import com.pcstore.exception.ValidationException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public class OrderService {
    private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("^[A-Za-z0-9._:-]{8,128}$");
    private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999999999");

    private final EntityManagerFactory entityManagerFactory;
    private final Clock clock;

    public OrderService() {
        this(PersistenceManager.get(), Clock.systemDefaultZone());
    }

    public OrderService(EntityManagerFactory entityManagerFactory) {
        this(entityManagerFactory, Clock.systemDefaultZone());
    }

    OrderService(EntityManagerFactory entityManagerFactory, Clock clock) {
        this.entityManagerFactory = entityManagerFactory;
        this.clock = clock;
    }

    public CheckoutOutcome checkout(int userId, String rawIdempotencyKey, CheckoutRequest request) {
        ValidCheckout checkout = validateCheckout(rawIdempotencyKey, request);
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                OrderDao orders = new OrderDao(em);

                Order replay = orders.findByCheckoutKey(userId, checkout.idempotencyKey()).orElse(null);
                if (replay != null) {
                    verifySameRequest(replay, checkout.requestHash());
                    OrderResponse response = toResponse(orders, replay);
                    tx.commit();
                    return new CheckoutOutcome(response, true);
                }

                User user = em.find(User.class, userId);
                if (user == null || user.getStatus() != UserStatus.ACTIVE) {
                    throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ.");
                }

                var cart = orders.lockCartByUser(userId)
                        .orElseThrow(() -> conflict("CART_EMPTY", "Giỏ hàng đang trống."));

                // A request with the same key may have completed while this transaction waited for the cart lock.
                replay = orders.findByCheckoutKey(userId, checkout.idempotencyKey()).orElse(null);
                if (replay != null) {
                    verifySameRequest(replay, checkout.requestHash());
                    OrderResponse response = toResponse(orders, replay);
                    tx.commit();
                    return new CheckoutOutcome(response, true);
                }

                List<CartItem> cartItems = orders.findCartItems(cart.getCartId());
                if (cartItems.isEmpty()) throw conflict("CART_EMPTY", "Giỏ hàng đang trống.");

                validateProducts(cartItems);
                List<Integer> productIds = cartItems.stream()
                        .map(item -> item.getProduct().getProductId())
                        .sorted()
                        .toList();
                Map<Integer, Inventory> inventoryByProduct = indexInventories(orders.lockInventories(productIds));
                validateAndReserve(cartItems, inventoryByProduct);

                BigDecimal total = BigDecimal.ZERO;
                for (CartItem cartItem : cartItems) {
                    BigDecimal unitPrice = money(cartItem.getProduct().getPrice());
                    BigDecimal lineTotal = checkedMoney(unitPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity())));
                    total = checkedMoney(total.add(lineTotal));
                }

                LocalDateTime now = now();
                Order order = new Order();
                order.setUser(user);
                order.setOrderDate(now);
                order.setStatus(OrderStatus.PENDING);
                order.setShippingName(checkout.shippingName());
                order.setShippingPhone(checkout.shippingPhone());
                order.setShippingAddressText(checkout.shippingAddressText());
                order.setCheckoutIdempotencyKey(checkout.idempotencyKey());
                order.setCheckoutRequestHash(checkout.requestHash());
                order.setTotalAmount(total);
                orders.persist(order);

                for (CartItem cartItem : cartItems) {
                    Product product = cartItem.getProduct();
                    BigDecimal unitPrice = money(product.getPrice());

                    OrderItem item = new OrderItem();
                    item.setOrder(order);
                    item.setProduct(product);
                    item.setQuantity(cartItem.getQuantity());
                    item.setBaseUnitPrice(unitPrice);
                    item.setUnitPrice(unitPrice);
                    orders.persist(item);
                    order.getItems().add(item);
                }

                Payment payment = new Payment();
                payment.setOrder(order);
                payment.setMethod(PaymentMethod.COD);
                payment.setStatus(PaymentStatus.PENDING);
                payment.setAmount(total);
                orders.persist(payment);

                orders.removeCartItems(cartItems);
                cart.setUpdatedAt(now);
                em.flush();
                OrderResponse response = toResponse(order, order.getItems(), payment);
                tx.commit();
                return new CheckoutOutcome(response, false);
            } catch (AppException exception) {
                rollback(em);
                throw exception;
            } catch (PersistenceException exception) {
                rollback(em);
                throw new AppException(409, "CHECKOUT_CONFLICT",
                        "Checkout xung đột với một yêu cầu khác. Hãy tải lại giỏ hàng.", exception);
            } catch (RuntimeException exception) {
                rollback(em);
                throw exception;
            }
        }
    }

    public List<OrderResponse> findOwnedOrders(int userId) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            OrderDao orders = new OrderDao(em);
            return orders.findIdsByOwner(userId).stream()
                    .map(id -> toResponse(orders, orders.find(id).orElseThrow()))
                    .toList();
        }
    }

    public OrderResponse findOwnedOrder(int userId, int orderId) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            OrderDao orders = new OrderDao(em);
            Order order = orders.find(orderId)
                    .filter(value -> value.getUser().getUserId().equals(userId))
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng."));
            return toResponse(orders, order);
        }
    }

    public OrderResponse cancelOwnedOrder(int userId, int orderId) {
        return mutateOrder(orderId, (orders, order) -> {
            if (!order.getUser().getUserId().equals(userId)) {
                throw new ResourceNotFoundException("Không tìm thấy đơn hàng.");
            }
            if (order.getStatus() == OrderStatus.CANCELLED) return;
            if (order.getStatus() != OrderStatus.PENDING) {
                throw conflict("INVALID_ORDER_STATUS", "Khách hàng chỉ có thể hủy đơn đang PENDING.");
            }
            cancel(orders, order);
        });
    }

    public List<OrderResponse> findAllOrders() {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            OrderDao orders = new OrderDao(em);
            return orders.findAllIds().stream()
                    .map(id -> toResponse(orders, orders.find(id).orElseThrow()))
                    .toList();
        }
    }

    public OrderResponse findOrderForAdmin(int orderId) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            OrderDao orders = new OrderDao(em);
            return toResponse(orders, orders.find(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng.")));
        }
    }

    public OrderResponse updateStatusForAdmin(int orderId, OrderStatus target) {
        if (target == null) throw new ValidationException("Trạng thái mới là bắt buộc.");
        return mutateOrder(orderId, (orders, order) -> transition(orders, order, target));
    }

    private OrderResponse mutateOrder(int orderId, OrderMutation mutation) {
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                OrderDao orders = new OrderDao(em);
                Order order = orders.lock(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng."));
                mutation.apply(orders, order);
                em.flush();
                OrderResponse response = toResponse(orders, order);
                tx.commit();
                return response;
            } catch (AppException exception) {
                rollback(em);
                throw exception;
            } catch (PersistenceException exception) {
                rollback(em);
                throw new AppException(409, "ORDER_UPDATE_CONFLICT",
                        "Đơn hàng vừa được cập nhật bởi yêu cầu khác.", exception);
            } catch (RuntimeException exception) {
                rollback(em);
                throw exception;
            }
        }
    }

    private void transition(OrderDao orders, Order order, OrderStatus target) {
        OrderStatus current = order.getStatus();
        if (current == target) return;

        switch (target) {
            case CONFIRMED -> {
                requireTransition(current == OrderStatus.PENDING, current, target);
                order.setStatus(target);
            }
            case SHIPPING -> {
                requireTransition(current == OrderStatus.CONFIRMED, current, target);
                Payment payment = requirePayment(orders, order);
                if (payment.getMethod() == PaymentMethod.BANK_TRANSFER && payment.getStatus() != PaymentStatus.PAID) {
                    throw conflict("PAYMENT_REQUIRED", "Đơn chuyển khoản phải PAID trước khi giao.");
                }
                ship(orders, order);
                order.setStatus(target);
            }
            case DELIVERED -> {
                requireTransition(current == OrderStatus.SHIPPING, current, target);
                Payment payment = requirePayment(orders, order);
                LocalDateTime now = now();
                if (payment.getMethod() == PaymentMethod.COD) {
                    if (payment.getStatus() != PaymentStatus.PENDING) {
                        throw conflict("INVALID_PAYMENT_STATUS", "Thanh toán COD không còn ở trạng thái PENDING.");
                    }
                    payment.setStatus(PaymentStatus.PAID);
                    payment.setPaidAt(now);
                }
                order.setDeliveredAt(now);
                order.setStatus(target);
            }
            case CANCELLED -> {
                requireTransition(current == OrderStatus.PENDING || current == OrderStatus.CONFIRMED, current, target);
                cancel(orders, order);
            }
            default -> throw conflict("INVALID_ORDER_STATUS", "Không thể chuyển từ " + current + " sang " + target + ".");
        }
    }

    private void ship(OrderDao orders, Order order) {
        List<OrderItem> items = orders.findItems(order.getOrderId());
        Map<Integer, Inventory> inventories = lockOrderInventories(orders, items);
        for (OrderItem item : items) {
            Inventory inventory = inventories.get(item.getProduct().getProductId());
            if (inventory == null || inventory.getReservedQuantity() < item.getQuantity()
                    || inventory.getQuantityOnHand() < item.getQuantity()) {
                throw conflict("INVENTORY_INCONSISTENT", "Tồn giữ chỗ của đơn không còn nhất quán.");
            }
            inventory.setQuantityOnHand(inventory.getQuantityOnHand() - item.getQuantity());
            inventory.setReservedQuantity(inventory.getReservedQuantity() - item.getQuantity());
        }
    }

    private void cancel(OrderDao orders, Order order) {
        Payment payment = requirePayment(orders, order);
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw conflict("PAID_ORDER_CANNOT_BE_CANCELLED", "Không thể hủy đơn đã thanh toán.");
        }
        List<OrderItem> items = orders.findItems(order.getOrderId());
        Map<Integer, Inventory> inventories = lockOrderInventories(orders, items);
        for (OrderItem item : items) {
            Inventory inventory = inventories.get(item.getProduct().getProductId());
            if (inventory == null || inventory.getReservedQuantity() < item.getQuantity()) {
                throw conflict("INVENTORY_INCONSISTENT", "Tồn giữ chỗ của đơn không còn nhất quán.");
            }
            inventory.setReservedQuantity(inventory.getReservedQuantity() - item.getQuantity());
        }
        order.setStatus(OrderStatus.CANCELLED);
        order.setDeliveredAt(null);
    }

    private Map<Integer, Inventory> lockOrderInventories(OrderDao orders, List<OrderItem> items) {
        List<Integer> productIds = items.stream()
                .map(item -> item.getProduct().getProductId())
                .sorted()
                .toList();
        return indexInventories(orders.lockInventories(productIds));
    }

    private static Payment requirePayment(OrderDao orders, Order order) {
        return orders.findPayment(order.getOrderId())
                .orElseThrow(() -> conflict("PAYMENT_MISSING", "Đơn hàng không có bản ghi thanh toán."));
    }

    private static void requireTransition(boolean allowed, OrderStatus current, OrderStatus target) {
        if (!allowed) {
            throw conflict("INVALID_ORDER_STATUS", "Không thể chuyển từ " + current + " sang " + target + ".");
        }
    }

    private static void validateProducts(List<CartItem> items) {
        for (CartItem item : items) {
            if (item.getQuantity() <= 0) throw new ValidationException("Số lượng trong giỏ phải lớn hơn 0.");
            Product product = item.getProduct();
            boolean sellable = product.getStatus() == ProductStatus.ACTIVE
                    && product.getCategory().getStatus() == ActiveStatus.ACTIVE
                    && product.getBrand().getStatus() == ActiveStatus.ACTIVE;
            if (!sellable) {
                throw conflict("PRODUCT_NOT_SELLABLE", "Sản phẩm " + product.getProductId() + " không còn được bán.");
            }
            money(product.getPrice());
        }
    }

    private static Map<Integer, Inventory> indexInventories(List<Inventory> inventories) {
        Map<Integer, Inventory> result = new HashMap<>();
        inventories.forEach(value -> result.put(value.getProduct().getProductId(), value));
        return result;
    }

    private static void validateAndReserve(List<CartItem> items, Map<Integer, Inventory> inventories) {
        for (CartItem item : items) {
            int productId = item.getProduct().getProductId();
            Inventory inventory = inventories.get(productId);
            if (inventory == null) {
                throw conflict("OUT_OF_STOCK", "Sản phẩm " + productId + " không có tồn kho.");
            }
            int available = inventory.getQuantityOnHand() - inventory.getReservedQuantity();
            if (available < item.getQuantity()) {
                throw conflict("OUT_OF_STOCK", "Sản phẩm " + productId + " chỉ còn " + available + " sản phẩm.");
            }
            inventory.setReservedQuantity(inventory.getReservedQuantity() + item.getQuantity());
        }
    }

    private static ValidCheckout validateCheckout(String rawKey, CheckoutRequest request) {
        if (request == null) throw new ValidationException("Request checkout không hợp lệ.");
        String key = clean(rawKey);
        if (key == null || !IDEMPOTENCY_KEY.matcher(key).matches()) {
            throw new ValidationException("Idempotency-Key phải dài 8-128 ký tự và chỉ gồm chữ, số, '.', '_', ':' hoặc '-'.");
        }
        String name = requiredText(request.shippingName(), 255, "Tên người nhận");
        String phone = requiredText(request.shippingPhone(), 32, "Số điện thoại");
        String address = requiredText(request.shippingAddressText(), null, "Địa chỉ nhận hàng");
        if (request.paymentMethod() != PaymentMethod.COD) {
            throw new ValidationException("T14 chỉ hỗ trợ phương thức thanh toán COD.");
        }
        String hash = sha256(name + "\u0000" + phone + "\u0000" + address + "\u0000COD");
        return new ValidCheckout(key, hash, name, phone, address);
    }

    private static String requiredText(String value, Integer maxLength, String field) {
        String result = clean(value);
        if (result == null) throw new ValidationException(field + " là bắt buộc.");
        if (maxLength != null && result.length() > maxLength) {
            throw new ValidationException(field + " tối đa " + maxLength + " ký tự.");
        }
        return result;
    }

    private static String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    private static BigDecimal money(BigDecimal value) {
        if (value == null || value.signum() < 0) throw conflict("INVALID_PRICE", "Giá sản phẩm không hợp lệ.");
        try {
            return checkedMoney(value.setScale(0, RoundingMode.UNNECESSARY));
        } catch (ArithmeticException exception) {
            throw conflict("INVALID_PRICE", "Giá sản phẩm phải là số nguyên đồng.");
        }
    }

    private static BigDecimal checkedMoney(BigDecimal value) {
        if (value.signum() < 0 || value.compareTo(MAX_MONEY) > 0) {
            throw conflict("TOTAL_TOO_LARGE", "Tổng tiền vượt giới hạn hệ thống.");
        }
        return value;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM không hỗ trợ SHA-256", exception);
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    private static void verifySameRequest(Order order, String requestHash) {
        if (!requestHash.equals(order.getCheckoutRequestHash())) {
            throw conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency-Key đã được dùng cho nội dung checkout khác.");
        }
    }

    private static OrderResponse toResponse(OrderDao orders, Order order) {
        return toResponse(order, orders.findItems(order.getOrderId()), orders.findPayment(order.getOrderId()).orElse(null));
    }

    private static OrderResponse toResponse(Order order, List<OrderItem> items, Payment payment) {
        List<OrderItemResponse> itemResponses = items.stream().map(item -> new OrderItemResponse(
                item.getOrderItemId(),
                item.getProduct().getProductId(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getBaseUnitPrice(),
                item.getUnitPrice(),
                item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
        )).toList();
        OrderPaymentResponse paymentResponse = payment == null ? null : new OrderPaymentResponse(
                payment.getPaymentId(), payment.getMethod().name(), payment.getStatus().name(),
                payment.getAmount(), payment.getPaidAt());
        return new OrderResponse(
                order.getOrderId(), order.getOrderDate(), order.getStatus().name(), order.getTotalAmount(),
                order.getShippingName(), order.getShippingPhone(), order.getShippingAddressText(),
                order.getDeliveredAt(), itemResponses, paymentResponse);
    }

    private static AppException conflict(String code, String message) {
        return new AppException(409, code, message);
    }

    private static void rollback(EntityManager em) {
        if (em.getTransaction().isActive()) em.getTransaction().rollback();
    }

    public record CheckoutOutcome(OrderResponse order, boolean replayed) {
    }

    private record ValidCheckout(
            String idempotencyKey,
            String requestHash,
            String shippingName,
            String shippingPhone,
            String shippingAddressText) {
    }

    @FunctionalInterface
    private interface OrderMutation {
        void apply(OrderDao orders, Order order);
    }
}
