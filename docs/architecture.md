# Kiến trúc và quyết định triển khai

## Stack đã chốt

| Phần | Quyết định |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui. Repo hiện dùng npm (`package-lock.json`). |
| Backend | Java 21, Java Servlet, Tomcat 10.1, Maven; API HTTP/JSON. |
| Phân lớp | Servlet/Controller → Service → DAO → JPA (`EntityManager`, Hibernate provider) → PostgreSQL. |
| Authentication | `HttpSession`/cookie; quyền Customer/Admin được kiểm tra ở backend, dùng Filter khi phù hợp. |
| Database | PostgreSQL là database chính. Schema thay đổi phải có migration hoặc script được commit; không chỉ sửa DB bằng GUI trên một máy. |
| Môi trường nhóm | Docker Compose là mục tiêu đồng bộ môi trường, chưa có cấu hình trong repo. |

Next.js làm giao diện và gọi Java API. Không dùng Next.js làm backend nghiệp vụ chính hoặc truy cập PostgreSQL trực tiếp. Servlet xử lý HTTP, Service giữ quy tắc và transaction, DAO truy cập dữ liệu qua JPA. Dùng `jakarta.servlet.*` và `jakarta.persistence.*` theo stack này.


## Giao diện giữa frontend và backend

API trả JSON qua HTTP. Không trả trực tiếp entity có `passwordHash` hay quan hệ vòng; dùng request/response DTO. Lỗi trả mã HTTP và thông điệp ổn định. Khi một luồng chuẩn bị code, ghi endpoint, request, response, lỗi và quyền truy cập vào Work Item hoặc `docs/api.md` (tạo file khi API đầu tiên được chốt), rồi frontend/backend cùng theo hợp đồng đó.

