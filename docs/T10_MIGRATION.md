# T10 migration và rollback thử nghiệm

V3 tạo 21 bảng Builder, thông số linh kiện, Review và Setup. V1–V4 đã
merge không được sửa. Script rollback nằm ở
`src/main/resources/db/rollback/V3__drop_builder_review_setup.sql`, ngoài
thư mục migration tự động.

## Giới hạn an toàn

- Chỉ dùng database dùng một lần; không dùng database ứng dụng/production.
- Dừng các tiến trình ứng dụng/migration truy cập database đó trước khi chạy.
- Chọn schema đích rõ ràng bằng `SET search_path`; mọi bảng được qualify theo
  schema đó, không lấy bảng từ schema dự phòng.
- Phải bật `SET pcstore.allow_t10_rollback = 'on'` trong cùng connection.
- Chỉ chạy nếu migration mới nhất là chính V3. Database đã lên V4 bị từ chối.
- Xóa dữ liệu FEATURE là không khôi phục được bằng migrate lại. Migrate lại
  chỉ tạo bảng rỗng. Không dùng thao tác này để bảo toàn dữ liệu FEATURE.
- Không xóa bảng CORE. Không dùng CASCADE: dependency ngoài phạm vi làm toàn
  bộ thao tác thất bại. Xóa bảng và điều chỉnh history V3 trong một statement
  nguyên tử; không cần và không được dùng Flyway repair để bỏ qua checksum.

## Kiểm chứng

Từ thư mục `backend`, với `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`
trỏ vào PostgreSQL test riêng và Java 21:

```powershell
mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT" verify
```

Test tự tạo schema `t10_*` riêng, chạy migration/fixture, kiểm tra rollback
và migrate lại rồi xóa schema test. Không chạy script trực tiếp trên database
đang phục vụ website. Người phụ trách database cần review trước khi mở PR.
