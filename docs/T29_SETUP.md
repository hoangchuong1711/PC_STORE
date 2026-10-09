# T29 — API bài đăng Setup

T29 triển khai bài đăng, ảnh và sản phẩm liên quan. T30 sở hữu like, ranking và kiểm duyệt. FE T31 dùng contract dưới đây; tích hợp UI thật thuộc T34.

## Quyền và endpoint

| Endpoint | Quyền | Kết quả |
| --- | --- | --- |
| `GET /api/setups?offset=0&limit=20` | Guest | Danh sách `PUBLISHED`, mới nhất trước; limit 1–50. |
| `GET /api/setups/{id}` | Guest | Chi tiết `PUBLISHED`; bài ẩn hoặc không có trả 404. |
| `GET /api/customer/setups/eligibility` | CUSTOMER | `{ "eligible": true, "reason": null }` hoặc `reason: "SETUP_PURCHASE_REQUIRED"`. |
| `GET /api/customer/setups` | CUSTOMER | Bài của mình, gồm `HIDDEN`; cùng tham số phân trang. |
| `GET /api/customer/setups/{id}` | Chủ bài | Chi tiết, gồm `HIDDEN`. |
| `POST /api/customer/setups` | CUSTOMER có ít nhất một Order `DELIVERED` | Tạo bài `PUBLISHED`, trả 201. |
| `PUT /api/customer/setups/{id}` | Chủ bài `PUBLISHED` | Thay toàn bộ nội dung, danh sách ảnh và Product. |
| `DELETE /api/customer/setups/{id}` | Chủ bài | Xóa cứng bài, trả 204; media chuyển `DELETE_PENDING`. |

Request tạo/sửa có dạng:

```json
{"title":"Góc máy của tôi","description":"Nội dung setup","mediaIds":["e6119ed8-b63c-4b97-8aba-2f9aa0c16a35"],"productIds":[1]}
```

`mediaIds` lấy từ `POST /api/customer/media/images` với `X-Media-Module: SETUP`. Có 1–8 ảnh; thứ tự mảng là thứ tự hiển thị. Khi sửa, gửi cả ID ảnh muốn giữ và ảnh tạm mới; ảnh không còn trong mảng được đưa vào hàng đợi dọn. `productIds` là ID Product ACTIVE có Category và Brand ACTIVE, ít nhất một, không trùng. Không bắt buộc còn hàng vì bài có thể giới thiệu linh kiện đã sở hữu; Product không cần nằm trong đơn đã mua. Tiêu đề trim, dài tối đa 255; mô tả trim và không rỗng. Không nhận `userId`, `status`, URL ảnh hoặc thông tin kiểm duyệt từ request.

Response gồm `postId`, `authorId`, `title`, `description`, `status`, `createdAt`, `updatedAt`, `mediaIds` và `products` (`productId`, `name`). Ảnh đọc qua `GET /api/media/{mediaId}/content`; media của bài ẩn chỉ chủ bài xem được theo T21. Thời gian là `LocalDateTime` của Asia/Bangkok. FE dùng `productId` để mở catalog/cart, không nhận giá từ bài đăng.

## Lỗi cần hiển thị

| HTTP | `code` | Trường hợp |
| --- | --- | --- |
| 400 | `INVALID_JSON`, `INVALID_SETUP`, `INVALID_ID` | JSON, nội dung hoặc tham số sai. |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập vào route CUSTOMER. |
| 403 | `FORBIDDEN`, `SETUP_PURCHASE_REQUIRED` | Không phải CUSTOMER hoặc chưa có đơn giao. |
| 404 | `SETUP_NOT_FOUND` | Bài không tồn tại, bài ngoài quyền, hoặc bài ẩn khi đọc công khai. |
| 409 | `SETUP_NOT_EDITABLE` | Chủ sửa bài đang bị ẩn. |
| 422 | `SETUP_IMAGE_REQUIRED`, `SETUP_PRODUCT_REQUIRED`, `SETUP_PRODUCT_INVALID` | Thiếu ảnh/Product hoặc Product không ACTIVE/không tồn tại. |
| 422 | `MEDIA_COUNT_LIMIT`, `DUPLICATE_MEDIA`, `MEDIA_NOT_AVAILABLE` | Quá 8 ảnh, ảnh lặp, hoặc media không đúng chủ/module/trạng thái/hết hạn. |

## Bàn giao T30 và QA

T30 cần dùng `setup_posts.status` khi like/ranking: chỉ bài `PUBLISHED` được công khai. Admin ẩn/khôi phục cập nhật metadata kiểm duyệt đã có trong schema. T29 không sửa status trong thao tác chủ bài. T30 cần quyết định đường xem media bài ẩn cho Admin: T21 hiện chỉ cấp quyền cho chủ bài. T30 giữ endpoint, DTO và dịch vụ like/moderation riêng, không sửa `SetupService` của T29.

QA dùng tối thiểu hai CUSTOMER, một đơn `DELIVERED`, một đơn chưa giao, Product ACTIVE và media `SETUP` tạm của từng chủ. Kiểm tra chưa mua, thiếu ảnh, Product sai, sửa/xóa trái chủ, bài ẩn rời feed/chi tiết và URL media không công khai. Sau tạo/sửa/xóa, kiểm tra transaction rollback và trạng thái media. Test Cloudinary thật còn phụ thuộc quyền Upload API được ghi trong [T21](T21_MEDIA.md).
