# Hướng dẫn làm việc trong PC Store

- Dùng `README.md` để nắm cách chạy và kiến trúc dự án. Khi công việc liên quan đến phạm vi, đọc `docs/scope.md`; khi liên quan API, database hoặc authentication, đọc thêm `backend/BACKEND_GUIDE.md` và `docs/data-model.md` nếu phù hợp.
- Bám thứ tự CORE → FEATURE → ADVANCED. Không tự mở rộng scope khi Work Item chỉ yêu cầu một lát cắt nhỏ. Nếu tài liệu chưa quyết định một lựa chọn ảnh hưởng nhiều module, nêu lựa chọn cần chốt thay vì âm thầm mặc định.
- Backend chính dùng Java 21, Java Servlet trên Tomcat 10.1, Service → DAO → JPA/Hibernate → PostgreSQL. Giữ yêu cầu Servlet + JPA + DAO của môn học. Không chuyển sang Spring Boot hoặc JDBC thuần để thay kiến trúc đã chốt.
- Frontend dùng Next.js + TypeScript; nghiệp vụ và truy cập database thuộc Java backend. Trao đổi qua HTTP/JSON. Không đưa logic nghiệp vụ chính vào Next.js API routes hay Server Actions.
- Dùng `jakarta.*` tương thích Tomcat 10.1. Không trả JPA Entity trực tiếp nếu có thể lộ trường nhạy cảm hoặc quan hệ vòng; dùng DTO cho API. Kiểm tra quyền, giá, tồn kho và dữ liệu đầu vào ở backend.
- Khi thêm hoặc sửa API, schema hay quy tắc nghiệp vụ, cập nhật tài liệu liên quan cùng thay đổi code. Không chép toàn bộ Page Plane vào code hoặc tài liệu.
- Trước khi kết thúc, chạy kiểm tra phù hợp với phần đã sửa và báo rõ phần chưa chạy được. Không ghi là tính năng hoàn tất khi mới có scaffold hoặc giao diện mẫu.
- Không commit `.env`, mật khẩu, session secret hoặc API key. Chỉ commit file ví dụ không có giá trị thật.

Trong `frontend/` còn `AGENTS.md` do Next.js sinh ra. Khi sửa frontend, tuân theo cả hướng dẫn ở đó về việc tra tài liệu Next.js theo phiên bản đang cài.


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