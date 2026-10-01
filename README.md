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

# Quy định đóng góp

## 1. Nhánh

- Không commit trực tiếp lên main hoặc master.
- Trước khi bắt đầu, cập nhật nhánh gốc và tạo nhánh riêng.
- Đặt tên nhánh theo định dạng:
  <type>/<mo-ta-ngan>
- Type hợp lệ: feat, fix, refactor, docs, test, chore.
- Mô tả dùng tiếng Anh, chữ thường, phân cách bằng dấu gạch ngang.
- Ví dụ:
  feat/product-management
  fix/login-session
- Nếu có issue, thêm mã issue:
  feat/123-product-management
- Không ghi đè hoặc hoàn tác thay đổi của thành viên khác.

## 2. Commit

- Dùng định dạng:
  <type>(<scope>): <description>
- Type hợp lệ: feat, fix, refactor, docs, test, chore,
  build, ci, perf, revert.
- Scope có thể bỏ qua nếu không cần thiết.
- Description dùng tiếng Anh, ngắn gọn, diễn đạt hành động,
  không có dấu chấm cuối.
- Ví dụ:
  feat(product): add product search
  fix(auth): handle expired sessions
- Mỗi commit tập trung vào một mục đích.
- Kiểm tra diff và các file đã stage trước khi commit.
- Chạy build và các kiểm tra liên quan trước khi mở PR để review.
- Không commit secrets, cấu hình thật trong .env, log,
  file IDE cá nhân hoặc kết quả build.
- Chỉ đưa giá trị mẫu vào .env.example.

## 3. Pull request

- Đưa thay đổi vào nhánh chính thông qua pull request.
- Mỗi PR tập trung vào một tính năng hoặc vấn đề.
- Mô tả PR phải có:
  - Mục đích thay đổi.
  - Nội dung chính.
  - Cách kiểm thử và kết quả.
  - Issue liên quan, nếu có.
- Thêm ảnh trước/sau nếu thay đổi giao diện.
- Có thể mở Draft PR khi công việc chưa hoàn tất.
- Yêu cầu ít nhất một thành viên khác review trước khi merge.

## 4. Merge và bảo vệ lịch sử

- Chỉ merge khi đã được approve, các thảo luận đã giải quyết
  và các kiểm tra CI bắt buộc đều đạt.
- Dùng squash merge để gộp mỗi PR thành một commit rõ ràng.
- Tiêu đề squash commit phải theo quy định commit.
- Không force push lên main, master hoặc nhánh dùng chung.
- Nếu cần viết lại lịch sử nhánh cá nhân đã push:
  thông báo cho người đang phối hợp và dùng --force-with-lease.
- Xóa nhánh tính năng sau khi PR đã merge và không còn ai sử dụng.
- Không bỏ qua Git hooks hoặc CI để né lỗi.