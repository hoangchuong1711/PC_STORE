# Kiểm thử PC Store

Tài liệu này ghi cách chạy kiểm thử từ repo hiện tại. Số ca và kết quả của một lần chạy xem trực tiếp trong báo cáo của công cụ; không duy trì bảng kết quả theo ngày trong tài liệu này.

## Backend

Cần Java 21 và Maven. Trong `backend/`:

```powershell
mvn -version
mvn -B test
```

`mvn test` chạy unit/contract test bằng Surefire, không cần PostgreSQL. Kết quả chi tiết nằm trong `backend/target/surefire-reports/`.

Integration test (`*IT`) cần PostgreSQL 17 **riêng với database ứng dụng**. Ví dụ tạo database test tạm:

```powershell
docker run -d --name pcstore-test-db -e POSTGRES_DB=pcstore_test -e POSTGRES_USER=pcstore_test -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55433:5432 postgres:17
docker exec pcstore-test-db pg_isready -U pcstore_test -d pcstore_test
```

Từ thư mục gốc repo, trong cùng cửa sổ PowerShell sẽ chạy Maven, đặt ba biến môi trường rồi chạy profile `db-test`:

```powershell
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:55433/pcstore_test'
$env:TEST_DB_USER='pcstore_test'
$env:TEST_DB_PASSWORD='local-test-only'
Set-Location backend
mvn -B -Pdb-test verify
```

Dùng database test có quyền tạo/xóa schema; các integration test tạo schema riêng. Không trỏ `TEST_DB_URL` vào database của ứng dụng. `verify` chạy Surefire, Failsafe và đóng gói WAR; kết quả integration nằm trong `backend/target/failsafe-reports/`. `CoreHttpIT` tự mở Tomcat nhúng trên cổng trống, nên không cần chạy ứng dụng riêng. Sau khi dùng xong, dừng container test bằng `docker stop pcstore-test-db`.

Để chạy một lớp test, dùng `mvn -B "-Dtest=OrderValidationTest" test` hoặc `mvn -B -Pdb-test "-Dit.test=OrderServiceIT" verify`. Tên lớp/phương thức phải khớp file hiện có trong `backend/src/test/`.

## Frontend

Cần Node.js phù hợp với `frontend/package.json`. Trong `frontend/`:

```powershell
npm ci
node --experimental-strip-types --test
npm run lint
```

Các file `*.test.mjs` dùng Node test runner; không cần khởi động Next.js để chạy chúng. Kết quả test hiện trên terminal. `npm run lint` kiểm tra mã frontend theo cấu hình ESLint hiện có.

## Cách đọc kết quả

Kiểm tra exit code và tổng failures/errors của lần chạy mới nhất. Test giao diện dùng fixture chỉ xác nhận hành vi của fixture; nghiệm thu luồng mua hàng thật vẫn cần chạy ứng dụng, API và database cùng nhau. OpenAPI contract test kiểm tra đặc tả, không thay thế kiểm thử endpoint thực tế.
