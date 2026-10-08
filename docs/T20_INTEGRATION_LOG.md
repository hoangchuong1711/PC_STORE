# Nhật ký tích hợp T20: Kết nối luồng dữ liệu thực tế Frontend - Backend

## 1. Tổng quan triển khai
- **Mục tiêu**: Chuyển đổi toàn diện giao diện từ dữ liệu giả lập (mock/fixture trong bộ nhớ) sang gọi API thực tế tới Backend Java Tomcat / PostgreSQL, đảm bảo không âm thầm nuốt lỗi và xử lý nghiêm ngặt các ràng buộc nghiệp vụ.
- **Nhánh làm việc**: `feat/t20-core-integration`
- **Phiên bản baseline**:
  - Backend: Java 21, Jakarta Servlet 6, Hibernate/JPA, PostgreSQL.
  - Frontend: Next.js 16 (App Router), React 19, TypeScript 5.

---

## 2. Danh mục Module tích hợp & Hợp đồng API

| Module | Endpoint Backend | HTTP Method | Thư viện API Frontend | Component UI tích hợp | Ràng buộc nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Catalog** | `/api/products`, `/api/products/{id}` | GET | `catalog-api.ts` | `quick-search.tsx`, `storefront.tsx` (HomePage, CatalogPage, ProductDetail) | Hỗ trợ lọc theo `q`, `categoryId`, `brandId`, `minPrice`, `maxPrice`, phân trang server. |
| **Phân loại công khai** | `/api/categories`, `/api/brands` | GET | `catalog-api.ts` | `storefront.tsx`, `quick-search.tsx` | Nạp trực tiếp danh mục & hãng có trạng thái ACTIVE. |
| **Giỏ hàng khách** | `/api/customer/cart`, `/api/customer/cart/items` | GET, POST, PUT, DELETE | `cart-api.ts` | `cart-provider.tsx`, `cart-drawer.tsx` | Khóa phiên theo session khách hàng (`userId`), đồng bộ `cartItemId`, tính toán tổng tiền trên máy chủ. |
| **Đặt hàng COD** | `/api/orders` | POST | `order-api.ts` | `shopping.tsx` | Yêu cầu `Idempotency-Key` (UUID 8–128 ký tự), hỗ trợ phương thức COD, tự động giải phóng tồn/khóa dòng kho theo thứ tự ID. |
| **Đơn hàng khách** | `/api/orders`, `/api/orders/{id}`, `/api/orders/{id}/cancel` | GET, POST | `order-api.ts` | `orders.tsx`, `app/orders/[id]/page.tsx` | Chỉ hiển thị đơn của chủ sở hữu; cho phép hủy đơn PENDING và giải phóng tồn kho. |
| **Admin Sản phẩm** | `/api/admin/products`, `/api/admin/products/{id}`, `/api/admin/products/{id}/inventory` | POST, PATCH | `admin-product-api.ts` | `components/admin/admin-products.tsx` | Không được xóa cứng (405 HARD_DELETE_NOT_ALLOWED, chuyển sang HIDDEN); cập nhật tồn kho qua PATCH subpath. |
| **Admin Đơn hàng** | `/api/admin/orders`, `/api/admin/orders/{id}`, `/api/admin/orders/{id}/status` | GET, PUT | `admin-order-api.ts` | `components/admin/admin-orders.tsx` | Xem toàn bộ đơn hàng hệ thống; chuyển trạng thái theo máy trạng thái backend; hỗ trợ hủy đơn. |
| **Admin Taxonomy** | `/api/admin/categories/*`, `/api/admin/brands/*` | GET, POST, PUT | `admin-taxonomy-api.ts` | `components/admin/admin-categories.tsx` | Quản lý danh mục & thương hiệu đối tác, bật/tắt hiển thị. |

---

## 3. Nguyên tắc kiến trúc & Xử lý lỗi
1. **Loại bỏ Silent Fallback**: Khi kết nối backend gặp sự cố hoặc trả mã lỗi (400, 401, 403, 404, 409, 500), UI hiển thị thông báo lỗi cụ thể kèm nút thử lại (`Thử tải lại`), không tự ý fallback về dữ liệu mẫu nhằm bảo đảm tính toàn vẹn dữ liệu.
2. **Khách vãng lai & Đăng nhập**:
   - Khách vãng lai: Lưu giỏ hàng cục bộ, khi vào thanh toán sẽ được yêu cầu đăng nhập.
   - Khách đã đăng nhập: Giỏ hàng tự động đồng bộ 2 chiều với máy chủ qua session cookie (`same-origin`).
3. **Idempotency trong Thanh toán**: Sinh UUID ngẫu nhiên cho mỗi phiên checkout, tránh trùng lặp đơn hàng khi mạng chập chờn hoặc bấm đúp.
4. **Chuẩn hóa ID**: Xử lý linh hoạt cả ID số nguyên của Backend và format hiển thị `#<orderId>` trên giao diện.

---

## 4. Bằng chứng kiểm thử & Xác thực (Verification Evidence)

### A. TypeScript Verification
- Lệnh kiểm tra: `npx tsc --noEmit`
- Kết quả: **0 lỗi** (Exit code 0).

### B. Frontend Unit Test Suite
- Lệnh kiểm tra: `node --experimental-strip-types --test lib/*.test.mjs`
- Kết quả: **64/64 test case passed** (100% thành công):
  - `account.test.mjs`: 2 pass
  - `admin-taxonomy-api.test.mjs`: 3 pass
  - `admin.test.mjs`: 12 pass
  - `auth-api.test.mjs`: 3 pass
  - `cart-api.test.mjs`: 2 pass
  - `cart.test.mjs`: 2 pass
  - `catalog-api.test.mjs`: 6 pass
  - `community.test.mjs`: 6 pass
  - `order-api.test.mjs`: 9 pass
  - `orders.test.mjs`: 3 pass
  - `reviews.test.mjs`: 4 pass
  - `admin-product-api.test.mjs`: 5 pass
  - `admin-order-api.test.mjs`: 4 pass

### C. Production Build Verification
- Lệnh kiểm tra: `npm run build`
- Kết quả: **Thành công biên dịch tất cả 37 Static/SSG/Dynamic routes** (Next.js 16.3.7 App Router + Turbopack). Route `/orders/[id]` được render động theo dữ liệu đơn hàng thực tế của khách hàng.

### D. Backend Build & Unit Test Verification
- Lệnh biên dịch: `mvn test-compile` -> **BUILD SUCCESS**.
- Lệnh chạy kiểm thử: `$env:JAVA_HOME='D:\IntelliJ IDEA 2025.3.2\jbr'; mvn test` -> **BUILD SUCCESS** (34/34 Surefire unit & validation tests passed, 0 failures, 0 errors).

---

## 5. Tinh chỉnh Core COD & Phân tách phạm vi Thanh toán Online (08/10/2026)
1. **Tách riêng cổng thanh toán online (VNPAY / VietQR / Expiration 15m / Hoàn tiền)** sang task độc lập `T20-B`.
2. **Khóa lựa chọn BANK_TRANSFER tại Checkout**: Chỉ kích hoạt phương thức COD, vô hiệu hóa radio chọn chuyển khoản kèm thông báo "Sắp ra mắt" để đồng bộ nghiêm ngặt với quy tắc backend (`T14 chỉ hỗ trợ COD`).
3. **Loại bỏ triệt để Silent Fallback**:
   - `admin-products.tsx`: Xóa bỏ việc tự ý lưu vào `localStorage` khi gọi API cập nhật hoặc tạo sản phẩm thất bại; hiển thị lỗi trực tiếp lên form chỉnh sửa. Loại bỏ `.catch(() => {})` nuốt lỗi ngầm trong `applyBulkStatus` và `updateProductStatus`.
   - `admin-orders.tsx`: Gỡ bỏ hàm và nút `confirmPayment()` tự bấm thành `PAID` ở client. Trạng thái thanh toán của đơn COD do backend tự động ghi nhận khi đơn chuyển sang `DELIVERED`.
   - `orders/[id]/page.tsx` & `orders.tsx`: Gỡ bỏ hàm mock tĩnh `getOrder(id)` và `generateStaticParams()`. Chi tiết đơn hàng được nạp trực tiếp qua `orderApi.getById(id)` từ backend.
4. **Tối ưu hóa cấu hình TypeScript**: Bổ sung `.next` vào `exclude` trong `tsconfig.json`, loại bỏ hoàn toàn lỗi Out-Of-Memory khi biên dịch.
