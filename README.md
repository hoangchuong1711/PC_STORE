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
```

build docker và chạy BE+FE: "docker compose up --build -d"

nếu đã được build sẵn chạy lệnh:"docker compose up -d"

nếu chỉ muốn chạy BE: "docker compose up --build -d backend"
nếu chỉ muốn chạy FE:"
cd frontend
npm install
npm run dev
"

- Giao diện: http://localhost:3000
- Swagger UI (danh sách và thử API): http://localhost:8080/pc-store-backend/api-docs/
  Đổi `8080` theo `BACKEND_PORT` nếu có. Sau khi lấy thay đổi này, rebuild bằng
  `docker compose up --build -d backend`. Gọi `POST /api/auth/login` trong Swagger
  trước khi thử API cần session; trình duyệt tự quản lý cookie. Xem [hướng dẫn API](backend/API_DOCS.md).
- Kiểm tra API và kết nối database: http://localhost:3000/api/health

Nếu Compose báo cổng `8080` đang được sử dụng, backend không khởi động được và frontend phụ thuộc backend cũng chưa chạy. Đặt `BACKEND_PORT=8081` trong `.env`, rồi chạy lại `docker compose up -d`. Giao diện vẫn ở `http://localhost:3000`;

Upload ảnh/video của T21 cần `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `.env` của Compose và API key có quyền upload. Backend dùng FFmpeg trong image Docker để xử lý video Review tối đa 10 giây; giới hạn và cách gắn media vào bài xem tại [T21 media](backend/T21_MEDIA.md). Không đưa URL hoặc khóa Cloudinary ra frontend.

Để xem log: `docker compose logs -f backend`. Sau khi sửa mã nguồn, chạy lại `docker compose up --build -d`. Dừng ứng dụng bằng `docker compose down`; dữ liệu vẫn nằm trong Docker volume. Không commit file `.env`.

## Cấu trúc repo


| Đường dẫn | Nội dung |
| --- | --- |
| `frontend/` | Ứng dụng Next.js |
| `backend/` | API Java Servlet, JPA và Flyway migrations |
| `docs/` | Phạm vi và thiết kế dữ liệu |
| `compose.yaml` | Chạy frontend, backend và PostgreSQL |

# Quy tắc Git — PC Store

## 1. Chiến lược nhánh

- `main` là nhánh tích hợp chung, luôn ưu tiên trạng thái chạy được.
- Không code trực tiếp trên `main`.
- Mỗi Work Item trên Plane tương ứng với một nhánh và một Pull Request theo mặc định.
- Nhánh mới được tạo từ `main` mới nhất, trừ trường hợp được thống nhất dùng stacked branches.
- Một thành viên có thể nhận nhiều Work Item nhưng phải quản lý các nhánh riêng biệt.
- Không tự ý gộp các task đã được phân công.

### Quy tắc đặt tên

`<type>/<task-id>-<short-description>`

Type hợp lệ:
- `feat`: chức năng mới.
- `fix`: sửa lỗi.
- `refactor`: tái cấu trúc code.
- `docs`: tài liệu.
- `test`: kiểm thử.
- `chore`: bảo trì, cấu hình và công việc phụ trợ.

Sử dụng mã Txx trong kế hoạch. Các issue phát sinh dùng mã issue thực tế của Plane. Mô tả bằng tiếng Anh, viết thường, phân cách bằng dấu gạch ngang.

Ví dụ:
- `feat/t05-catalog-api`
- `feat/t06-auth-api`
- `feat/t25-builder-ui`
- `fix/pc-42-checkout-duplicate`
- `docs/t36-demo-readme`

### Quy tắc triển khai nhiều task

- Task độc lập: tạo các nhánh riêng từ `main`.
- Task phụ thuộc: ưu tiên merge task tiền nhiệm trước khi tạo nhánh task tiếp theo.
- Nếu cần làm đồng thời hai task phụ thuộc, trưởng nhóm có thể chấp thuận stacked branches và quy định rõ thứ tự merge.
- Chỉ gộp task khi kế hoạch trên Plane đã được cập nhật và thống nhất.

## 2. Quy tắc Commit

Sử dụng Conventional Commits với định dạng:

`<type>(<scope>): <description> [task-id]`

Các type hợp lệ: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `revert`.

Scope đại diện cho khu vực thay đổi, chẳng hạn `auth`, `catalog`, `cart`, `order`, `builder`, `review`, `community`, `db`, `docker`.

Ví dụ:
- `feat(auth): implement session login [T06]`
- `feat(cart): add quantity validation [T13]`
- `test(order): cover concurrent checkout [T19]`
- `fix(checkout): prevent duplicate orders [PC-42]`

Quy tắc:
- Một commit chỉ tập trung vào một mục đích.
- Một task có thể có nhiều commit.
- Kiểm tra diff và stage đúng những file liên quan.
- Chạy các bài kiểm tra phù hợp trước khi commit.
- Không commit secrets, cấu hình cá nhân, log và kết quả build.
- Có thể commit `.env.example` với các giá trị mẫu.

## 3. Pull Request và Merge

- Mỗi task sử dụng một PR hướng về `main`, trừ stacked PR được chấp thuận.
- Tiêu đề PR phải chứa mã task.
- Nội dung PR mô tả thay đổi chính, Work Item liên quan, kết quả kiểm thử và ảnh minh chứng nếu có.
- Gắn đường dẫn PR vào Work Item trên Plane.
- Khi mở PR để review, chuyển Work Item sang In Review.
- Yêu cầu ít nhất một thành viên khác review.
- Không tự merge PR khi chưa đạt điều kiện nghiệm thu.
- Ưu tiên Squash Merge để lịch sử trên `main` gọn gàng.
- Sau khi merge thành công và nghiệm thu đạt, chuyển Work Item sang Done.

## 4. Database và các file dùng chung

- Chỉ định một người điều phối migration Flyway và thay đổi schema.
- Migration đã merge không được tự ý sửa hoặc xóa. Thay đổi tiếp theo phải sử dụng migration mới.
- Các nhánh có thay đổi schema phải phối hợp với người phụ trách database trước khi mở PR.
- Không đưa mật khẩu hoặc dữ liệu nhạy cảm vào seed và tài liệu mẫu.
- Các thay đổi ảnh hưởng đến API chung phải thông báo cho thành viên FE/BE liên quan.

## 5. Quy tắc an toàn

- Kiểm tra nhánh hiện tại và working tree trước khi sửa code.
- Không ghi đè hoặc hoàn tác thay đổi chưa được đồng ý của thành viên khác.
- Không force push, reset --hard hoặc viết lại lịch sử nhánh dùng chung khi chưa được chấp thuận.
- Không bỏ qua Git hooks hoặc CI.
- Khi PR chưa đạt, tiếp tục sửa trên chính nhánh của PR đó.
- Sau khi merge, nếu phát sinh lỗi mới, ưu tiên tạo issue và nhánh sửa lỗi riêng.

## 6. Quy tắc bổ sung dành cho AI Assistant

- AI có thể tạo và chỉnh sửa nhánh phục vụ task được giao.
- Chỉ commit khi người dùng yêu cầu.
- Chỉ push, tạo PR hoặc merge khi người dùng yêu cầu.
- Không amend commit đã push hoặc xóa nhánh khi chưa có sự đồng ý rõ ràng.
- Nếu build hoặc kiểm thử thất bại, phải báo cáo kết quả và nguyên nhân đã xác định thay vì tuyên bố task hoàn tất.
- Không tự ý thay đổi phạm vi task hoặc sửa code ngoài khu vực được giao.
