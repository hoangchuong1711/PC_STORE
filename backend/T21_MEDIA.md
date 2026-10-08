# T21 — Dịch vụ media dùng chung

T21 cung cấp upload, lưu tạm, gắn/tháo file và đọc file cho hai module Setup và Review. API tạo/sửa bài và giao diện thuộc T26/T29; các module đó gọi `MediaAttachmentService` trong **cùng transaction JPA** với bài viết. Không tạo route Next.js để ghi database.

## Giao diện và giới hạn

| Nghiệp vụ | Quy tắc backend |
| --- | --- |
| `POST /api/customer/media/images` | Body là một JPEG/PNG thật, tối đa 8.000.000 byte; header `X-Media-Module: SETUP` hoặc `REVIEW`. Backend giải mã, kiểm tra tối đa 25 MP và cạnh 10.000 px, vẽ lại thành JPEG tối đa 1.920 px và 1.000.000 byte, bỏ metadata. |
| `POST /api/customer/media/videos` | Chỉ `REVIEW`; body MP4/MOV H.264, âm thanh AAC hoặc không có âm thanh. Tối đa 20.000.000 byte, 10 giây, 1.920 px/cạnh, 2,1 MP và 60 fps. FFprobe kiểm tra stream thực; FFmpeg chuyển mã thành MP4 H.264/AAC, tối đa 720p và 4.000.000 byte. Tối đa hai lần chuyển mã đồng thời trên mỗi instance. |
| `GET /api/media/{mediaId}/content` | Backend kiểm tra quyền theo trạng thái hiện tại của bài rồi tải tài sản `authenticated` từ Cloudinary theo `asset_id`. Hỗ trợ một HTTP byte range cho video. Không đưa URL Cloudinary hoặc API secret cho trình duyệt. |
| Setup | 1–8 ảnh/bài, không video. |
| Review | 0–6 file/bài, tối đa một video. |

Hai endpoint upload yêu cầu session CUSTOMER và Origin được phép. Mỗi tài khoản được tối đa 20 lần upload/10 phút, 50 lần/24 giờ, 100 MB media đã xử lý/24 giờ, 12 file tạm còn hiệu lực và 2 upload đang chạy. Hạn mức được kiểm tra dưới khóa của dòng User; lỗi quota trả `429`. `mediaId` trả về có trạng thái `TEMP` và chưa tự gắn vào bài.

## Gắn file vào bài

- `attachSetupImages(em, ownerId, postId, mediaIds)` và `attachReviewMedia(em, ownerId, reviewId, mediaIds)` trong `MediaAttachmentService` phải được gọi sau khi tạo dòng bài, trước khi commit transaction. Service khóa bài và asset; xác nhận đúng owner, module, trạng thái `TEMP`, chưa hết hạn và giới hạn số file; chuyển asset sang `ATTACHED` cùng lúc thêm `setup_images`/`review_media`. Review owner được truy theo `OrderItem → Order → User`.
- `detachSetupImage(...)` và `detachReviewMedia(...)` xóa liên kết trong cùng transaction, chuyển asset thành `DELETE_PENDING` để worker xóa Cloudinary. Setup không cho tháo ảnh cuối. Khi xóa cứng một bài trong các module tương lai, module phải tháo media trước; ẩn bài hoặc xóa mềm Review vẫn giữ media để có thể kiểm tra/khôi phục.
- `MediaAccessService` cho chủ xem file `TEMP` chưa hết hạn và bài `HIDDEN`; khách chỉ xem media của bài `PUBLISHED`. Review `DELETED` không xem được kể cả chủ. File đang dọn hoặc đã dọn luôn trả 404.

## Lưu trữ và dọn file

Cloudinary signed upload dùng `type=authenticated` và namespace `pcstore/temp/{setup|review}/{uuid}`. V5 tạo `media_assets` và FK tùy chọn trên hai bảng ảnh/media V3; V6 thêm retry/tombstone; V7 thêm metadata video; V8 lưu `resource_type` ngay từ lúc giữ chỗ để lỗi upload video vẫn dọn qua endpoint video. Không sửa checksum migration cũ.

Worker chạy khi Tomcat khởi động rồi mỗi 15 phút; mỗi lượt nhận tối đa 10 file `TEMP`/`UPLOADING` quá 2 giờ hoặc `DELETE_PENDING` tới hạn bằng `FOR UPDATE SKIP LOCKED`. Xóa Cloudinary thành công hoặc `not found` chuyển sang `DELETED`; lỗi thử lại sau 1, 5, 30 rồi 120 phút. `ATTACHED` không bị worker chọn. Bản ghi `DELETED` giữ lịch sử để áp hạn mức upload.

## Kiểm thử và điều kiện vận hành

Test đơn vị kiểm tra chữ ký/request Cloudinary, ảnh, metadata video, servlet và byte range. Test PostgreSQL dùng schema riêng kiểm tra migration, quota, gắn/tháo file, quyền xem bài ẩn/xóa mềm và dọn ảnh/video. Image Docker backend đã build, FFmpeg và `MediaVideoService` chuyển mã thành công video mẫu 2 giây. `CloudinaryLiveSmokeTest` là test opt-in, tạo ảnh 4×4 và xóa ở `finally`.

Ngày 07/10/2026, ping Cloudinary với khóa trong `.env` trả HTTP 200, nhưng signed upload trả HTTP 403 `permission denied`. Vì vậy **chưa xác minh được vòng upload/đọc/xóa trên tài khoản thật**. Cần kiểm tra API key/product environment có quyền Upload API (và quyền destroy/download) trong Cloudinary Console, sau đó chạy lại smoke test; không ghi khóa vào issue hoặc tài liệu. T26/T29 chưa có API tạo bài nên chưa có kiểm thử end-to-end từ giao diện đến bài đăng; khi triển khai, hai module phải gọi service gắn/tháo ở trên.
