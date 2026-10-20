# T24 — API lưu build và thêm vào giỏ

Nhánh `feat/t24-build-api` triển khai build `MANUAL` trên schema `pc_builds` và `pc_build_items` đã có. Mỗi request dùng session Customer; truy vấn build luôn lọc theo `user_id`. Build của người khác trả `BUILD_NOT_FOUND` (404).

| Phương thức | URL | Kết quả |
| --- | --- | --- |
| GET | `/api/customer/builds` | Danh sách build của người dùng |
| POST | `/api/customer/builds` | Tạo build MANUAL (201) |
| GET | `/api/customer/builds/{id}` | Chi tiết build |
| PUT | `/api/customer/builds/{id}` | Thay tên và toàn bộ linh kiện |
| DELETE | `/api/customer/builds/{id}` | Xóa build (204) |
| POST | `/api/customer/builds/{id}/cart` | Gộp toàn bộ linh kiện vào giỏ |

Body tạo/sửa: `{ "name": "My PC", "items": [{ "productId": 1, "quantity": 1 }] }`. `items` có thể rỗng để lưu bản nháp. Trùng productId, ID/số lượng không dương, tên rỗng hoặc quá 255 ký tự bị từ chối. Giá không nhận từ client; mỗi lần đọc build lấy giá hiện hành của `products.price`, tính `lineTotal` và `totalAmount`. Response có `compatibility` theo T23, gồm trạng thái tổng và kết quả từng rule.

Thêm giỏ yêu cầu `compatibility.status = PASS`; `FAIL`/`UNKNOWN` trả `BUILD_NOT_READY` (409). Service kiểm tra sản phẩm còn bán, tồn khả dụng và lượng đã có trong giỏ. Toàn bộ 8 món được gộp trong một transaction; lỗi ở một món sẽ rollback tất cả. Giá giỏ cũng lấy từ catalog hiện tại. Thao tác này không giữ tồn, checkout vẫn kiểm tra lại. Hiện chưa xử lý `RECOMMENDATION`/`ownedQuantity` của giai đoạn advanced; build loại đó không cho sửa/xóa/thêm giỏ qua API này.

Kiểm thử: `BuildServiceIT` dùng PostgreSQL và seed T09/T22 để kiểm tra quyền, CRUD, giá mới, PASS/UNKNOWN, giỏ và rollback khi thiếu tồn. `BuildServletTest` kiểm tra session, JSON, ID và route lỗi.
