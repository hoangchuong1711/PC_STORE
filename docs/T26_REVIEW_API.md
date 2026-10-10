# T26 Review API — bàn giao FE/QA và contract T27

Tài liệu này chốt contract Review dựa trên `data-model.md`, migration T10, Order T14 và Media T21. OpenAPI chỉ công bố các endpoint T26 đã chạy; mục T27 bên dưới là contract dành trước để nhánh social/moderation triển khai mà không sửa `ReviewService`.

## Quy tắc dữ liệu và quyền

- Tác giả và Product luôn suy ra qua `ProductReview -> OrderItem -> Order/User` và `OrderItem -> Product`; API không nhận `authorId`.
- `POST` bắt buộc cả `orderItemId` và `productId`. Backend khóa dòng đơn, kiểm tra đúng chủ, đúng SKU, `Order.status=DELIVERED` và `deliveredAt` khác null.
- UNIQUE `product_reviews.order_item_id` bảo đảm một Review cho một dòng đơn, kể cả quantity lớn hơn 1. Bản `DELETED` vẫn giữ UNIQUE và phải restore, không được tạo bài thứ hai.
- Rating là số nguyên 1–5. Content được trim, dài 1–5000 ký tự. Review có 0–6 media T21, tối đa một video theo T21.
- Guest chỉ đọc bài `PUBLISHED`. Chủ bài được đọc cả `HIDDEN`/`DELETED`, chỉ sửa `PUBLISHED`, xóa mềm `PUBLISHED -> DELETED`, restore `DELETED -> PUBLISHED`; chủ không được vượt kiểm duyệt `HIDDEN`.
- Danh sách và summary chỉ tính `PUBLISHED`. Vì schema T10 không có `created_at/updated_at` trên `product_reviews`, `newest/oldest` hiện dùng `review_id DESC/ASC`; DTO không giả timestamp. Nếu FE bắt buộc hiển thị ngày, cần DB owner duyệt migration mới.
- Media của bài `HIDDEN`/`DELETED` không public; T21 kiểm tra trạng thái Review tại `/api/media/{mediaId}/content`.

## Endpoint T26 đã triển khai

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/api/reviews?productId=&page=0&size=20&rating=&hasMedia=&sort=` | Public | Trang Review `PUBLISHED`, kèm summary toàn sản phẩm |
| GET | `/api/reviews/summary?productId=` | Public | Trung bình và phân bố 5→1 chỉ từ `PUBLISHED` |
| POST | `/api/customer/reviews` | CUSTOMER | Tạo Review cho dòng đơn đã giao |
| GET | `/api/customer/reviews/{id}` | Chủ Review | Đọc bài của mình, gồm `HIDDEN`/`DELETED` |
| GET | `/api/customer/reviews/order-items/{orderItemId}` | Chủ OrderItem | Tìm Review để quyết định form tạo/sửa |
| PATCH | `/api/customer/reviews/{id}` | Chủ Review | Sửa các trường được gửi; chỉ `PUBLISHED` |
| DELETE | `/api/customer/reviews/{id}` | Chủ Review | Xóa mềm; gọi lặp khi đã `DELETED` vẫn 204 |
| POST | `/api/customer/reviews/{id}/restore` | Chủ Review | Restore `DELETED`; gọi lặp khi `PUBLISHED` trả 200 |

`page` bắt đầu từ 0, `size` 1–50. `rating` là 1–5. `hasMedia` là `true|false`. `sort` nhận `newest`, `oldest`, `rating_desc`, `rating_asc`, `helpful`.

### Request tạo

```json
{
  "orderItemId": 42,
  "productId": 7,
  "rating": 5,
  "content": "Sản phẩm hoạt động ổn định.",
  "mediaIds": ["89a53d5c-88ae-4eb3-813f-1397cc2736ea"]
}
```

`mediaIds` có thể bỏ qua/null khi không có file. Mỗi UUID phải là asset `TEMP`, module `REVIEW`, còn hạn và thuộc đúng user; việc gắn media nằm trong cùng transaction tạo Review.

### Request sửa

```json
{
  "rating": 4,
  "content": "Cập nhật sau một tuần sử dụng.",
  "mediaIds": []
}
```

PATCH cần ít nhất một trường. Trường bỏ qua giữ nguyên. Nếu có `mediaIds`, đây là **toàn bộ danh sách mong muốn** theo thứ tự; `[]` gỡ hết media, file gỡ chuyển `DELETE_PENDING` theo T21.

### Response Review

```json
{
  "reviewId": 9,
  "orderItemId": 42,
  "orderId": 18,
  "productId": 7,
  "productName": "RTX Example",
  "author": {"userId": 3, "fullName": "Nguyen A"},
  "rating": 5,
  "content": "Sản phẩm hoạt động ổn định.",
  "status": "PUBLISHED",
  "media": [{
    "mediaId": "89a53d5c-88ae-4eb3-813f-1397cc2736ea",
    "mediaType": "IMAGE",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456,
    "durationSecond": null,
    "sortOrder": 0,
    "contentUrl": "/api/media/89a53d5c-88ae-4eb3-813f-1397cc2736ea/content"
  }],
  "likeCount": 0,
  "likedByCurrentUser": false,
  "verifiedPurchase": true
}
```

`likeCount`/`likedByCurrentUser` đã có trong DTO đọc để T27 không phải đổi contract. T26 không cung cấp thao tác like.

### Response trang và summary

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalItems": 0,
  "totalPages": 0,
  "summary": {
    "productId": 7,
    "averageRating": 0.0,
    "totalReviews": 0,
    "distribution": [
      {"rating": 5, "count": 0, "percentage": 0.0},
      {"rating": 4, "count": 0, "percentage": 0.0},
      {"rating": 3, "count": 0, "percentage": 0.0},
      {"rating": 2, "count": 0, "percentage": 0.0},
      {"rating": 1, "count": 0, "percentage": 0.0}
    ]
  }
}
```

Filter chỉ tác động `items/totalItems/totalPages`; `summary` luôn là toàn bộ bài `PUBLISHED` của Product. Sửa rating, xóa mềm và restore phản ánh ngay vì summary được aggregate từ trạng thái hiện tại, không dùng cache/cột đếm.

## Mã lỗi T26

| HTTP | code | Khi nào |
| --- | --- | --- |
| 400 | `INVALID_JSON` | JSON sai kiểu/cú pháp hoặc có token thừa |
| 400 | `INVALID_REVIEW` | Thiếu ID, rating ngoài 1–5, content rỗng/quá 5000, PATCH rỗng |
| 400 | `INVALID_REVIEW_QUERY` | Query phân trang/filter/sort sai |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập endpoint customer |
| 403 | `FORBIDDEN` | Session không phải CUSTOMER active |
| 403 | `REVIEW_ORDER_ITEM_NOT_OWNED` | Tạo bằng dòng đơn của user khác |
| 404 | `REVIEW_ORDER_ITEM_NOT_FOUND` | `orderItemId` không tồn tại |
| 404 | `REVIEW_PRODUCT_NOT_FOUND` | Product public không tồn tại/không public |
| 404 | `REVIEW_NOT_FOUND` | Review không tồn tại hoặc không thuộc user |
| 409 | `REVIEW_PRODUCT_MISMATCH` | `productId` khác SKU của OrderItem |
| 409 | `REVIEW_ORDER_NOT_DELIVERED` | Order chưa DELIVERED hoặc thiếu deliveredAt |
| 409 | `REVIEW_ALREADY_EXISTS` | OrderItem đã có Review, kể cả DELETED |
| 409 | `REVIEW_NOT_EDITABLE` | Chủ cố sửa/restore/xóa sai transition với HIDDEN/DELETED |
| 422 | `INVALID_REVIEW_MEDIA` | Quá 6 UUID, UUID null hoặc trùng |
| 422 | `MEDIA_NOT_AVAILABLE` | Asset T21 sai chủ/module/trạng thái hoặc hết hạn |
| 422 | `MEDIA_COUNT_LIMIT` | Tổng media vượt 6 |
| 422 | `MEDIA_VIDEO_LIMIT` | Có hơn một video |

## Contract dành trước cho T27

T27 triển khai service/DAO riêng; không sửa logic create/update/delete trong `ReviewService`.

| Method | Endpoint dự kiến | Quyền và tính idempotent |
| --- | --- | --- |
| PUT | `/api/customer/reviews/{id}/like` | CUSTOMER; tạo like nếu chưa có, gọi lặp vẫn 200 |
| DELETE | `/api/customer/reviews/{id}/like` | CUSTOMER; bỏ like nếu có, gọi lặp vẫn 200 |
| GET | `/api/admin/reviews?page=&size=&status=&rating=&hasMedia=&query=` | ADMIN; xem `PUBLISHED/HIDDEN`, không cần trả `DELETED` mặc định |
| PATCH | `/api/admin/reviews/{id}/moderation` | ADMIN; `HIDE` cần reason, `RESTORE` chỉ `HIDDEN -> PUBLISHED` |

Like response dùng `{ "reviewId": 9, "liked": true, "likeCount": 3 }`. Chỉ bài `PUBLISHED` được like; tự like trả 409 `REVIEW_SELF_LIKE`; bài không public trả 404 `REVIEW_NOT_FOUND`. PK `(review_id,user_id)` và delete-if-exists bảo đảm idempotent.

Moderation request dùng `{ "action": "HIDE", "reason": "..." }` hoặc `{ "action": "RESTORE" }`. `HIDE` ghi đồng thời `status`, `moderation_reason`, `moderated_by`, `moderated_at`; `RESTORE` xóa metadata và không được chuyển bài `DELETED` của user thành public. Sai transition trả 409 `REVIEW_MODERATION_CONFLICT`; không phải ADMIN trả 403 `FORBIDDEN`.

Sau hide/restore, public list, media visibility và summary phải thay đổi trong cùng trạng thái commit. T27 nên kiểm thử race like, tự like, restore DELETED và media bài HIDDEN.

## Checklist QA tối thiểu

1. Chưa mua, OrderItem không tồn tại, sai chủ, sai Product và đơn PENDING/CANCELLED đều không tạo được.
2. Hai request đồng thời cho cùng OrderItem chỉ tạo một bản ghi; request còn lại nhận `REVIEW_ALREADY_EXISTS`.
3. Rating 0/6, content trắng/quá 5000, media sai module/chủ/hết hạn/trùng/quá giới hạn bị từ chối và transaction không để lại Review/media nửa chừng.
4. Chủ khác không GET/PATCH/DELETE được; guest không thấy `HIDDEN/DELETED`.
5. PATCH rating làm average/distribution đổi; DELETE loại bài khỏi list/summary; restore đưa đúng bài trở lại.
6. Filter rating/hasMedia và năm kiểu sort ổn định qua nhiều trang.
7. Media bị gỡ chuyển `DELETE_PENDING`; media của bài soft-delete không còn truy cập public.
