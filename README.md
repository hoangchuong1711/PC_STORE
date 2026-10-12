# PC Store

Dự án môn Lập trình Web xây dựng cửa hàng linh kiện máy tính. Frontend dùng Next.js/TypeScript; backend dùng Java 21, Servlet trên Tomcat 10.1, Service → DAO → JPA/Hibernate → PostgreSQL 17. Frontend gọi backend qua HTTP/JSON. Flyway quản lý schema và Hibernate dùng `validate`.

## Chạy frontend với backend và database dùng chung

Backend chạy trên Railway và kết nối PostgreSQL trên Neon. Thành viên chỉ làm frontend không cần khởi động Docker, backend hoặc database trên máy. Cần Node.js 22 và npm. Tạo file `frontend/.env.local` với nội dung:

```dotenv
BACKEND_ORIGIN=https://pcstore-production-f981.up.railway.app
```

Từ thư mục gốc repo, chạy:

```bash
cd frontend
npm ci
npm run dev
```

Mở http://localhost:3000. Next.js chuyển các request `/api/...` tới backend Railway qua cấu hình trong `frontend/next.config.ts`; không thêm `/pc-store-backend` vào `BACKEND_ORIGIN`. Khi đổi `.env.local`, khởi động lại `npm run dev`. File `.env.local` được Git bỏ qua và không chứa mật khẩu Neon hoặc khóa VNPay.

- Catalog API: https://pcstore-production-f981.up.railway.app/pc-store-backend/api/categories
- Swagger UI: https://pcstore-production-f981.up.railway.app/pc-store-backend/api-docs/

Domain Railway hiện phục vụ backend, nên mở URL gốc của domain có thể trả 404; giao diện cửa hàng chạy tại `localhost:3000`. Các thao tác trên FE local như tạo tài khoản, tạo đơn và thay đổi tồn kho đi qua backend Railway sẽ ghi vào **Neon dùng chung**. Trong Swagger, gọi `POST /api/auth/login` trước các endpoint cần session.

## Phát triển trên nhánh tính năng

Tạo nhánh Git không tạo một backend Railway riêng. Railway vẫn chạy bản đã deploy; code backend hoặc migration mới trên nhánh chỉ tồn tại trên máy cho đến khi được đưa lên môi trường chung.

| Công việc | Cách chạy để thử |
| --- | --- |
| Chỉ sửa FE, dùng API đã deploy | Chạy `npm run dev` như trên, gọi Railway + Neon. |
| Sửa BE, thêm API hoặc migration | Chạy BE + PostgreSQL local bằng `compose.local.yaml`; cho FE gọi BE local. |
| Kiểm tra tích hợp trên môi trường chung | Đưa bản đã review lên nhánh triển khai, để Railway deploy rồi thử với Neon. |

Để thử BE và DB riêng, từ thư mục gốc tạo `.env` dựa trên `.env.example` và đặt `POSTGRES_PASSWORD` local. Sau đó chạy:

```bash
docker compose -f compose.local.yaml up --build -d backend
```

Đổi `BACKEND_ORIGIN` trong `frontend/.env.local` thành `http://localhost:8080`, khởi động lại `npm run dev`, rồi thử API mới. Dừng BE/DB local bằng `docker compose -f compose.local.yaml down`; volume PostgreSQL được giữ nếu không thêm `-v`. Flyway chạy migration trên DB mà BE đang kết nối. Nếu cần dữ liệu demo local, đặt `DEMO_SEED_ENABLED=true` trong `.env` rồi tạo lại backend; kiểm tra seed T09/T22 trước khi dựa vào việc chạy lặp vì hai file còn `BEGIN`/`COMMIT` riêng.

Task thanh toán cũng có thể thử trên nhánh riêng với BE + DB local: đặt `VNPAY_ENABLED=true`, `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` của Sandbox trong `.env`, giữ `VNPAY_RETURN_URL=http://localhost:3000/orders/payment-return`, rồi cho FE gọi `http://localhost:8080` như trên. Sau khi khách thanh toán, trang return hiện gửi các tham số VNPay đã ký đến BE local để cập nhật đơn trong DB local; có thể thử thêm chức năng đồng bộ trạng thái thanh toán từ chi tiết đơn. Không cần merge nhánh mới thử được luồng này. Tuy nhiên, IPN server-to-server do VNPay gọi không tới được `localhost`. Nếu IPN Sandbox đang trỏ về Railway, nó sẽ gọi BE Railway và không tìm thấy đơn chỉ có trong DB local. Muốn kiểm tra riêng callback IPN trước khi merge, cần URL HTTPS công khai chuyển tiếp tới BE đang thử và cấu hình IPN tương ứng trên Sandbox, hoặc môi trường thử nghiệm riêng với BE và DB của nhánh đó.

`compose.yaml` vẫn có thể chạy BE local kết nối Neon để kiểm tra tích hợp, nhưng mọi lệnh ghi sẽ tác động dữ liệu chung. Không dùng DB Neon chung để thử migration hoặc seed chưa kiểm tra. Các thay đổi chỉ có trong nhánh Git trên máy không tự xuất hiện trên Railway. Xem [hướng dẫn kiểm thử](docs/testing.md) để chạy test với DB test riêng.

## Cấu hình dịch vụ chung

Railway dùng `DB_URL`, `DB_USER`, `DB_PASSWORD` để kết nối Neon, cùng các biến môi trường của backend. Mật khẩu DB, khóa Cloudinary và VNPay chỉ lưu trong Railway Variables hoặc `.env` local; không commit chúng. Migration đã chạy được Flyway theo dõi trong `flyway_schema_history`; khi đổi schema, tạo migration mới thay vì sửa migration đã áp dụng trên Neon. Seed chỉ chạy khi bật `DEMO_SEED_ENABLED`; tắt cờ không xóa dữ liệu đã nạp.

Khi frontend chạy local và dùng VNPay Sandbox, `VNPAY_RETURN_URL` trên Railway phải trỏ đến `http://localhost:3000/orders/payment-return`; đây là trang FE mà trình duyệt khách quay về. IPN để VNPay báo kết quả cho backend là `https://pcstore-production-f981.up.railway.app/pc-store-backend/api/payment/vnpay/ipn`. Không đặt Return URL thành đường dẫn `/orders/payment-return` trên domain backend Railway vì ở đó không có FE. Xem [thiết kế VNPay](docs/T20B_VNPAY.md) và [hướng dẫn media](backend/T21_MEDIA.md) cho các biến backend tương ứng.

## Tìm tài liệu

- [Mục lục tài liệu và phạm vi](docs/README.md): bắt đầu tại đây khi đọc thiết kế dự án.
- [Kế hoạch T01–T38](docs/plane.md): bản kế hoạch và quan hệ phụ thuộc; trạng thái task xem trên Plane.
- [Mô hình dữ liệu](docs/data-model.md): schema mục tiêu và quy tắc dữ liệu.
- [Hướng dẫn kiểm thử](docs/testing.md): lệnh test backend/frontend.
- [OpenAPI](backend/src/main/webapp/api-docs/openapi.yaml): đặc tả API được phục vụ cùng Swagger UI.
- [AGENTS.MD](AGENTS.MD): quy tắc làm việc và Git của nhóm.

Tài liệu thiết kế có thể mô tả chức năng chưa triển khai. Đối chiếu code, migration và Work Item trước khi báo tính năng hoàn thành.
