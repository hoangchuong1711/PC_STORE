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
