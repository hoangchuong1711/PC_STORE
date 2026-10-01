# PC Store

Dự án môn Lập trình Web: Next.js gọi API Java Servlet, backend dùng JPA/Hibernate để truy cập PostgreSQL.

## Trạng thái hiện tại

- T02: có Maven WAR, Servlet `/api/health` và cấu hình kết nối PostgreSQL.
- T03 đang triển khai từng phần: có [ERD CORE](docs/data-model.md), Flyway V1 tạo bảng `brands`, Entity `Brand` và test tích hợp ghi/đọc một hãng qua JPA.
- Các bảng CORE còn lại trong ERD là thiết kế dự kiến, chưa được tạo. T03 chưa hoàn tất toàn bộ mapping/schema.

Tài liệu chính: [hướng dẫn backend](backend/BACKEND_GUIDE.md), [kiến trúc](docs/architecture.md), [phạm vi](docs/scope.md), [hợp đồng API](docs/api.md).

## Chuẩn bị môi trường

- JDK 21, Maven 3.9 trở lên, Tomcat 10.1.
- PostgreSQL 17 cho môi trường đang dùng và test tích hợp.
- Docker Desktop chạy Linux containers nếu chạy PostgreSQL bằng Docker hoặc chạy test tích hợp.

Database phát triển `pc_store` phải tồn tại trước khi chạy ứng dụng. Nếu đã tạo bằng Docker thì tiếp tục dùng database đó. User kết nối cần quyền tạo bảng trong schema `public` để Flyway áp dụng migration.

Backend đọc ba biến môi trường từ tiến trình Tomcat:

| Biến | Giá trị ví dụ |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/pc_store` |
| `DB_USER` | `pc_store_app` |
| `DB_PASSWORD` | Mật khẩu đã đặt cho PostgreSQL trên máy bạn |

File `.env` dùng cho Docker Compose không tự truyền biến sang Tomcat. Khai báo các biến trong Smart Tomcat hoặc trong terminal khởi động Tomcat. Giữ mật khẩu trong cấu hình local, không commit vào Git.

## Chạy bằng IntelliJ IDEA và Smart Tomcat

1. Mở project và **Reload All Maven Projects** để nạp dependency Flyway.
2. Trong **Run → Edit Configurations**, chọn **Smart Tomcat**, server **Tomcat 10.1**, JDK **21** và module backend.
3. **Deployment Directory**: `<repo>\backend\src\main\webapp`.
4. **Context Path**: `/pc-store-backend`; cổng HTTP: `8080`.
5. Trong **Env Options/Environment variables**, thêm `DB_URL`, `DB_USER`, `DB_PASSWORD` ở bảng nhập tên/giá trị.
6. Build lại module, khởi động Smart Tomcat rồi gọi `http://localhost:8080/pc-store-backend/api/health`.

Thư mục `webapp` là gốc triển khai; Smart Tomcat lấy class và thư viện từ module. File `.gitkeep` giữ thư mục trong Git. Xem [hướng dẫn Smart Tomcat](https://github.com/zengkid/SmartTomcat#user-guide).

Ở lần gọi health đầu tiên của mỗi lần triển khai, backend chạy Flyway rồi tạo EntityManagerFactory với Hibernate `validate`. Flyway áp V1 nếu chưa chạy; các lần khởi tạo sau kiểm tra lịch sử và áp phiên bản còn thiếu. Hibernate không tự tạo hoặc sửa bảng.

Kết quả thành công là HTTP 200:

```json
{"status":"ok","application":"pc-store-backend","database":"connected"}
```

HTTP 503 cho biết bước cấu hình, migration hoặc JPA gặp lỗi. Xem log `localhost*.log` trong thư mục `logs` dưới Tomcat Base của Smart Tomcat. URL gốc `/pc-store-backend` chưa có trang giao diện.

## Đóng gói và triển khai WAR thủ công

Từ thư mục gốc repo:

```powershell
Set-Location backend
mvn clean package
```

WAR được tạo tại `backend/target/pc-store-backend.war`. Lệnh `package` chỉ đóng gói, chưa chạy test tích hợp PostgreSQL.

Trong cùng terminal đang ở `backend`, đặt đường dẫn Tomcat và thông tin DB rồi chạy:

```powershell
$env:CATALINA_HOME = 'C:\tools\apache-tomcat-10.1.x'
$env:DB_URL = 'jdbc:postgresql://localhost:5432/pc_store'
$env:DB_USER = 'pc_store_app'
$env:DB_PASSWORD = '<mat-khau-local>'
Copy-Item .\target\pc-store-backend.war "$env:CATALINA_HOME\webapps\pc-store-backend.war"
& "$env:CATALINA_HOME\bin\catalina.bat" run
```

## Test tích hợp một bảng trên PostgreSQL thật

Bật Docker Desktop, rồi chạy từ thư mục gốc repo:

```powershell
mvn -f backend/pom.xml clean verify -Pintegration-tests
```

Test `BrandDatabaseIT` dùng Testcontainers tạo PostgreSQL 17 riêng với cổng ngẫu nhiên và tự dọn container. Không cần Tomcat hay cấu hình `DB_*`; test không truy cập database `pc_store` của bạn.

Test kiểm tra liên tiếp:

1. Flyway áp V1 vào database rỗng và Hibernate kiểm tra mapping `Brand`.
2. Ghi một hãng có nội dung tiếng Việt bằng JPA rồi commit transaction.
3. Đóng EntityManagerFactory, tạo lại qua cùng `JpaConfig` và đọc dữ liệu từ database.
4. Kiểm tra dữ liệu còn nguyên và V1 chỉ có một dòng thành công trong `flyway_schema_history`.

Kết quả mong đợi: `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0`. Báo cáo nằm ở `backend/target/failsafe-reports`. Nếu Docker không sẵn sàng, test báo lỗi và không tự bỏ qua.

## Xem bảng bằng DBeaver và bổ sung migration

Sau khi chạy ứng dụng với DB phát triển và gọi health thành công, refresh **Schemas → public → Tables** trong DBeaver. Hiện chỉ có bảng nghiệp vụ `brands` và bảng quản lý phiên bản `flyway_schema_history`. Dữ liệu test nằm trong container riêng đã được dọn nên không xuất hiện tại đây.

Migration hiện tại: `backend/src/main/resources/db/migration/V1__create_brands.sql`. Sau khi V1 đã được áp dụng/chia sẻ, thêm thay đổi bằng `V2__...sql`; không sửa V1, không tự bật baseline hoặc xóa lịch sử để bỏ qua lỗi checksum. Nếu DB đã có bảng tạo thủ công, kiểm tra schema/lịch sử trước khi triển khai Flyway.

Để hoàn tất T03 còn cần migration và mapping cho các bảng CORE còn lại, kiểm tra ràng buộc quan hệ và hướng dẫn dựng lại toàn bộ schema trên máy khác.
