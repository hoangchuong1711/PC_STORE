# PC Store

Dự án môn Lập trình Web xây dựng cửa hàng linh kiện máy tính. Frontend dùng Next.js/TypeScript; backend dùng Java 21, Servlet trên Tomcat 10.1, Service → DAO → JPA/Hibernate → PostgreSQL 17. Frontend gọi backend qua HTTP/JSON. Flyway quản lý schema và Hibernate dùng `validate`.

## Chạy bằng Docker

Cần Docker Desktop ở chế độ Linux containers và Docker Compose. Từ thư mục gốc:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Đặt POSTGRES_PASSWORD và các biến Cloudinary nếu dùng upload media.
docker compose up --build -d
```

- Frontend: http://localhost:3000
- Backend và Swagger UI: http://localhost:8080/pc-store-backend/api-docs/
- Health qua frontend: http://localhost:3000/api/health

Trong Swagger UI, gọi `POST /api/auth/login` trước khi thử endpoint cần session; trình duyệt sẽ gửi cookie phiên cho các request tiếp theo.

Backend luôn dùng cổng host `8080`. Nếu cổng này đang bị ứng dụng khác chiếm, giải phóng cổng trước khi chạy Compose. Để chỉ khởi động backend cùng database, chạy `docker compose up --build -d backend`. Sau khi sửa code, chạy lại `docker compose up --build -d`; xem log bằng `docker compose logs -f backend` và dừng bằng `docker compose down`. Volume PostgreSQL được giữ khi dừng. Không commit `.env`.

Upload ảnh/video cần `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trong `.env` ở thư mục gốc. Compose truyền các biến này vào backend. Xem [hướng dẫn media](backend/T21_MEDIA.md) để biết giới hạn và trạng thái kiểm chứng.

Nếu chạy frontend riêng trong VS Code, vào `frontend/`, chạy `npm install` rồi `npm run dev`. Frontend cần backend hoạt động để gọi API thật.

## Tìm tài liệu

- [Mục lục tài liệu và phạm vi](docs/README.md): bắt đầu tại đây khi đọc thiết kế dự án.
- [Kế hoạch T01–T38](docs/plane.md): bản kế hoạch và quan hệ phụ thuộc; trạng thái task xem trên Plane.
- [Mô hình dữ liệu](docs/data-model.md): schema mục tiêu và quy tắc dữ liệu.
- [Hướng dẫn kiểm thử](docs/testing.md): lệnh test backend/frontend.
- [OpenAPI](backend/src/main/webapp/api-docs/openapi.yaml): đặc tả API được phục vụ cùng Swagger UI.
- [AGENTS.MD](AGENTS.MD): quy tắc làm việc và Git của nhóm.

Tài liệu thiết kế có thể mô tả chức năng chưa triển khai. Đối chiếu code, migration và Work Item trước khi báo tính năng hoàn thành.
