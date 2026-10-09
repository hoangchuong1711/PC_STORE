# T30 — Setup like, ranking và kiểm duyệt

T30 dùng `SetupSocialServlet → SetupSocialService → SetupSocialDao → JPA/PostgreSQL`, không sửa `SetupService`/DTO T29 và không thay migration. Contract bài đăng bên trong response giữ nguyên [T29](T29_SETUP.md). Đặc tả dùng thử nằm trong [OpenAPI](../backend/src/main/webapp/api-docs/openapi.yaml).

## Endpoint

| Endpoint | Quyền | Kết quả |
| --- | --- | --- |
| `GET /api/setup-likes/{id}` | Guest | `{postId, likeCount, liked}`; Guest có `liked=false`. |
| `PUT /api/setup-likes/{id}` | User ACTIVE đã đăng nhập | Like idempotent, trả trạng thái trên; không cần body. |
| `DELETE /api/setup-likes/{id}` | User ACTIVE đã đăng nhập | Unlike idempotent, trả trạng thái trên; không cần body. |
| `GET /api/setups/ranking?offset=0&limit=20` | Guest | Mảng `{post, likeCount, liked}`; `post` là `SetupResponse` của T29. |
| `GET /api/admin/setups?status=HIDDEN&offset=0&limit=20` | ADMIN ACTIVE | Mảng `{post, likeCount, moderationReason, moderatedBy, moderatedAt}`. Bỏ `status` để xem cả hai trạng thái. |
| `GET /api/admin/setups/{id}` | ADMIN ACTIVE | Chi tiết cùng DTO kiểm duyệt, gồm bài HIDDEN. |
| `PUT /api/admin/setups/{id}/status` | ADMIN ACTIVE | Body `{"status":"HIDDEN","reason":"Nội dung không phù hợp"}`; khôi phục bằng `PUBLISHED`, cũng cần lý do. Trả DTO kiểm duyệt. |

Các GET/PUT/DELETE thành công trả 200. Phân trang: offset 0–1.000.000, limit 1–50. Session cookie dùng chung với T29; khi gọi từ frontend cần gửi credentials. Like chỉ yêu cầu đăng nhập ACTIVE, không yêu cầu đơn DELIVERED; tác giả và Admin đều có thể like theo quy tắc User/Post của mô hình dữ liệu.

## Quy tắc dữ liệu

- Like/unlike chỉ áp dụng bài PUBLISHED. Bài HIDDEN hoặc không tồn tại trả 404 `SETUP_NOT_FOUND`, kể cả người đang like là tác giả/Admin. PK `(post_id,user_id)` và `ON CONFLICT DO NOTHING` chống đếm trùng; unlike xóa bản ghi. Không lưu bộ đếm riêng.
- Ranking tính tổng like mọi thời điểm, chỉ lấy PUBLISHED; thứ tự `likeCount DESC, createdAt DESC, postId DESC`. Không có ranking tuần/tháng. Phân trang ổn định khi dữ liệu không đổi; các lượt like mới có thể làm vị trí đổi giữa hai request.
- Like, kiểm duyệt và thao tác T29 khóa cùng bản ghi `setup_posts` trong transaction. Like đồng thời với hide được tuần tự hóa: like xảy ra trước hide thì được giữ; xảy ra sau hide thì bị từ chối.
- Ẩn/khôi phục giữ ảnh, sản phẩm và like; ghi lý do đã bỏ khoảng trắng đầu/cuối, ID Admin, thời gian kiểm duyệt và updatedAt. Metadata chỉ giữ lần kiểm duyệt cuối, không phải lịch sử. Gửi lại yêu cầu kiểm duyệt cập nhật metadata lần cuối.
- Bài ẩn rời feed/chi tiết công khai T29 và ranking. Cơ chế T21 chặn media ẩn với Guest/người khác; chủ ảnh vẫn xem được. T30 không mở rộng quyền đọc media HIDDEN cho Admin (giới hạn T21 hiện tại).

## Liên kết sản phẩm cho frontend

`post.products[]` giữ `{productId,name}` của T29. FE dùng `productId` để gọi `GET /api/products/{id}` và `POST /api/customer/cart/items` với `{"productId":id,"quantity":1}`. Không lấy giá/kho từ bài Setup; catalog/cart kiểm tra lại trạng thái, giá và kho. T30 không tự thêm sản phẩm vào giỏ khi đọc bài. Việc nối UI thực hiện ở T34.

## Lỗi và kiểm thử

- 401 `UNAUTHORIZED`: thao tác cần đăng nhập nhưng không có session.
- 403 `FORBIDDEN`: tài khoản không ACTIVE hoặc kiểm duyệt không có quyền ADMIN.
- 400 `INVALID_JSON`, `INVALID_MODERATION`, `INVALID_SETUP_STATUS`, `INVALID_ID`, `INVALID_PAGINATION`: body/lý do/trạng thái/tham số không hợp lệ.
- 404 `SETUP_NOT_FOUND` hoặc `NOT_FOUND`: bài hoặc endpoint không có; 405 `METHOD_NOT_ALLOWED` khi sai method.

`SetupSocialHttpIT` chạy Tomcat nhúng, session/filter thật và PostgreSQL schema riêng: like/unlike lặp, request đồng thời, ranking/phân trang, ẩn/khôi phục, quyền và media sau khi ẩn. OpenAPI được kiểm tra cùng `OpenApiContractTest`. Xem [hướng dẫn kiểm thử](testing.md).

```powershell
mvn -B -Pdb-test "-DargLine=-Duser.timezone=Asia/Ho_Chi_Minh" "-Dit.test=SetupSocialHttpIT" verify
```

Cần đặt `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD` trỏ database test riêng. Tham số JVM tránh lỗi PostgreSQL không nhận alias `Asia/Saigon` trên một số môi trường Windows. Chưa thay thế nghiệm thu frontend T34 hoặc kiểm thử tải lớn.

## Kết quả kiểm chứng ngày 09/10/2026

- Windows, JDK 25 biên dịch target Java 21, Tomcat nhúng 10.1.57, PostgreSQL 17 riêng: 4 ca `SetupSocialHttpIT` và 1 ca `SetupServiceIT` qua; đóng gói WAR thành công.
- Toàn bộ unit/contract: 62 ca qua, 1 `CloudinaryLiveSmokeTest` bỏ qua vì chưa bật kiểm thử Cloudinary thật.
- Toàn bộ integration: 128/130 ca qua. Hai ca thất bại thuộc file seed có sẵn, không bị T30 sửa: `DemoDataSeederIT.renamesEarlierDemoAccountsWithoutChangingTheirIds` mong 2 tài khoản nhưng có 4 vì seed không đổi email cũ; `DemoDataSeederIT.seedsSimpleLocalLoginAccountsWithoutResettingExistingPasswords` mong lỗi khi email Admin mang role CUSTOMER nhưng seed `ON CONFLICT DO NOTHING` không báo lỗi. Do đó lệnh verify toàn backend vẫn thất bại.
- Chưa chạy nghiệm thu UI T34 hoặc tải ảnh Cloudinary thật. Quyền media được kiểm tra bằng dữ liệu ATTACHED trong database, HTTP từ chối ảnh HIDDEN và dịch vụ truy cập media thật.
