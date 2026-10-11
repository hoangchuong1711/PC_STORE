# T27 — Like/unlike và kiểm duyệt Review

T27 cung cấp ba thao tác trên review đã có trong database. Tạo/sửa/xóa review, danh sách, phân trang và thống kê sao thuộc T26. T27 không gọi `ReviewService` của T26 và không thêm API tạo review để kiểm thử. Nhánh tích hợp hiện tại là `develop`.

## Hợp đồng HTTP

Đường dẫn dưới đây tính từ context backend: `http://localhost:8080/pc-store-backend`. Đăng nhập bằng `POST /api/auth/login` trước, giữ cookie `JSESSIONID`. Request qua Next.js dùng cùng host và `credentials: "include"`; T27 chưa nối giao diện. Hai filter hiện có đã bao phủ `/api/customer/*` và `/api/admin/*`.

| Thao tác | Endpoint | Quyền | Body | Thành công |
| --- | --- | --- | --- | --- |
| Like | `PUT /api/customer/reviews/{reviewId}/like` | CUSTOMER đang ACTIVE | Rỗng | 200 `ReviewLikeResponse` |
| Bỏ like | `DELETE /api/customer/reviews/{reviewId}/like` | CUSTOMER đang ACTIVE | Rỗng | 200 `ReviewLikeResponse` |
| Ẩn/khôi phục | `PATCH /api/admin/reviews/{reviewId}/moderation` | ADMIN đang ACTIVE | JSON như bên dưới | 200 `ReviewModerationResponse` |

`reviewId` là ID INTEGER dương của `product_reviews`, tối đa 2147483647. ID, người dùng và người kiểm duyệt không lấy từ body. Like/unlike không nhận body; JSON kiểm duyệt từ chối trường lạ, số/boolean thay cho chuỗi và JSON dư phía sau.

### Like và unlike

Ví dụ phản hồi like:

```json
{"reviewId":1,"likesCount":1,"isLiked":true}
```

Unlike cũng trả JSON, ví dụ `{"reviewId":1,"likesCount":0,"isLiked":false}`. `likesCount` là số nguyên không âm từ `COUNT(review_likes)` (Java `long`); `isLiked` luôn là boolean của customer đang đăng nhập. Không suy ra hợp đồng ID từ `id: string` của fixture frontend. Tên `likesCount`/`isLiked` phù hợp với giao diện mẫu trong `frontend/lib/reviews.ts`.

- Chỉ thao tác với review `PUBLISHED`. Review không tồn tại, `HIDDEN` và `DELETED` cùng trả 404 `REVIEW_NOT_FOUND` cho CUSTOMER, kể cả khi đã có like.
- Tác giả được suy ra từ `ProductReview.orderItem.order.user`; không lưu thêm author_id. Tác giả không được PUT like bài của mình: 403 `SELF_LIKE_NOT_ALLOWED`.
- PUT lại không thêm dòng, không đổi `created_at`, vẫn trả 200 và `isLiked=true`. Không có API toggle.
- DELETE chỉ xóa dòng `(review_id, user_id)` của customer đăng nhập. DELETE lại hoặc chưa từng like vẫn trả 200 với `isLiked=false`; số like của người khác được giữ. Chủ bài được DELETE một self-like cũ nếu dữ liệu cũ có dòng đó.
- Một like/user/review do khóa chính ghép hiện có bảo đảm. Không thêm cột tổng số like. Giá trị trả về là ảnh chụp kết quả trong transaction của request; request khác có thể thay đổi nó sau khi transaction kết thúc.

### Kiểm duyệt

Ẩn review:

```json
{"status":"HIDDEN","moderationReason":"Nội dung không phù hợp"}
```

Khôi phục:

```json
{"status":"PUBLISHED"}
```

| Trạng thái hiện tại | Gửi HIDDEN với lý do hợp lệ | Gửi PUBLISHED không có lý do |
| --- | --- | --- |
| PUBLISHED | Chuyển HIDDEN, ghi người/thời gian/lý do | 200, giữ nguyên metadata |
| HIDDEN | 200, giữ nguyên metadata, kể cả gửi lý do khác | Chuyển PUBLISHED, ghi người/thời gian, xóa lý do |
| DELETED | 409 `REVIEW_DELETED` | 409 `REVIEW_DELETED` |
| Không tồn tại | 404 `REVIEW_NOT_FOUND` | 404 `REVIEW_NOT_FOUND` |

Request luôn được kiểm tra trước, cả khi gọi lặp. Khi HIDDEN, lý do bắt buộc không trống sau `String.strip()`, tối đa 1000 đơn vị UTF-16 sau khi bỏ khoảng trắng đầu/cuối. Khi PUBLISHED, bỏ `moderationReason` hoặc gửi `null`; chuỗi bất kỳ bị từ chối để tránh gửi nhầm lý do mà server bỏ qua. T27 không cung cấp thao tác sửa riêng lý do của một bài đang HIDDEN.

Ví dụ phản hồi:

```json
{
  "reviewId": 1,
  "status": "HIDDEN",
  "moderationReason": "Nội dung không phù hợp",
  "moderatedBy": 3,
  "moderatedAt": "2026-10-08T15:00:00.123456"
}
```

`moderatedBy` là ID ADMIN lấy từ session và đối chiếu database. `moderatedAt` là LocalDateTime ISO-8601 không kèm offset, diễn giải theo Asia/Bangkok (UTC+07) như quy ước dữ liệu của dự án, chính xác microsecond. Metadata mô tả lần **chuyển trạng thái gần nhất**, không phải bảng lịch sử kiểm duyệt. Khôi phục xóa lý do ẩn cũ và cập nhật người/thời gian. PUBLISHED chưa từng kiểm duyệt có cả ba trường metadata `null`; gọi khôi phục lặp không tự tạo metadata.

Ẩn/khôi phục không sửa nội dung, sao, OrderItem, like hoặc media. Admin không được chuyển review DELETED do chủ xóa về công khai.

### Lỗi

Lỗi JSON có cấu trúc chung `{"code":"...","message":"..."}`. Client xử lý theo HTTP status và `code`, không phụ thuộc nguyên văn thông báo.

| HTTP | Code | Trường hợp |
| --- | --- | --- |
| 400 | `INVALID_ID` | ID sai kiểu, không dương hoặc vượt INTEGER |
| 400 | `INVALID_JSON` | Body sai cấu trúc/kiểu, trường lạ, JSON dư, hoặc body không rỗng ở like/unlike |
| 400 | `INVALID_REVIEW_STATUS` | Thiếu status hoặc không phải HIDDEN/PUBLISHED |
| 400 | `INVALID_MODERATION_REASON` | Ẩn thiếu lý do, lý do trống/quá dài, hoặc khôi phục gửi lý do khác null |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập; user không còn tồn tại hoặc đã INACTIVE |
| 403 | `FORBIDDEN` | Sai vai trò CUSTOMER/ADMIN |
| 403 | `SELF_LIKE_NOT_ALLOWED` | PUT like review của chính mình |
| 403 | `ORIGIN_NOT_ALLOWED` | CorsFilter hiện có từ chối origin |
| 404 | `REVIEW_NOT_FOUND` | Review không tồn tại; đối với like/unlike còn gồm HIDDEN/DELETED |
| 404 | `NOT_FOUND` | URL không khớp endpoint T27 |
| 405 | `METHOD_NOT_ALLOWED` | Sai phương thức; có header Allow |
| 409 | `REVIEW_DELETED` | Admin kiểm duyệt review DELETED |
| 500 | `INTERNAL_ERROR` | Lỗi server không dự kiến; chi tiết chỉ ghi vào log |

## Transaction, request đồng thời và media

Mỗi thao tác mở một transaction trong `ReviewSocialService`, kiểm tra user/role hiện tại trong database, khóa dòng `product_reviews` bằng `PESSIMISTIC_WRITE`, rồi kiểm tra trạng thái/chủ bài và ghi dữ liệu. Lỗi sẽ rollback. DAO chỉ truy vấn; không tự quyết định quyền hoặc mở transaction.

Các request cùng review chờ cùng một khóa: hai PUT cùng user chỉ thêm một dòng; hai DELETE đều an toàn; PUT và DELETE được xử lý theo một thứ tự. Nếu like hoàn tất trước khi ẩn, like được giữ lại; nếu ẩn hoàn tất trước, like bị 404. Trạng thái cuối không phụ thuộc vào việc client gửi request trùng. PK ghép là ràng buộc bổ sung; khóa dòng giúp tránh request trùng gây lỗi UNIQUE.

Tận dụng [T21 media](T21_MEDIA.md): file có FK `review_media.media_asset_id`, lưu Cloudinary authenticated và được đọc qua `/api/media/{mediaId}/content`. `MediaAccessService` kiểm tra trạng thái review hiện tại, nên HIDDEN chặn khách/người không phải chủ với 404 `MEDIA_NOT_FOUND`; chủ bài vẫn xem riêng theo quy tắc T21. DELETED chặn cả chủ. Endpoint media dùng `private, no-store`. T27 không tải/xóa file Cloudinary khi đổi trạng thái, không trả media URL trong phản hồi kiểm duyệt. Không dùng URL Cloudinary public để vượt kiểm tra này. Dữ liệu media V3 cũ không có media_asset_id cần được xử lý qua quy tắc T21 khi tích hợp; T27 không bổ sung đường dẫn công khai cho dữ liệu cũ.

## Bàn giao cho T26

- Dùng chung `ProductReview`, `ReviewStatus`, `ReviewLike` và mapping đã đăng ký trong `persistence.xml`; không tạo entity thứ hai ánh xạ cùng bảng. T27 chưa có `ReviewService` tạo/list review.
- Servlet chỉ hỗ trợ wildcard ở cuối đường dẫn, nên `ReviewLikeServlet` nhận `/api/customer/reviews/*` và `ReviewModerationServlet` nhận `/api/admin/reviews/*`, sau đó tự kiểm tra phần `/{reviewId}/like` hoặc `/{reviewId}/moderation`. T26 không đăng ký thêm Servlet trùng pattern. Nếu chọn CRUD cùng prefix, bổ sung nhánh xử lý vào Servlet tương ứng để gọi service của T26; nghiệp vụ social vẫn ở service T27 riêng. Việc này chưa được triển khai trong T27.
- Tác giả: `review.getOrderItem().getOrder().getUser()`. Sản phẩm: `review.getOrderItem().getProduct()`. Các quy tắc đơn DELIVERED, một review/OrderItem, nội dung/sao hợp lệ thuộc T26; T27 chỉ cần review hiện có.
- `ReviewSocialDao.countLikes(reviewId)` và `isLiked(reviewId, viewerId)` đọc số tim/trạng thái. Có thể dùng trong transaction đọc của T26. Với khách chưa đăng nhập trả `isLiked=false`; không dùng giá trị mock frontend làm hợp đồng backend. Khi viết danh sách, T26 có thể đọc COUNT và tập review đã like theo lô để tránh một truy vấn mỗi bài; không thêm API đọc/list riêng trong T27.
- T26 phải lọc **PUBLISHED** khi trả danh sách công khai và khi tính trung bình/phân bố sao. HIDDEN/DELETED không được tính rating hoặc lộ nội dung/media qua API công khai. Khôi phục HIDDEN khiến bài đủ điều kiện xuất hiện/tính sao lại; like cũ vẫn có.
- Mọi sửa/xóa mềm/khôi phục của T26 phải khóa cùng dòng review trước khi kiểm tra và thay trạng thái; đọc trạng thái sau khi lấy khóa. Chủ không sửa/khôi phục HIDDEN. Chủ khôi phục DELETED trên cùng bản ghi theo data-model; không tạo review khác để vượt UNIQUE(order_item_id).
- Khi gắn/tháo media, gọi `MediaAttachmentService` trong cùng transaction của T26. Không dùng review entity để trả trực tiếp ra JSON và không trả metadata kiểm duyệt nhạy cảm trong danh sách công khai nếu không cần.

## Chạy và kiểm thử bằng dữ liệu mẫu

Cần Java 21, Maven và PostgreSQL 17 test riêng. Không trỏ TEST_DB_URL vào database ứng dụng. Từ repo root:

```powershell
docker run -d --name pcstore-t27-test-db -e POSTGRES_DB=pcstore_test -e POSTGRES_USER=pcstore_test -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55433:5432 postgres:17
docker exec pcstore-t27-test-db pg_isready -U pcstore_test -d pcstore_test
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:55433/pcstore_test'
$env:TEST_DB_USER='pcstore_test'
$env:TEST_DB_PASSWORD='local-test-only'
Set-Location backend
mvn -B -Pdb-test '-Dtest=OpenApiContractTest' '-Dit.test=ReviewSocialIT' '-DargLine=-Duser.timezone=Asia/Bangkok' verify
```

Nếu đã có container test ở cổng 55433, dùng lại container đó hoặc chọn cổng khác và đổi TEST_DB_URL. Mật khẩu ví dụ chỉ dành cho database test local. Toàn bộ backend:

```powershell
mvn -B -Pdb-test '-DargLine=-Duser.timezone=Asia/Bangkok' verify
```

`ReviewSocialIT` tạo schema ngẫu nhiên `t27_http_*`, chạy migration/JPA validate, mở Tomcat nhúng trên cổng trống, đăng ký Servlet/filter thật và đăng nhập bằng API auth thật. Test tạo customer A/B/C và Admin bằng password hash thật; password fixture là `Test-pass-123`, email `a@example.test`, `b@example.test`, `c@example.test`, `admin@example.test`. SQL [t27_review_social.sql](../backend/src/test/resources/fixtures/t27_review_social.sql) bổ sung hai đơn DELIVERED, hai review PUBLISHED của A/B, một HIDDEN và một DELETED của A, cùng media authenticated giả để kiểm tra quyền mà không gọi Cloudinary. User ID A/B/Admin/C lần lượt là 1/2/3/4.

Test tự nạp fixture và dọn **schema do chính test tạo** sau khi chạy; không nạp SQL này vào database ứng dụng hoặc sửa dữ liệu có sẵn. Đây là dữ liệu kiểm thử, không phải API tạo review. Mỗi ca lấy lại fixture mới để kết quả không phụ thuộc lần chạy trước. Khi cần xem kết quả, đọc `backend/target/failsafe-reports/com.pcstore.http.ReviewSocialIT.txt` và `backend/target/surefire-reports/`.

Các ca gồm like/unlike lặp, giữ created_at, COUNT, không xóa tim người khác, tự like, chưa đăng nhập/sai quyền, user bị khóa/đổi role sau login, review không tồn tại/HIDDEN/DELETED, JSON/ID sai, thiếu lý do, gọi kiểm duyệt lặp, khôi phục HIDDEN/từ chối DELETED, request đồng thời và media công khai bị chặn sau ẩn rồi được phép lại sau khôi phục.

Phần media trong `ReviewSocialIT` chỉ xác nhận quyền qua service T21 và HTTP 404 của endpoint thật trước bước download, không gọi Cloudinary. Test ảnh thật bên dưới bổ sung luồng HTTP đọc ảnh và kiểm duyệt. `CloudinaryLiveSmokeTest` của T21 có cờ opt-in riêng, xem hướng dẫn T21 nếu cần kiểm tra riêng vòng upload/download/delete.

## Kiểm thử ảnh Cloudinary thật (opt-in)

[ReviewSocialCloudinaryIT](../backend/src/test/java/com/pcstore/http/ReviewSocialCloudinaryIT.java) mặc định bị bỏ qua toàn bộ, trước khi tạo schema/Tomcat hoặc gọi Cloudinary. Chỉ chạy khi `RUN_T27_CLOUDINARY=true`. Cờ này không bật `CloudinaryLiveSmokeTest`; test đó dùng `RUN_CLOUDINARY_SMOKE`.

Test yêu cầu đúng database test `jdbc:postgresql://127.0.0.1:55433/pcstore_test`, tạo schema ngẫu nhiên `t27_cloudinary_*` và nạp lại fixture T27. Review số 2 thuộc Customer B (user 2), Customer A là người khác, Admin là user 3. Không cần API tạo review T26.

`MediaUploadService` của T21 nhận PNG 4×4, chuẩn hóa thành JPEG và upload `authenticated` vào `pcstore/temp/review/{uuid}`, đồng thời tạo metadata `TEMP`. `MediaAttachmentService.attachReviewMedia` gắn ảnh với review trong transaction JPA và chuyển thành `ATTACHED`. Test gọi HTTP thật qua Tomcat/session/filter:

- PUBLISHED: Guest GET `/api/media/{mediaId}/content` nhận 200, `image/jpeg`, ảnh giải mã được và có kích thước 4×4.
- Admin PATCH `/api/admin/reviews/2/moderation` chuyển HIDDEN: Guest và Customer A nhận 404 `MEDIA_NOT_FOUND`; chủ bài B vẫn nhận 200 và cùng nội dung ảnh.
- Admin khôi phục PUBLISHED: Guest đọc lại được ảnh 200, giải mã được và nội dung giữ nguyên.
- Snapshot toàn bộ bản ghi media và liên kết `review_media` không đổi qua cả hai lần kiểm duyệt; endpoint media luôn có `Cache-Control: private, no-store`.

Trong `finally`, test xóa đúng public ID do upload trong schema riêng tạo, đóng các HTTP client/Tomcat/JPA và xóa schema của test. Nếu upload chưa trả ID vì timeout, ID đã được T21 giữ trong `media_assets` vẫn được lấy lại để dọn. Media giả của fixture thuộc Customer A không bị gửi đến Cloudinary để xóa. Lỗi dọn làm test thất bại hoặc được ghi như lỗi suppressed kèm lỗi ban đầu; log có `cleanup FAILED`, public ID/schema liên quan để xử lý tiếp. Không in key/secret, header xác thực hoặc URL Cloudinary có chữ ký.

Từ repo root, chuẩn bị `TEST_DB_USER`/`TEST_DB_PASSWORD` cho database test riêng theo [testing.md](testing.md), dùng lại container test đang giữ cổng 55433. Ba biến Cloudinary thật nằm trong `.env` local và được đọc dưới dạng dữ liệu, không thực thi file này như script:

```powershell
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:55433/pcstore_test'
$cloudKeys=@('CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET')
$previousCloud=@{}
$localCloud=@{}
foreach ($cloudKey in $cloudKeys) {
    $previousCloud[$cloudKey]=[Environment]::GetEnvironmentVariable($cloudKey,'Process')
}
foreach ($line in [IO.File]::ReadAllLines((Join-Path (Get-Location) '.env'),[Text.Encoding]::UTF8)) {
    if ($line -match '^\s*(?:export\s+)?(CLOUDINARY_CLOUD_NAME|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET)\s*=(.*)$') {
        $cloudKey=$Matches[1]
        $value=$Matches[2].Trim()
        if ($value -match '^(["''])(.*?)\1\s*(?:#.*)?$') { $value=$Matches[2] }
        else { $value=($value -replace '\s+#.*$','').Trim() }
        $localCloud[$cloudKey]=$value
    }
}
try {
    foreach ($cloudKey in $cloudKeys) {
        $value=$localCloud[$cloudKey]
        if ([string]::IsNullOrWhiteSpace($value)) { throw 'Thiếu cấu hình Cloudinary local' }
        [Environment]::SetEnvironmentVariable($cloudKey,$value,'Process')
    }
    $env:RUN_T27_CLOUDINARY='true'
    Push-Location backend
    try {
        mvn -B -Pdb-test '-Dit.test=ReviewSocialIT,ReviewSocialCloudinaryIT' '-DargLine=-Duser.timezone=Asia/Bangkok' verify
    } finally { Pop-Location }
} finally {
    Remove-Item -LiteralPath Env:RUN_T27_CLOUDINARY -ErrorAction SilentlyContinue
    foreach ($cloudKey in $cloudKeys) {
        [Environment]::SetEnvironmentVariable($cloudKey,$previousCloud[$cloudKey],'Process')
    }
}
```

Không stage/commit `.env` và không nạp các biến database ứng dụng từ file này vào `TEST_DB_*`. Các biến Cloudinary chỉ được thay trong phiên PowerShell, rồi khôi phục; cờ opt-in luôn được bỏ sau chạy.

### Kết quả kiểm chứng ngày 10/10/2026

- Khi không có opt-in và không truyền cấu hình Cloudinary/database test: `ReviewSocialCloudinaryIT` có 1 ca bị bỏ qua, không lỗi; `OpenApiContractTest` đạt 1/1.
- Khi bật opt-in, chạy lệnh chọn hai integration test ở trên: `ReviewSocialCloudinaryIT` đạt 1/1, `ReviewSocialIT` đạt 36/36; tổng integration 37 ca, 0 failures/errors/skipped.
- Toàn bộ unit/contract trong cùng lần chạy: 63 ca, 62 đạt, 0 failures/errors; 1 `CloudinaryLiveSmokeTest` bỏ qua vì không bật cờ riêng của nó.
- `CloudinaryLiveSmokeTest` đã đạt trong lần chạy riêng trước đó với `RUN_CLOUDINARY_SMOKE=true`: 1/1, không failures/errors/skipped. Upload và download ảnh `authenticated` thành công; lời gọi delete tài sản thử trong `finally` không lỗi.
- Guest đọc ảnh thật được trước/sau kiểm duyệt; khi HIDDEN, Guest/Customer khác bị 404 và chủ bài vẫn đọc được. Snapshot media/liên kết giữ nguyên.
- Log xác nhận delete ảnh thử, stop/destroy Tomcat, đóng JPA và drop schema đều thành công. Maven `BUILD SUCCESS`, WAR được đóng gói. Đã bỏ cờ opt-in sau chạy.

Lần chạy toàn bộ integration trước đó có 162 ca: 160 đạt, 2 thất bại trong `DemoDataSeederIT`, không errors/skipped. Hai ca thất bại là `renamesEarlierDemoAccountsWithoutChangingTheirIds` (mong đợi 2 tài khoản, thực tế 4) và `seedsSimpleLocalLoginAccountsWithoutResettingExistingPasswords` (mong đợi `IllegalStateException`, thực tế không ném lỗi). Source, seed và test liên quan được đối chiếu giống `origin/develop`; các lỗi này thuộc phần seed tài khoản trên develop và chưa được sửa trong T27.

Giới hạn: chỉ kiểm chứng ảnh JPEG và các API đọc media/kiểm duyệt; upload dùng trực tiếp service T21. Chưa kiểm chứng video Cloudinary thật, endpoint upload qua HTTP, giao diện hoặc luồng tạo review T26. Lệnh trên chỉ chọn hai integration test T27, không phải toàn bộ integration backend; chưa thể kết luận toàn bộ backend đã qua kiểm thử.

## Vai trò file

| File | Vai trò |
| --- | --- |
| `ReviewLikeServlet`, `ReviewModerationServlet` | Nhận HTTP, lấy userId từ session, đọc URL/body và trả JSON |
| `ModerateReviewRequest`, `ReviewLikeResponse`, `ReviewModerationResponse` | Dữ liệu vào/ra API, không chứa nghiệp vụ hoặc entity |
| `ReviewSocialService` | Kiểm tra quyền/trạng thái/chủ bài, điều khiển transaction và thao tác like/kiểm duyệt |
| `ReviewSocialDao` | Tìm/khóa review, đọc COUNT, tìm/thêm/xóa like qua JPA |
| `ProductReview`, `ReviewLike`, `ReviewLikeId`, `ReviewStatus` | Ánh xạ hai bảng và khóa ghép hiện có; không thay schema |
| `ReviewSocialIT`, fixture SQL | Kiểm thử toàn luồng HTTP đến PostgreSQL, độc lập với T26 |
| `ReviewSocialCloudinaryIT` | Test opt-in ảnh authenticated thật, quyền đọc HTTP khi ẩn/khôi phục, và dọn tài sản/schema riêng |
| `openapi.yaml`, `OpenApiContractTest` | Hợp đồng API và kiểm tra đặc tả parse/resolve, route đã công bố |
