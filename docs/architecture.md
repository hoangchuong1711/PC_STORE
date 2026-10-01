# Kiến trúc và quyết định triển khai

## Stack đã chốt

| Phần | Quyết định |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui. Repo hiện dùng npm (`package-lock.json`). |
| Backend | Java 21, Java Servlet, Tomcat 10.1, Maven; API HTTP/JSON. |
| Phân lớp | Servlet/Controller → Service → DAO → JPA (`EntityManager`, Hibernate provider) → PostgreSQL. |
| Authentication | `HttpSession`/cookie; quyền Customer/Admin được kiểm tra ở backend, dùng Filter khi phù hợp. |
| Database | PostgreSQL 17; Flyway quản lý phiên bản schema bằng SQL trong `backend/src/main/resources/db/migration`. Hibernate chỉ kiểm tra mapping bằng `validate`. |
| Môi trường nhóm | Docker Compose là mục tiêu đồng bộ môi trường, chưa có cấu hình trong repo. |

Next.js làm giao diện và gọi Java API. Không dùng Next.js làm backend nghiệp vụ chính hoặc truy cập PostgreSQL trực tiếp. Servlet xử lý HTTP, Service giữ quy tắc và transaction, DAO truy cập dữ liệu qua JPA. Dùng `jakarta.servlet.*` và `jakarta.persistence.*` theo stack này.


## Giao diện giữa frontend và backend

API trả JSON qua HTTP. Không trả trực tiếp entity có `passwordHash` hay quan hệ vòng; dùng request/response DTO. Lỗi trả mã HTTP và thông điệp ổn định. Hợp đồng API đã triển khai nằm trong [api.md](api.md); hiện có `GET /api/health`.

## Khởi tạo database và kiểm thử

`JpaConfig` chạy Flyway trước khi tạo `EntityManagerFactory`, sau đó Hibernate kiểm tra schema. Hiện việc khởi tạo diễn ra khi gọi health lần đầu. PostgreSQL và database đích phải tồn tại; Flyway tạo bảng, không khởi tạo dịch vụ PostgreSQL. Biến `DB_URL`, `DB_USER`, `DB_PASSWORD` lấy từ môi trường, không lưu mật khẩu trong mã nguồn.

[Mô hình dữ liệu CORE](data-model.md) mô tả toàn bộ thiết kế. Phần triển khai hiện tại chỉ có migration `V1__create_brands.sql` và entity `Brand`; các bảng còn lại chưa triển khai. Đây là một phần của T03.

Test tích hợp `BrandDatabaseIT` dùng Testcontainers tạo PostgreSQL 17 riêng, chạy migration, kiểm tra mapping, ghi và đọc lại dữ liệu đã commit qua một factory mới. Chạy từ thư mục gốc bằng `mvn -f backend/pom.xml clean verify -Pintegration-tests`; cần Docker Desktop đang chạy. Test không dùng database phát triển. Hướng dẫn Smart Tomcat và kiểm tra database local nằm trong [README](../README.md).

