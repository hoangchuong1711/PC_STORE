# PC Store

Dự án môn Lập trình Web: frontend Next.js/TypeScript; backend Java 21, Servlet trên Tomcat 10.1, Service → DAO → JPA/Hibernate → PostgreSQL 17. Frontend gọi backend qua HTTP/JSON. Flyway quản lý migration; Hibernate dùng `validate`.

## Chạy dự án

| Trường hợp | Lệnh | Backend và database |
| --- | --- | --- |
| Làm frontend trên `develop`, dùng bản backend đã deploy | Trong `frontend/`: `npm run dev` | Railway + Neon chung |
| Phát triển trên nhánh khác, chạy toàn bộ code local | Ở thư mục gốc: `docker compose up --build` | Backend + PostgreSQL trong Docker |

Đây là quy ước làm việc, không phải Git tự đổi môi trường. `npm run dev` luôn đọc cấu hình Railway trong `frontend/.env.local`, dù đang đứng trên nhánh nào. `docker compose up --build` luôn chạy frontend, backend và database local từ code của nhánh hiện tại. Khi đổi nhánh, dừng phiên chạy cũ rồi chạy lại lệnh phù hợp. Không cần sửa `BACKEND_ORIGIN` khi đổi nhánh.

### `develop`: frontend local, backend Railway

Cần Node.js 22 và npm. Trong `frontend/`, chạy `npm ci` lần đầu. Nếu chưa có `frontend/.env.local`, sao chép `frontend/.env.example` thành `.env.local`; file mẫu trỏ tới Railway:

```dotenv
BACKEND_ORIGIN=https://pcstore-production-f981.up.railway.app
```

Nếu `.env.local` từng trỏ localhost, đổi lại Railway một lần. Giữ các cấu hình khác trong file. Không thêm `/pc-store-backend` vào origin vì Next.js đã thêm context này khi chuyển tiếp `/api/...`.

```powershell
cd frontend
npm ci
npm run dev
```

Mở http://localhost:3000. Lệnh này chạy frontend của checkout hiện tại và gọi backend **đã deploy** trên Railway; code Java vừa sửa ở máy sẽ chưa xuất hiện trên Railway. Đăng ký, đặt hàng và các thao tác ghi khác sẽ tác động tới Neon dùng chung.

### Nhánh phát triển: toàn bộ stack local

Cần Docker Desktop đang chạy. Ở thư mục gốc, nếu chưa có `.env`, sao chép `.env.example` thành `.env` và đặt `POSTGRES_PASSWORD` cho database local. Giữ nguyên `.env` đã có cùng các key dịch vụ của bạn; không ghi đè bằng file mẫu.

```powershell
docker compose up --build
```

Compose build và chạy frontend, backend, PostgreSQL. Frontend trong Docker gọi `http://backend:8080` qua mạng Compose; backend kết nối PostgreSQL local, không kết nối Neon. Flyway chạy migration trên database local.

- Giao diện: http://localhost:3000
- Swagger local: http://localhost:8080/pc-store-backend/api-docs/
- PostgreSQL từ máy: `localhost:5432`, database `pc_store`, user `pc_store_app`, password trong `.env`.

Nhấn Ctrl+C để dừng. Muốn chạy nền, dùng `docker compose up -d --build`, xem log bằng `docker compose logs -f`, dừng bằng `docker compose stop`. Nếu code không đổi, lần sau có thể dùng `docker compose up`; khi sửa code hoặc đổi nhánh, chạy lại với `--build`. Docker chạy bản build nên sửa frontend hoặc backend sẽ không tự cập nhật như `npm run dev`.

`docker compose down` xóa container/network nhưng giữ volume PostgreSQL. Chỉ dùng `docker compose down -v` khi chủ động muốn xóa dữ liệu local. Đổi `POSTGRES_PASSWORD` trong `.env` không tự đổi mật khẩu của database đã khởi tạo trong volume. Các nhánh trong cùng checkout dùng chung volume; nếu quay về nhánh có schema cũ hơn, có thể cần database/volume riêng hoặc tạo lại dữ liệu local.

Nếu `npm run dev` đang chiếm cổng 3000, dừng nó trước khi chạy Compose. Nhiều checkout chạy cùng lúc cũng cần tách cổng và tên project Compose.

## Biến môi trường

| Vị trí | Dùng cho |
| --- | --- |
| `.env` gốc | Docker Compose: PostgreSQL local, Brevo, Cloudinary, VNPay cho backend local |
| `frontend/.env.local` | `npm run dev`: backend Railway |
| Railway Variables của backend | Backend đã deploy: Neon và các key dịch vụ trên Railway |

`.env` trên máy không tự đồng bộ lên Railway. File `frontend/.env.local` không được đưa vào Docker image; Compose truyền `BACKEND_ORIGIN=http://backend:8080` vào lúc build frontend. Hai biến trong hai môi trường không cần đổi qua lại. Không đặt `BACKEND_ORIGIN` toàn cục trong terminal nếu muốn `npm run dev` lấy giá trị từ `.env.local`.

Email chào mừng và OTP dùng Brevo HTTPS API: `MAIL_ENABLED`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`. Cấu hình này nằm ở backend. Xem [hướng dẫn email tài khoản](docs/auth-email-recovery.md). Các dịch vụ thật như Brevo/Cloudinary có thể được gọi từ backend local nếu bật và cung cấp key thật.

Mặc định seed tắt. Nếu cần dữ liệu demo local, đặt `DEMO_SEED_ENABLED=true` và/hoặc `DEMO_ACCOUNTS_ENABLED=true` trong `.env` rồi chạy lại Compose. Seed có thể thay đổi dữ liệu đã có và việc tắt cờ không xóa dữ liệu được seed.

Với VNPay Sandbox local, đặt `VNPAY_ENABLED=true`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` và `VNPAY_RETURN_URL=http://localhost:3000/orders/payment-return` trong `.env`. IPN server-to-server không gọi được localhost; để thử IPN cần HTTPS công khai chuyển tiếp tới backend local hoặc môi trường test riêng. Xem [thiết kế VNPay](docs/T20B_VNPAY.md).

Các biến `NEON_DB_*`, `NEON_DEMO_*`, `NEON_VNPAY_ENABLED` từ Compose cũ không còn được dùng. `compose.local.yaml` đã gộp vào `compose.yaml`.

## Kiểm thử và tài liệu

PC Recommendation ở `/recommendation`: xem [hướng dẫn Gemini API key, API và giới hạn](docs/PC_RECOMMENDATION.md). Mặc định tắt; chỉ cấu hình key ở backend. Chạy code nhánh mới bằng stack local, không chỉ frontend local với backend Railway chưa deploy.

Chạy kiểm thử theo [docs/testing.md](docs/testing.md). Integration test dùng PostgreSQL test riêng, không dùng Neon chung. Trong Swagger, gọi `POST /api/auth/login` trước endpoint cần session.

- [Mục lục và phạm vi](docs/README.md)
- [Kế hoạch T01–T38](docs/plane.md)
- [Mô hình dữ liệu](docs/data-model.md)
- [OpenAPI](backend/src/main/webapp/api-docs/openapi.yaml)
- [Hướng dẫn media](backend/T21_MEDIA.md)
- [Quy tắc làm việc và Git](AGENTS.MD)

Tài liệu thiết kế có thể mô tả chức năng chưa triển khai. Đối chiếu code, migration và Work Item trước khi báo tính năng hoàn thành.
