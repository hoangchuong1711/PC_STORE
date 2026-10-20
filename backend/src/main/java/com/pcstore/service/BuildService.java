package com.pcstore.service;

import com.pcstore.dao.BuildDao;
import com.pcstore.dao.CartDao;
import com.pcstore.dto.BuildDto;
import com.pcstore.dto.CartResponse;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.dto.CompatibilityDto.Status;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.UserRole;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;

public class BuildService {
    private final EntityManager em;
    private final BuildDao builds;
    private final CartDao carts;
    private final CompatibilityService compatibility;

    public BuildService(EntityManager em) {
        this.em = em;
        this.builds = new BuildDao(em);
        this.carts = new CartDao(em);
        this.compatibility = new CompatibilityService(em);
    }

    public List<BuildDto.Response> list(int userId) {
        return transaction(() -> {
            customer(userId, false);
            return builds.list(userId).stream().map(this::response).toList();
        });
    }

    public BuildDto.Response get(int userId, int buildId) {
        return transaction(() -> {
            customer(userId, false);
            return response(owned(userId, buildId, false));
        });
    }

    public BuildDto.Response create(int userId, BuildDto.Request request) {
        validate(request);
        return transaction(() -> {
            User user = customer(userId, false);
            PcBuild build = new PcBuild();
            build.setUser(user);
            build.setName(request.name().trim());
            builds.save(build);
            addItems(build, request.items());
            em.flush();
            return response(build);
        });
    }

    public BuildDto.Response update(int userId, int buildId, BuildDto.Request request) {
        validate(request);
        return transaction(() -> {
            customer(userId, false);
            PcBuild build = owned(userId, buildId, true);
            editable(build);
            build.setName(request.name().trim());
            build.getItems().clear();
            em.flush();
            addItems(build, request.items());
            em.flush();
            return response(build);
        });
    }

    public void delete(int userId, int buildId) {
        transaction(() -> {
            customer(userId, false);
            PcBuild build = owned(userId, buildId, true);
            editable(build);
            builds.delete(build);
            return null;
        });
    }

    public CartResponse addToCart(int userId, int buildId) {
        return transaction(() -> {
            customer(userId, true);
            PcBuild build = owned(userId, buildId, true);
            editable(build);
            List<Selection> selections = selections(build);
            if (compatibility.evaluate(selections).status() != Status.PASS)
                throw new AppException(409, "BUILD_NOT_READY", "Build chưa tương thích hoặc còn thiếu thông số.");
            return new CartService(em).addItemsInTransaction(userId, selections);
        });
    }

    private User customer(int userId, boolean lock) {
        User user = userId <= 0 ? null : carts.findUser(userId, lock);
        if (user == null || user.getStatus() != UserStatus.ACTIVE)
            throw new AppException(401, "UNAUTHORIZED", "Phiên đăng nhập không còn hợp lệ.");
        if (user.getRole() != UserRole.CUSTOMER)
            throw new AppException(403, "FORBIDDEN", "Chỉ khách hàng được dùng PC Builder.");
        return user;
    }

    private PcBuild owned(int userId, int buildId, boolean lock) {
        PcBuild build = buildId <= 0 ? null : builds.findOwned(userId, buildId, lock);
        if (build == null) throw new AppException(404, "BUILD_NOT_FOUND", "Không tìm thấy build.");
        return build;
    }

    private static void editable(PcBuild build) {
        if (!"MANUAL".equals(build.getSourceType()))
            throw new AppException(409, "BUILD_READ_ONLY", "Build gợi ý không được sửa qua API thủ công.");
    }

    private static void validate(BuildDto.Request request) {
        if (request == null || request.name() == null || request.name().trim().isEmpty()
                || request.name().trim().length() > 255 || request.items() == null)
            throw new AppException(400, "INVALID_BUILD", "Tên và danh sách linh kiện không hợp lệ.");
        Set<Integer> ids = new HashSet<>();
        for (Selection item : request.items()) {
            if (item == null || item.productId() <= 0 || item.quantity() <= 0 || !ids.add(item.productId()))
                throw new AppException(400, "INVALID_BUILD", "Linh kiện hoặc số lượng không hợp lệ.");
        }
    }

    private void addItems(PcBuild build, List<Selection> selections) {
        for (Selection selection : selections) {
            Product product = carts.findProduct(selection.productId());
            if (product == null) throw new AppException(404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
            PcBuildItem item = new PcBuildItem();
            item.setBuild(build);
            item.setProduct(product);
            item.setQuantity(selection.quantity());
            build.getItems().add(item);
        }
    }

    private static List<Selection> selections(PcBuild build) {
        return build.getItems().stream().map(i -> new Selection(i.getProduct().getProductId(), i.getQuantity())).toList();
    }

    private BuildDto.Response response(PcBuild build) {
        List<BuildDto.Item> items = build.getItems().stream().map(item -> {
            Product product = item.getProduct();
            BigDecimal price = product.getPrice();
            return new BuildDto.Item(product.getProductId(), product.getName(), item.getQuantity(),
                    price, price.multiply(BigDecimal.valueOf(item.getQuantity())));
        }).toList();
        BigDecimal total = items.stream().map(BuildDto.Item::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new BuildDto.Response(build.getBuildId(), build.getName(), build.getSourceType(), items,
                total, compatibility.evaluate(selections(build)));
    }

    private <T> T transaction(Supplier<T> operation) {
        var tx = em.getTransaction();
        tx.begin();
        try {
            T result = operation.get();
            tx.commit();
            return result;
        } catch (RuntimeException exception) {
            if (tx.isActive()) tx.rollback();
            throw exception;
        }
    }
}
