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


## Quy tắc Git

### Nhánh

- Kiểm tra nhánh hiện tại và trạng thái working tree trước khi sửa code.
- Không sửa code trực tiếp trên main hoặc master.
- Khi bắt đầu công việc mới, tạo nhánh theo định dạng:
  codex/<type>/<mo-ta-ngan>
- Các type hợp lệ: feat, fix, refactor, docs, test, chore.
- Mô tả dùng tiếng Anh, chữ thường, phân cách bằng dấu gạch ngang.
- Ví dụ: codex/feat/product-management, codex/fix/login-session.
- Tiếp tục dùng nhánh hiện tại nếu nhánh đó dành cho công việc đang làm.
- Không ghi đè, xóa hoặc hoàn tác thay đổi có sẵn của người dùng.

### Commit

- Chỉ tạo commit khi người dùng yêu cầu.
- Dùng định dạng Conventional Commits:
  <type>(<scope>): <description>
- Các type hợp lệ: feat, fix, refactor, docs, test, chore,
  build, ci, perf, revert.
- Scope có thể bỏ qua nếu thay đổi không thuộc một phạm vi cụ thể.
- Description dùng tiếng Anh, ngắn gọn, diễn đạt hành động,
  không có dấu chấm cuối.
- Ví dụ:
  feat(product): add product search
  fix(auth): handle expired sessions
  refactor(dao): simplify database access
- Mỗi commit chỉ chứa các thay đổi liên quan đến một mục đích.
- Kiểm tra diff và stage từng file hoặc từng phần liên quan.
- Chạy build và các kiểm tra phù hợp trước khi commit.
- Nếu kiểm tra thất bại hoặc không chạy được, báo rõ trước khi commit.
- Không commit secrets, mật khẩu, token, file .env chứa cấu hình thật,
  log, file IDE cá nhân hoặc kết quả build.
- Có thể commit .env.example nếu chỉ chứa giá trị mẫu.

### Push và merge

- Chỉ push, tạo PR hoặc merge khi người dùng yêu cầu.
- Không force push, amend commit đã push, reset --hard hoặc xóa nhánh
  khi chưa được người dùng cho phép rõ ràng.
- Không tự ý bỏ qua Git hooks hoặc kiểm tra CI.