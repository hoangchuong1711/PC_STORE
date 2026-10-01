# API đang triển khai

## GET /api/health

- Quyền: công khai; không cần session.
- URL local: `http://localhost:8080/pc-store-backend/api/health`.
- Request: không có body.
- Ở lần đầu khởi tạo EntityManagerFactory, endpoint kích hoạt Flyway, kiểm tra mapping JPA rồi chạy `SELECT 1` qua JPA. Các request tiếp theo dùng lại factory.
- HTTP 200, `Content-Type: application/json; charset=UTF-8`:

```json
{"status":"ok","application":"pc-store-backend","database":"connected"}
```

- HTTP 503 khi thiếu cấu hình, DB không truy cập được, migration hoặc mapping thất bại:

```json
{"status":"unavailable","application":"pc-store-backend","database":"unavailable","message":"Không thể khởi tạo database. Kiểm tra cấu hình kết nối và log Tomcat."}
```

Chi tiết exception chỉ ghi trong log Tomcat, không đưa thông tin kết nối/mật khẩu ra response. Endpoint này chưa xác nhận nghiệp vụ CORE. Danh sách API nghiệp vụ trong `backend/BACKEND_GUIDE.md` vẫn là đề xuất cho các task tiếp theo.
