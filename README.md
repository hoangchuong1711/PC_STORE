# PC Store

PC Store là dự án môn Lập trình Web xây dựng cửa hàng linh kiện máy tính. Giao diện dùng Next.js; API dùng Java Servlet và lưu dữ liệu trong PostgreSQL.

## Công nghệ và kiến trúc

| Thành phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui | Giao diện và gọi API HTTP/JSON |
| Backend | Java 21, Servlet (`jakarta.*`), Tomcat 10.1, Maven | Xử lý request, nghiệp vụ và phân quyền |
| Database | PostgreSQL 17, JPA/Hibernate, Flyway | Lưu dữ liệu và quản lý phiên bản schema |

Luồng xử lý: **Next.js → Servlet → Service → DAO → JPA/Hibernate → PostgreSQL**. Nghiệp vụ và truy cập database thuộc backend. API dùng DTO thay vì trả trực tiếp JPA Entity. Schema được cập nhật bằng migration Flyway; Hibernate kiểm tra mapping bằng `validate`.

Trong Docker Compose, frontend chuyển tiếp `/api/*` đến backend. Backend kết nối PostgreSQL qua mạng nội bộ Compose. Thiết kế CORE và quy tắc triển khai chi tiết nằm trong [phạm vi](docs/scope.md), [mô hình dữ liệu](docs/data-model.md) và [hướng dẫn backend](backend/BACKEND_GUIDE.md). Những tính năng mô tả trong tài liệu thiết kế chưa đồng nghĩa đã được triển khai.

## Chạy dự án

Cần Docker Desktop ở chế độ Linux containers và Docker Compose. Từ thư mục gốc repo:

```powershell
Copy-Item .env.example .env
# Đổi POSTGRES_PASSWORD trong .env thành mật khẩu local
docker compose up --build -d
```

- Giao diện: http://localhost:3000
- Kiểm tra API và kết nối database: http://localhost:3000/api/health

Để xem log: `docker compose logs -f backend`. Sau khi sửa mã nguồn, chạy lại `docker compose up --build -d`. Dừng ứng dụng bằng `docker compose down`; dữ liệu vẫn nằm trong Docker volume. Không commit file `.env`.

## Cấu trúc repo

| Đường dẫn | Nội dung |
| --- | --- |
| `frontend/` | Ứng dụng Next.js |
| `backend/` | API Java Servlet, JPA và Flyway migrations |
| `docs/` | Phạm vi và thiết kế dữ liệu |
| `compose.yaml` | Chạy frontend, backend và PostgreSQL |

## Kiểm tra

Test tích hợp backend dùng Testcontainers và cần Docker đang chạy:

```powershell
mvn -f backend/pom.xml clean verify -Pintegration-tests
```

Lệnh này cần JDK 21 và Maven trên máy nếu chạy ngoài container. Test dùng PostgreSQL riêng, không thay đổi database của Compose.
