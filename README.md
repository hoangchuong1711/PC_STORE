# PC Store

Dự án môn Lập trình Web xây dựng cửa hàng linh kiện máy tính. Frontend dùng Next.js/TypeScript; backend dùng Java 21, Servlet trên Tomcat 10.1, Service → DAO → JPA/Hibernate → PostgreSQL 17. Frontend gọi backend qua HTTP/JSON. Flyway quản lý schema và Hibernate dùng `validate`.

## Chạy bằng Docker với Neon

Cần Docker Desktop ở chế độ Linux containers và Docker Compose. Từ thư mục gốc:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Điền NEON_DB_URL, NEON_DB_USER, NEON_DB_PASSWORD trong .env.
docker compose up --build -d
```

- Frontend: http://localhost:3000
- Backend và Swagger UI: http://localhost:8080/pc-store-backend/api-docs/
- Health qua frontend: http://localhost:3000/api/health

Trong Swagger UI, gọi `POST /api/auth/login` trước khi thử endpoint cần session; trình duyệt sẽ gửi cookie phiên cho các request tiếp theo.

`compose.yaml` chạy backend và frontend trên máy, backend kết nối Neon; lệnh này không khởi động PostgreSQL local. Backend dùng cổng host `8080`. Để chỉ khởi động backend, chạy `docker compose up --build -d backend`. Sau khi sửa code, chạy lại `docker compose up --build -d`; xem log bằng `docker compose logs -f backend` và dừng bằng `docker compose down`. Không commit `.env`. Nếu `.env` cũ đã bật seed/VNPay cho local, cấu hình Neon vẫn dùng các cờ riêng `NEON_DEMO_SEED_ENABLED`, `NEON_DEMO_ACCOUNTS_ENABLED`, `NEON_VNPAY_ENABLED` (đều mặc định `false`).

Upload ảnh/video cần `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trong `.env` ở thư mục gốc. Compose truyền các biến này vào backend. Xem [hướng dẫn media](backend/T21_MEDIA.md) để biết giới hạn và trạng thái kiểm chứng.

### Dữ liệu và tài khoản demo

Seed mặc định tắt ở cả hai cách chạy. Bật `DEMO_SEED_ENABLED=true` cho DB local hoặc `NEON_DEMO_SEED_ENABLED=true` cho Neon nếu thực sự cần nạp dữ liệu. Sau Flyway, backend chạy các file trong `DemoDataSeeder.SQL_SEEDS` theo thứ tự `t05_catalog.sql`, `t09_catalog.sql`, `t22_builder_specs.sql`. Hai file T09/T22 hiện còn `BEGIN`/`COMMIT` riêng dù Java cũng quản lý transaction; cần rà soát trước khi dựa vào seed tự động trên DB dùng chung. Chỉ bật seed trên một DB khi đã xác nhận script chạy lặp an toàn và không ghi đè dữ liệu đã sửa.

Hai tài khoản thử đăng nhập chỉ được tạo khi cả seed và tài khoản demo đều bật cho cùng môi trường (`DEMO_*` trên local, `NEON_DEMO_*` trên Neon) rồi khởi động lại backend. Thông tin demo: `admin@gmail.com` / `admin123` (ADMIN) và `user@gmail.com` / `user123` (CUSTOMER). Backend hash mật khẩu bằng `PasswordUtil`; SQL seed không lưu mật khẩu thô. Nếu DB local còn hai tài khoản demo cũ, seed đổi email và mật khẩu của chúng nhưng giữ `user_id`; các lần chạy tiếp theo không reset tài khoản với email mới. Không bật tài khoản demo mật khẩu mặc định trên backend public. Tắt cờ seed chỉ ngừng chạy seed; dữ liệu đã nạp vẫn nằm trong DB.

Nếu chạy frontend riêng trong VS Code, vào `frontend/`, chạy `npm install` rồi `npm run dev`. Frontend cần backend hoạt động để gọi API thật.

## Các môi trường local, Neon và Railway

| Cách chạy | Backend | Database | Dùng cấu hình nào |
| --- | --- | --- | --- |
| `docker compose up --build -d` | Docker trên máy | Neon | `compose.yaml` |
| `docker compose -f compose.local.yaml up --build -d` | Docker trên máy | PostgreSQL local trong Compose | `compose.local.yaml` |
| Gọi URL Railway | Railway | Neon, theo biến `DB_*` của Railway | Cấu hình service Railway; không dùng Compose trên máy |

`compose.neon.yaml` là file override của cách chạy cũ, không cần dùng với cấu hình mới. Nó không điều khiển backend đã deploy trên Railway. Các thao tác ghi API, kể cả tạo đơn trên Swagger/Postman, lưu vào DB mà backend nhận request đang kết nối. Hai DB không tự đồng bộ dữ liệu.

### Chuyển sang DB local khi cần

Đặt `POSTGRES_PASSWORD` trong `.env`. Nếu đang chạy cấu hình Neon trên máy, dừng nó bằng `docker compose down`; sau đó chạy cấu hình local độc lập (không cần biến Neon):

```powershell
docker compose -f compose.local.yaml up --build -d
```

Lệnh `down` dừng các container Neon chạy trên máy; nó không xóa DB Neon. `compose.local.yaml` tạo PostgreSQL local với volume `pcstore_pgdata`. Để nạp seed demo vào DB local, đặt `DEMO_SEED_ENABLED=true` trong `.env` và tạo lại backend sau khi đã kiểm tra script; mặc định ví dụ đang tắt seed. Dừng bằng `docker compose -f compose.local.yaml down` thông thường vẫn giữ volume.

Để quay lại backend local kết nối Neon:

```powershell
docker compose -f compose.local.yaml down
docker compose up --build -d
```

Backend chạy Flyway trên DB được chọn khi khởi tạo kết nối; migration đã áp dụng được theo dõi trong `flyway_schema_history` của từng DB. Volume PostgreSQL local được giữ khi dùng `down` không kèm `-v`.

### Backend chung trên Railway

Backend đang được triển khai từ thư mục `/backend` bằng `backend/Dockerfile` (Java 21, Tomcat 10.1). Domain Railway đã cấp là `pcstore-production-f981.up.railway.app`. Các đường dẫn để kiểm tra:

- Catalog: https://pcstore-production-f981.up.railway.app/pc-store-backend/api/categories
- Swagger UI: https://pcstore-production-f981.up.railway.app/pc-store-backend/api-docs/

Trên service Railway, đặt `DB_URL` (JDBC URL Neon có `sslmode=require`), `DB_USER`, `DB_PASSWORD`, `PORT=8080`, `TZ=Asia/Ho_Chi_Minh`, `DEMO_SEED_ENABLED=false` và `DEMO_ACCOUNTS_ENABLED=false`. Chỉ bật seed trên DB chung sau khi kiểm tra script và có chủ đích nạp dữ liệu; không bật tài khoản demo mật khẩu mặc định trên backend public. Railway lấy code đã push lên nhánh triển khai; thay đổi chỉ có trên máy local chưa xuất hiện ở service. Có thể dùng `/pc-store-backend/api/categories` làm healthcheck sau khi xác nhận endpoint trả HTTP 200. Lưu mật khẩu/secret trong Railway Variables, không đưa vào Git.

Nếu chạy frontend local và muốn gọi backend Railway, đặt `BACKEND_ORIGIN=https://pcstore-production-f981.up.railway.app` trong môi trường frontend rồi khởi động lại frontend. Không thêm `/pc-store-backend` vào biến này vì `frontend/next.config.ts` đã nối đường dẫn đó. Giữ `CORS_ALLOWED_ORIGINS` trên backend phù hợp với origin của frontend đang dùng (ví dụ `http://localhost:3000`).

VNPay Sandbox **chưa cấu hình cho backend chung** vì tài khoản Sandbox mới chưa được tạo. Khi có tài khoản, cấu hình `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`, `VNPAY_API_URL`, `VNPAY_RETURN_URL` và bật `VNPAY_ENABLED` trên Railway. Địa chỉ IPN phía backend là `https://pcstore-production-f981.up.railway.app/pc-store-backend/api/payment/vnpay/ipn`; return URL trỏ về frontend (có thể là `http://localhost:3000/orders/payment-return` khi frontend chạy local). Kiểm tra luồng thanh toán và callback thực tế trước khi coi VNPay đã hoạt động. Xem [thiết kế VNPay](docs/T20B_VNPAY.md).

## Tìm tài liệu

- [Mục lục tài liệu và phạm vi](docs/README.md): bắt đầu tại đây khi đọc thiết kế dự án.
- [Kế hoạch T01–T38](docs/plane.md): bản kế hoạch và quan hệ phụ thuộc; trạng thái task xem trên Plane.
- [Mô hình dữ liệu](docs/data-model.md): schema mục tiêu và quy tắc dữ liệu.
- [Hướng dẫn kiểm thử](docs/testing.md): lệnh test backend/frontend.
- [OpenAPI](backend/src/main/webapp/api-docs/openapi.yaml): đặc tả API được phục vụ cùng Swagger UI.
- [AGENTS.MD](AGENTS.MD): quy tắc làm việc và Git của nhóm.

Tài liệu thiết kế có thể mô tả chức năng chưa triển khai. Đối chiếu code, migration và Work Item trước khi báo tính năng hoàn thành.
