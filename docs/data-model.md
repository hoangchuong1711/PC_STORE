# Mô hình dữ liệu CORE — T03

ERD dưới đây mô tả thiết kế CORE theo `backend/BACKEND_GUIDE.md`. **Hiện chỉ bảng `brands` được triển khai bằng Flyway V1 và ánh xạ JPA.** Các bảng còn lại là kế hoạch cho migration tiếp theo; sơ đồ không có nghĩa chúng đã tồn tại trong database.

## Sơ đồ quan hệ

```mermaid
erDiagram
    users ||--o| carts : "sở hữu"
    users ||--o{ orders : "đặt"
    categories ||--o{ products : "phân loại"
    brands ||--o{ products : "sản xuất"
    products ||--o| inventory : "có tồn kho"
    carts ||--o{ cart_items : "chứa"
    products ||--o{ cart_items : "được chọn"
    orders ||--o{ order_items : "gồm"
    products ||--o{ order_items : "được mua"
    orders ||--o| payments : "ghi thanh toán"

    users {
        int user_id PK
        string full_name
        string email UK
        string password_hash
        string address
        string phone
        string role
        string status
    }
    categories {
        int category_id PK
        string name
        string description
        string component_type "Có thể trống"
        string status
    }
    brands {
        int brand_id PK
        string name
        string description
        string logo_url
        string status
    }
    products {
        int product_id PK
        string name
        string description
        decimal price
        string status
        int category_id FK
        int brand_id FK
    }
    inventory {
        int inventory_id PK
        int product_id FK, UK
        int quantity_on_hand
    }
    carts {
        int cart_id PK
        int user_id FK, UK
        timestamp created_at
        timestamp updated_at
    }
    cart_items {
        int cart_item_id PK
        int cart_id FK
        int product_id FK
        int quantity
    }
    orders {
        int order_id PK
        int user_id FK
        timestamp order_date
        string status
        decimal total_amount
        string shipping_name
        string shipping_phone
        string shipping_address_text
        timestamp delivered_at "Có thể trống"
    }
    order_items {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price "Giá chốt lúc mua"
    }
    payments {
        int payment_id PK
        int order_id FK, UK
        string method
        decimal amount
        string status
        string transaction_id "Có thể trống"
        timestamp paid_at "Có thể trống"
    }
```

Sơ đồ thể hiện khả năng lưu trữ của PK/FK: một Product có tối đa một Inventory, một Order có thể chưa có dòng hàng/thanh toán trong lúc tạo. Service phải tạo đầy đủ Inventory khi thêm sản phẩm và ít nhất một OrderItem cùng Payment khi checkout, trong cùng transaction. FK đơn thuần không bắt buộc bản ghi cha phải có bản ghi con.

## Bảng đã triển khai: brands

| Cột | Kiểu PostgreSQL | Ràng buộc |
| --- | --- | --- |
| `brand_id` | `INTEGER` | PK, tự sinh bằng identity |
| `name` | `VARCHAR(120)` | Không được NULL |
| `description` | `TEXT` | Cho phép NULL |
| `logo_url` | `VARCHAR(2048)` | Cho phép NULL |
| `status` | `VARCHAR(20)` | Không NULL, mặc định ACTIVE, CHECK ACTIVE/INACTIVE |

Entity: `com.pcstore.entity.Brand`; enum `ActiveStatus` lưu bằng chuỗi. Tên hãng chưa bị buộc duy nhất vì guide chưa chốt quy tắc đó. Migration và test hiện chỉ sử dụng bảng này.

## Ràng buộc dự kiến cho phần CORE còn lại

- Tên bảng/cột dùng `snake_case`; dùng `users` và `orders` để tránh trùng từ khóa. Tên trong sơ đồ là đề xuất cho migration tiếp theo.
- Email duy nhất; một Cart/User; một Inventory/Product; một Payment/Order; cặp `(cart_id, product_id)` duy nhất.
- Giá dùng Java `BigDecimal` và PostgreSQL `NUMERIC`, không âm. Chốt precision/scale trước migration tương ứng.
- Số lượng CartItem/OrderItem lớn hơn 0; `quantity_on_hand` không âm. CORE trừ tồn khi đặt và hoàn tồn khi hủy hợp lệ, không dùng giữ chỗ bằng `reservedQuantity`.
- OrderItem lưu `unit_price`; Order lưu thông tin người nhận và địa chỉ tại lúc đặt. Các field Promotion bổ sung ở đợt sau.
- Payment hỗ trợ COD/BANK_TRANSFER, trạng thái PENDING/PAID/FAILED. Order dùng PENDING/CONFIRMED/SHIPPING/DELIVERED/CANCELLED.
- Không cascade xóa User/Product vào lịch sử Order. Chốt FK, index và chính sách xóa trong migration từng bảng.
- ProductImage chỉ thêm khi API/UI yêu cầu; PC Builder, Spec và Compatibility thuộc T17. Không tạo Address/AdministrativeArea trong CORE hiện tại.

## Flyway và cách kiểm chứng

V1 nằm ở `backend/src/main/resources/db/migration/V1__create_brands.sql`. `JpaConfig` chạy Flyway trước Hibernate `validate`; Hibernate không tự sửa schema. Flyway ghi lịch sử trong `flyway_schema_history`.

Chạy `mvn -f backend/pom.xml clean verify -Pintegration-tests` với Docker Desktop đang bật để kiểm tra migration, mapping và ghi/đọc bảng `brands` trên PostgreSQL 17 riêng. Xem hướng dẫn và báo cáo tại [README](../README.md).
