# OpenAPI và Swagger UI

Mở `http://localhost:8080/pc-store-backend/api-docs/` sau khi chạy backend.
Nếu `BACKEND_PORT=8081`, đổi cổng trong URL thành `8081`. Trang tài liệu nằm trên
Tomcat, không qua proxy Next.js. Các asset Swagger UI 5.33.1 được đóng gói trong WAR,
không cần CDN/Internet khi sử dụng. Build lần đầu vẫn cần tải Maven dependencies.

## Thử API

1. Chọn nhóm Auth, Catalog hoặc Admin products; mở endpoint rồi bấm **Try it out**.
2. Nhập request và bấm **Execute** để xem status, headers, response body.
3. Gọi `POST /api/auth/login` bằng tài khoản test trước khi gọi `/me` hoặc Admin.
   Browser nhận cookie `JSESSIONID` HttpOnly và tự gửi lại. Không nhập cookie vào
   **Authorize**: JavaScript không thể đặt cookie HttpOnly. Không cần bearer token.
4. Admin products yêu cầu tài khoản ADMIN; tài khoản đăng ký qua API là CUSTOMER.
5. Gọi logout để hủy session. POST/PATCH thay đổi dữ liệu thật, nên dùng DB test.

Spec hiện có 11 operation đã triển khai: 4 Auth, 4 Catalog, 3 Admin products.
Ẩn sản phẩm bằng PATCH `status: HIDDEN`; DELETE bị backend từ chối (405).
Cart, Order, Builder và health chưa được đưa vào vì chưa có route tương ứng trong
source của nhánh này. Các endpoint trong phần thiết kế của BACKEND_GUIDE không
đồng nghĩa đã triển khai.

## Cập nhật cùng API

Nguồn đặc tả duy nhất được phục vụ là
`src/main/webapp/api-docs/openapi.yaml` (OpenAPI 3.0.3).
Khi thêm/sửa endpoint, cập nhật path, method, operationId duy nhất, tag, query/body,
DTO schema, status/error và security trong cùng thay đổi. Tái sử dụng `components`.
Với PATCH, phân biệt field bỏ qua/null và chuỗi rỗng theo code Service.

`servers.url: '..'` được resolve từ vị trí file spec, nên hoạt động khi WAR đổi
context hoặc cổng. Giữ spec và Swagger UI cùng backend origin. CorsFilter chấp nhận
origin trùng scheme/host/port của request và các origin trong `CORS_ALLOWED_ORIGINS`;
origin ngoài hai nhóm vẫn nhận 403. Sau reverse proxy, cấu hình origin công khai
trong allowlist hoặc cấu hình connector/proxy chính xác; không tin forwarded header
tùy ý. Không dùng wildcard với session cookie.

## Kiểm tra

Với Java 21 và Maven, trong `backend/`:

```powershell
mvn -B test
mvn -B package
```

`OpenApiContractTest` parse/resolve spec, kiểm tra operation/security đã khai báo.
Khi thêm endpoint, cập nhật danh sách operation trong test sau khi đối chiếu Servlet.
Đây không phải cơ chế tự phát hiện mọi endpoint mới và không thay thế API integration test.
`CorsFilterTest` bảo vệ request Swagger cùng origin và các trường hợp origin bị từ chối.
Các integration test DB vẫn chạy bằng profile `db-test` theo BACKEND_GUIDE.

Khi nghiệm thu, mở Swagger UI và thử catalog, login → me → logout, customer gọi
admin (403), admin POST/PATCH và dữ liệu không hợp lệ. Không coi việc parse YAML
thành công là bằng chứng endpoint nghiệp vụ hoạt động đúng.

## Asset bên thứ ba

`src/main/webapp/api-docs/vendor/` chứa file nguyên bản từ npm `swagger-ui-dist@5.33.1`:
`https://registry.npmjs.org/swagger-ui-dist/-/swagger-ui-dist-5.33.1.tgz`.
Giữ `LICENSE`, `NOTICE`, `swagger-ui-bundle.js.LICENSE.txt` khi nâng phiên bản.
UI dùng BaseLayout nên không cần standalone preset. Validator ngoài được tắt
(`validatorUrl: null`); cookie không được lưu vào localStorage bởi UI.

Tài liệu được đóng gói cùng ứng dụng và truy cập công khai; phân quyền API vẫn do
backend kiểm tra. Nếu triển khai production cần hạn chế truy cập tài liệu, cấu hình
route `/api-docs/` tại reverse proxy theo chính sách của nhóm.
