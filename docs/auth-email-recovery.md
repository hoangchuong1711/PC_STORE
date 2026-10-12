# Email tài khoản và quên mật khẩu

Backend Java gửi email giao dịch qua Brevo HTTPS API, không dùng cổng SMTP. Giao diện `/auth/forgot-password` dùng chung khung trang đăng nhập/đăng ký, gồm nhập email → OTP → mật khẩu mới. Email chào mừng chỉ thông báo đăng ký thành công, không xác minh quyền sở hữu email và không khóa tài khoản chờ kích hoạt.

## Cấu hình

Đặt trong `.env` gốc khi chạy Docker Compose; `compose.yaml` truyền các biến sau cho backend:

```dotenv
MAIL_ENABLED=true
BREVO_API_KEY=<API key, không phải SMTP key>
MAIL_FROM_EMAIL=<sender đã xác minh trên Brevo>
MAIL_FROM_NAME=PC Store
```

Trên Railway, đặt cùng biến tại service backend rồi deploy bản code mới. Tomcat chạy trực tiếp cần biến môi trường của tiến trình; Java không tự đọc `.env`. Không đặt key vào frontend, không commit key hoặc ghi nội dung email/OTP/token vào log. Dùng sender/domain đã xác thực; kiểm tra Transactional Logs của Brevo và cấu hình Authorized IPs nếu provider trả 401.

Khi thiếu cấu hình hoặc `MAIL_ENABLED=false`, đăng ký vẫn hoạt động nhưng không gửi email; yêu cầu OTP trả `503 MAIL_UNAVAILABLE`. Cấu hình mẫu mặc định tắt gửi email để test không gửi thư thật.

Chạy local với database riêng:

```powershell
docker compose up --build
```

Lệnh trên chạy migration trên DB local. Railway kết nối Neon chung; chỉ deploy migration đã được điều phối/review. Migration mới là `V10__auth_email_recovery.sql`; không sửa migration đã triển khai. Trước khi mở PR cần điều phối số migration với người phụ trách database.

## API

| POST endpoint | Body | Thành công |
| --- | --- | --- |
| `/api/auth/register` | Hợp đồng đăng ký hiện có | 201; gửi email chào mừng sau khi transaction tạo tài khoản commit |
| `/api/auth/forgot-password` | `{ "email": "..." }` | 200 với thông báo chung cho email tồn tại, không tồn tại hoặc tài khoản bị vô hiệu hóa |
| `/api/auth/verify-reset-otp` | `{ "email": "...", "otp": "012345" }` | 200 `{ "resetToken": "..." }` |
| `/api/auth/reset-password` | `{ "email": "...", "resetToken": "...", "newPassword": "..." }` | 200 thông báo; không tự đăng nhập |

Các endpoint phục hồi không yêu cầu session. Backend vẫn kiểm tra Origin. Response POST auth có `Cache-Control: no-store`. Token không nằm trong URL, localStorage hoặc cookie; frontend chỉ giữ trong state. Reload trang cần bắt đầu lại và tuân thủ thời gian chờ gửi lại.

Email được trim/chuyển chữ thường. OTP gồm 6 chữ số sinh bằng SecureRandom, có hiệu lực 5 phút và lưu bằng PBKDF2 có salt. Mỗi mã chỉ được thử sai tối đa 5 lần; các lần thử sai được commit ngay cả khi response báo lỗi. Xác minh đúng hủy OTP và cấp token ngẫu nhiên 256 bit, hiệu lực 5 phút, chỉ lưu SHA-256 của token. Mật khẩu mới dài 8–128 ký tự, băm bằng PasswordUtil hiện có. Gửi lại OTP hủy OTP và token trước đó. Mã/token không dùng được cho email khác hoặc tài khoản không ACTIVE.

Đặt lại mật khẩu khóa bản ghi User và cập nhật mật khẩu, tăng `auth_version`, xóa challenge trong cùng transaction. Hai request đồng thời không thể dùng thành công cùng token. `SessionVersionFilter` kiểm tra phiên bản trên mọi `/api/*`; cookie cũ bị từ chối ở lần gọi tiếp theo. Session tạo trước migration được coi là version 0. Email thông báo đổi mật khẩu gửi sau commit.

Đổi mật khẩu bằng mật khẩu cũ trong trang hồ sơ cũng khóa User và hủy challenge phục hồi đang tồn tại, để OTP/token đã cấp trước đó không thể ghi đè mật khẩu vừa đổi.

## Giới hạn và lỗi

- Gửi OTP: 20 yêu cầu/giờ/IP; 5 lượt qua giới hạn IP/giờ/email; tối đa 1 lần/phút/email. Lượt bị chặn bởi cooldown vẫn tính vào quota email theo giờ. Email không tồn tại cũng chịu cùng giới hạn.
- Xác minh OTP: 60 request đúng định dạng/5 phút/IP, ngoài giới hạn 5 lần sai/mã.
- Đặt mật khẩu: 60 request đúng định dạng/5 phút/IP.
- Bucket được lưu bằng khóa SHA-256 trong PostgreSQL; giới hạn tồn tại qua restart và dùng chung giữa các replica. Bucket hết hạn hơn một ngày được dọn khi có yêu cầu mới.
- IP lấy từ `getRemoteAddr()`, không tin tùy ý `X-Forwarded-For`. Nếu proxy chưa được cấu hình để cung cấp IP đã xác thực cho Tomcat, nhiều người dùng có thể chung quota IP. Cần cấu hình trusted proxy phù hợp môi trường trước khi tăng quy mô; không dùng IP công khai truy cập website làm IP outbound cho Brevo.
- `400 INVALID_OTP`: mã sai, hết hạn, vượt số lần thử hoặc đã dùng.
- `400 INVALID_RESET_TOKEN`: token sai, hết hạn hoặc đã dùng; yêu cầu OTP mới.
- `429 RATE_LIMITED`: chờ theo cooldown/quota ở trên.
- `503 MAIL_UNAVAILABLE`: tính năng gửi mail tắt hoặc chưa cấu hình key/sender.

Gửi mail có connect timeout 3 giây, request timeout 8 giây. Gửi chào mừng hoặc thông báo đổi mật khẩu lỗi không rollback dữ liệu đã commit. Khi Brevo từ chối OTP, backend thu hồi challenge tương ứng và vẫn trả thông báo chung để không lộ sự tồn tại tài khoản qua mã lỗi. Người dùng có thể yêu cầu lại sau cooldown; quản trị viên xem log backend và Brevo.

Phiên bản này gửi đồng bộ sau commit, chưa có hàng đợi bền vững hoặc tự retry. Nếu tiến trình dừng giữa commit và gửi, thư có thể không được gửi; người dùng cần gửi lại OTP. Phản hồi chung không bảo đảm che giấu mọi khác biệt thời gian khi gọi nhà cung cấp. Provider chấp nhận request không bảo đảm email đã vào Inbox.

## Kiểm thử

`BrevoEmailSenderTest` dùng HTTP server local thay Brevo; `PasswordRecoveryIT` chạy DB/schema riêng, bao phủ hết hạn, sai mã, resend, rate limit, lỗi gửi mail và concurrent reset. `CoreHttpIT` kiểm tra toàn luồng qua HTTP, mật khẩu cũ bị từ chối và cookie cũ mất hiệu lực. Không có test nào cần API key thật.

Chạy backend theo [testing.md](testing.md), gồm `mvn -B test` và `mvn -B -Pdb-test verify` với TEST_DB_* trỏ DB test. Frontend chạy `node --experimental-strip-types --test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Kiểm tra giao diện bằng `python frontend/tests/password-recovery-ui.py` khi Next.js chạy tại `http://localhost:3000` (đổi bằng `AUTH_UI_BASE_URL`). Cần Python Playwright và Chrome. Test mock API, không gửi email thật; backend thật được kiểm tra riêng bằng CoreHttpIT. Ảnh lưu ở `backend/target/auth-ui/`.

## Kết quả kiểm chứng nhánh auth-email-recovery (12/10/2026)

- Backend unit/contract: 84 test, 0 lỗi, 1 skip (Cloudinary live smoke).
- Integration toàn dự án: 183 test, 4 failure, 1 error, 1 skip. Riêng PasswordRecoveryIT: 11/11; CoreHttpIT: 25/25; FeatureMigrationIT: 10/10; MediaMigrationIT: 2/2 đều qua. BrevoEmailSenderTest có 3/3 unit test qua.
- Frontend: 102/102 test qua; TypeScript, production build và test trình duyệt desktop/mobile qua. ESLint toàn dự án có 30 warning cũ, không có error; các file frontend thay đổi không có warning/error.
- Hai file Docker Compose ở thời điểm kiểm chứng email/OTP qua `config --quiet` (sau đó đã gộp thành `compose.yaml`); không khởi động backend kết nối Neon và không chạy migration trên DB chung.
- Năm ca integration dưới đây thất bại giống nhau trên bản develop nguyên gốc `2ca6d72`, được chạy trong bản sao code/fixture và database test riêng. Không sửa các lỗi ngoài scope này:

| Test | Kết quả đối chiếu |
| --- | --- |
| `DemoDataSeederIT.renamesEarlierDemoAccountsWithoutChangingTheirIds` | Mong đợi 2 user, thực tế 4 |
| `DemoDataSeederIT.seedsPublicCatalogWithoutDuplicatingRowsOrResettingStock` | Mong đợi 2, thực tế 11 |
| `DemoDataSeederIT.seedsSimpleLocalLoginAccountsWithoutResettingExistingPasswords` | Mong đợi IllegalStateException nhưng không có exception |
| `OrderServiceIT.paidOrderCannotBeCancelledByCustomerOrAdmin` | Mong đợi PAID_ORDER_CANNOT_BE_CANCELLED; thực tế PAYMENT_ALREADY_PAID |
| `CoreDatabaseIT.upgradesExistingV1BrandsWithoutLosingData` | V9 lỗi DROP constraint ck_orders_status khi test có nhiều schema; V9 tìm constraint theo tên bảng mà không giới hạn schema |

Log của lần chạy ở `backend/target/auth-full-final.log` và đối chiếu ở `backend/target/auth-baseline-check.log` (artifact local, không commit). Chưa xác nhận email thật đến Inbox với tài khoản Brevo của người dùng; test chỉ dùng mail giả lập. Chưa deploy Railway. Cần kiểm tra sender, key, quota và IP outbound khi chạy thực tế.
