# T14 — Checkout COD, đơn hàng và trạng thái giao

Tài liệu này dùng để đọc nhanh contract và test bằng Postman. Base URL khi gọi trực tiếp Tomcat:

```text
http://localhost:8080/pc-store-backend/api
```

Có thể import collection [T14-order-api.postman_collection.json](postman/T14-order-api.postman_collection.json). Postman tự giữ cookie `JSESSIONID`; hãy bật cookie jar và chạy login trước các request cần quyền.

## 1. API đã có

| Method | Path | Quyền | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/orders` | CUSTOMER | Checkout giỏ thành đơn COD |
| `GET` | `/orders` | CUSTOMER | Danh sách đơn của user hiện tại |
| `GET` | `/orders/{id}` | CUSTOMER | Chi tiết đơn của user hiện tại |
| `POST` | `/orders/{id}/cancel` | CUSTOMER | Hủy đơn PENDING của chính mình |
| `GET` | `/admin/orders` | ADMIN | Danh sách mọi đơn |
| `GET` | `/admin/orders/{id}` | ADMIN | Chi tiết một đơn |
| `PUT` | `/admin/orders/{id}/status` | ADMIN | Chuyển trạng thái hợp lệ |

User khác truy cập một order ID không thuộc mình nhận `404`, không nhận dữ liệu của chủ đơn.

## 2. Chuẩn bị dữ liệu test

Chạy backend/database:

```powershell
docker compose up --build -d backend
```

Đăng ký customer trong Postman:

```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "T14 Customer",
  "email": "t14.customer@pcstore.local",
  "password": "Customer12345",
  "phone": "0901234567"
}
```

T14 đọc giỏ theo schema CORE; API giỏ thuộc T13 và chưa có trên nhánh nền của task này. Sau khi đăng ký, mở psql:

```powershell
docker compose exec db psql -U pc_store_app -d pc_store
```

Paste SQL sau để tạo giỏ với một sản phẩm đang bán/còn hàng:

```sql
INSERT INTO carts(user_id, created_at, updated_at)
SELECT user_id, now(), now()
FROM users
WHERE email = 't14.customer@pcstore.local'
ON CONFLICT (user_id) DO UPDATE SET updated_at = excluded.updated_at;

INSERT INTO cart_items(cart_id, product_id, quantity)
SELECT c.cart_id, candidate.product_id, 1
FROM carts c
JOIN users u ON u.user_id = c.user_id
CROSS JOIN LATERAL (
    SELECT p.product_id
    FROM products p
    JOIN categories category ON category.category_id = p.category_id
    JOIN brands brand ON brand.brand_id = p.brand_id
    JOIN inventory i ON i.product_id = p.product_id
    WHERE p.status = 'ACTIVE'
      AND category.status = 'ACTIVE'
      AND brand.status = 'ACTIVE'
      AND i.quantity_on_hand - i.reserved_quantity >= 1
    ORDER BY p.product_id
    LIMIT 1
) candidate
WHERE u.email = 't14.customer@pcstore.local'
ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity;
```

Thoát psql bằng `\q`, rồi login customer trong Postman.

## 3. Checkout và chống request lặp

```http
POST /orders
Content-Type: application/json
Idempotency-Key: checkout-demo-001

{
  "shippingName": "Nguyễn Văn A",
  "shippingPhone": "0901234567",
  "shippingAddressText": "123 Nguyễn Văn Linh, Đà Nẵng",
  "paymentMethod": "COD"
}
```

Lần đầu trả `201` và header `Idempotent-Replayed: false`. Gửi lại nguyên request với cùng key trả `200`, `Idempotent-Replayed: true` và cùng `orderId`; không tạo thêm đơn và không reserve kho lần hai. Đổi địa chỉ/body nhưng giữ key cũ trả `409 IDEMPOTENCY_KEY_REUSED`. Mỗi checkout mới phải dùng key mới (UUID là lựa chọn dễ nhất).

Response chứa giá và địa chỉ snapshot. Thay đổi giá Product sau đó không làm đổi `items[].baseUnitPrice`, `items[].unitPrice` hoặc `totalAmount` của đơn cũ.

## 4. Vòng đời đơn

Admin chỉ được đi theo chuỗi:

```text
PENDING -> CONFIRMED -> SHIPPING -> DELIVERED
       \-> CANCELLED
CONFIRMED -> CANCELLED
```

Body cập nhật:

```http
PUT /admin/orders/{id}/status
Content-Type: application/json

{ "status": "CONFIRMED" }
```

Lặp lại đúng trạng thái hiện tại là idempotent. Chuyển sai thứ tự trả `409 INVALID_ORDER_STATUS`.

| Sự kiện | `quantityOnHand` | `reservedQuantity` |
| --- | --- | --- |
| Checkout | Không đổi | Tăng theo số lượng |
| CONFIRMED | Không đổi | Không đổi |
| SHIPPING | Giảm theo số lượng | Giảm theo số lượng |
| DELIVERED | Không đổi | Không đổi |
| CANCELLED trước SHIPPING | Không đổi | Giảm theo số lượng |

Lần đầu sang `DELIVERED`, backend ghi `deliveredAt` và chuyển Payment COD từ `PENDING` sang `PAID` cùng transaction. Gọi lại `DELIVERED` giữ nguyên `deliveredAt`/`paidAt`. Đơn `CANCELLED` có `deliveredAt = null`, vì vậy module Review/Setup về sau chỉ cần kiểm tra owner và `status = DELIVERED` (kèm `deliveredAt` hợp lệ).

## 5. Tạo Admin để test

Đăng ký `t14.admin@pcstore.local`, sau đó đổi role trong database local:

```powershell
docker compose exec db psql -U pc_store_app -d pc_store -c "UPDATE users SET role='ADMIN' WHERE email='t14.admin@pcstore.local';"
```

Logout customer, login lại bằng admin, rồi chạy các request trong folder `Admin orders` của collection. Collection tự lưu `orderId` từ response checkout; cũng có thể sửa biến này thủ công.

## 6. Mã lỗi quan trọng

| HTTP/code | Khi nào |
| --- | --- |
| `400 VALIDATION_ERROR` | Thiếu/sai địa chỉ, COD hoặc Idempotency-Key |
| `401 UNAUTHORIZED` | Chưa đăng nhập/session hết hạn |
| `403 FORBIDDEN` | CUSTOMER gọi API Admin hoặc ngược lại |
| `404 RESOURCE_NOT_FOUND` | Không có đơn hoặc đơn thuộc user khác |
| `409 CART_EMPTY` | Giỏ không có dòng hàng |
| `409 OUT_OF_STOCK` | Tồn khả dụng không đủ sau khi khóa kho |
| `409 IDEMPOTENCY_KEY_REUSED` | Dùng lại key với body khác |
| `409 INVALID_ORDER_STATUS` | Chuyển trạng thái sai thứ tự |
| `409 INVENTORY_INCONSISTENT` | Dữ liệu reserved không khớp dòng đơn |

## 7. Chạy test tự động

Unit/build nhanh:

```powershell
cd backend
mvn -B test
```

Integration test cần PostgreSQL test riêng và ba biến `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD` trỏ tới database có quyền tạo/drop schema. Bộ `OrderServiceIT` kiểm tra checkout lặp đồng thời, hai customer tranh món cuối, snapshot, quyền owner, hủy idempotent và `deliveredAt` chỉ ghi một lần.
