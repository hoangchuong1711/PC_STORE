# T32 — Ghép Builder với catalog, tương thích và giỏ hàng

Giao diện `/builder` dùng sản phẩm từ `GET /api/builder/products`. Endpoint công khai chỉ trả sản phẩm ACTIVE, brand/category ACTIVE, còn tồn và thuộc một trong tám nhóm Builder. Mỗi dòng có `productId`, giá hiện tại, tồn khả dụng và `spec` đọc từ bảng tương ứng; thiếu dòng spec trả `null`. Không dùng mã sản phẩm mẫu trong giao diện mua hàng.

Sau mỗi lần chọn/gỡ linh kiện, FE gửi `{ "items": [{ "productId": 1, "quantity": 1 }] }` tới `POST /api/builder/compatibility`. Endpoint không cần đăng nhập và không lưu build; nó dùng `CompatibilityService` của T23. FE chỉ hiển thị kết quả mới nhất, không suy luận `PASS` từ spec cục bộ. Lỗi mạng/đầu vào không được coi là PASS.

Customer có thể lưu, xem lại, sửa và xóa build MANUAL qua API T24. Để mua, FE lưu lựa chọn hiện tại rồi gọi `POST /api/customer/builds/{id}/cart`; chỉ cập nhật giỏ và thông báo thành công khi endpoint trả về cart. Backend từ chối `FAIL`/`UNKNOWN`, sản phẩm không còn bán hoặc không đủ tồn. Checkout vẫn tính lại giá/tồn và tạo đơn theo CORE.

T09 + T22 là **dữ liệu demo/test** để chạy ít nhất hai cấu hình PASS cùng các ca FAIL/UNKNOWN. Chúng không tự động thay thế catalog kinh doanh. Database demo cần nạp seed hoặc thêm đủ sản phẩm thật có spec ở cả tám nhóm trước khi có thể mua một build hoàn chỉnh.

Trên Docker Compose local, có thể nạp seed demo lặp lại bằng các lệnh sau sau khi migration đã chạy:

```powershell
docker compose cp backend/src/main/resources/db/seed/t09_catalog.sql db:/tmp/t09_catalog.sql
docker compose exec -T db psql -U pc_store_app -d pc_store -v ON_ERROR_STOP=1 -f /tmp/t09_catalog.sql
docker compose cp backend/src/main/resources/db/seed/t22_builder_specs.sql db:/tmp/t22_builder_specs.sql
docker compose exec -T db psql -U pc_store_app -d pc_store -v ON_ERROR_STOP=1 -f /tmp/t22_builder_specs.sql
```

Script T09 chỉ chèn dữ liệu còn thiếu; T22 giữ nguyên các spec đã có. `frontend/tests/builder-live-ui.py` kiểm tra một build PASS từ tám sản phẩm demo trên ứng dụng đang chạy.

Giới hạn rule theo [T23](T23_COMPATIBILITY.md): chưa xác nhận BIOS, đầu nguồn, cổng lưu trữ và khả năng lắp radiator; PSU chỉ so công suất định mức với mức khuyến nghị GPU. `PASS` chỉ áp dụng cho các quy tắc cơ bản đã liệt kê.
