# PC STORE — hướng dẫn triển khai backend

> Đọc trước khi sửa `backend/`. Tài liệu này gom quy tắc nghiệp vụ, mô hình dữ liệu và hợp đồng API cho bản CORE + PC Builder/Compatibility. Đây là **thiết kế triển khai**, không phải mô tả những gì đã code xong.

**Nguồn hiện hành cho T03 (01/10/2026):** theo yêu cầu triển khai, [data-model.md](../docs/data-model.md) là chuẩn schema và quy tắc dữ liệu đã hiệu chỉnh. Khi bản tóm lược cũ trong tài liệu này khác data-model, dùng data-model. T03 chỉ cung cấp schema/mapping; các quy tắc Service chưa phải chức năng đã triển khai.

## 1. Nguồn và phạm vi

- [Plane — 4. Thiết kế hệ thống, ClassDiagram, ERD](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/a1cc795d-126f-4258-8cab-5814e173364b/) là nguồn ưu tiên cho **nghiệp vụ và mô hình**. Ưu tiên phần chốt mới nhất trong chính page này khi đoạn cũ mâu thuẫn.
- [Plane — BE](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/3029ba6f-9259-4e5c-96f8-1626271c3b60/) là nguồn ưu tiên cho **cách triển khai Java backend**. Các đoạn DB trùng hoặc cũ trong page BE không thay thế Page 4.
- [Sơ đồ lớp draw.io](https://drive.google.com/file/d/1DLNWCcSMbpzboYWm2-Qguv7lnr3yn1jK/view) cung cấp tên class, field và quan hệ trực quan. Các field bên dưới được đối chiếu trực tiếp từ file `.drawio` sửa ngày 30/09/2026. Sơ đồ này là thiết kế toàn hệ thống; không phải lệnh tạo tất cả bảng trong sprint đầu.
- Page **SystemDesign** là tài liệu tham khảo kiến trúc trước Page 4/BE; nếu khác về nghiệp vụ thì theo Page 4, nếu khác về triển khai backend thì theo BE.
- Quyết định nhóm: **CORE + PC Builder/Compatibility** là mục tiêu 2 tuần; Review, Setup Community rồi ADVANCED làm sau khi phần trước chạy chắc.

**Mức kiểm chứng:** file draw.io và các tài liệu đã có trong repo được đọc lại trực tiếp khi soạn bản này. Công cụ đọc Plane không mở lại được các page trong lượt làm việc hiện tại, nên phần Page 4/BE/SystemDesign dựa trên nội dung đã đọc ở lượt trước và bản tóm lược `README.md`, `docs/scope.md`. Vì vậy tên endpoint, schema vật lý và chi tiết chưa thể kiểm tra trực tiếp được đánh dấu là đề xuất/chưa chốt, không gán nhầm là nội dung nguyên văn từ Plane.

**Trạng thái repo:** đã có Servlet `GET /api/health`, JPA/Hibernate và Flyway V1 + V2 cho 12 bảng CORE, cùng entity và kiểm thử PostgreSQL. Catalog T05 và auth T06 đã có API; các luồng CORE còn lại tiếp tục theo task. T10 bổ sung V3 cho 21 bảng Builder/Spec, Review và Setup, mới ở mức schema; xem [hướng dẫn T10](T10_MIGRATION.md). API FEATURE và các phần ADVANCED còn là thiết kế. ERD nằm trong [data-model.md](../docs/data-model.md); cách gọi health nằm trong [README](../README.md).

## 2. Kiến trúc và quy ước code

```text
Next.js (HTTP JSON + session cookie)
    → Tomcat 10.1 / Jakarta Servlet controller
    → Service (nghiệp vụ, phân quyền cấp đối tượng, transaction)
    → DAO (JPA EntityManager)
    → Hibernate → PostgreSQL
```

Java 21, Maven, `jakarta.servlet.*`, `jakarta.persistence.*`. Frontend không truy cập PostgreSQL. Servlet nhận request, validate hình dạng dữ liệu, gọi Service và chuyển DTO thành JSON. Service kiểm tra quy tắc và điều phối transaction. DAO chỉ truy vấn/lưu bằng JPA; các DAO trong cùng thao tác checkout dùng **cùng EntityManager/transaction**. Không đưa nghiệp vụ vào JSP/Next.js hoặc cho Servlet thao tác SQL/JPA trực tiếp.

| Package | Trách nhiệm |
| --- | --- |
| `controller` | Servlet route, parse request, HTTP status, JSON response. |
| `dto` | Request/response riêng; không trả JPA Entity trực tiếp. |
| `service` | Giá, kho, quyền sở hữu, trạng thái đơn, compatibility, transaction. |
| `dao` | Truy vấn và persistence qua `EntityManager`. |
| `entity` | JPA Entity và quan hệ ánh xạ database. |
| `entity.enums` | Enum dùng bởi Entity và nghiệp vụ; giá trị lưu trong database bằng chuỗi. |
| `filter` | Session/role cho route; Service vẫn kiểm tra chủ sở hữu từng đơn/build. |
| `config` | JPA, datasource, JSON, CORS/cookie theo môi trường thực tế. |
| `exception` | Lỗi nghiệp vụ và ánh xạ sang HTTP response. |

Tiền dùng `BigDecimal` ở Java và `NUMERIC/DECIMAL` ở PostgreSQL; không dùng `double` để tính tiền. Password chỉ lưu hash. Mọi thay đổi schema đi qua migration/script được commit; không dựa vào DB trên máy một thành viên. DB, entity, DAO, tài liệu quan hệ và dữ liệu mẫu phải cùng phiên bản.

## 3. Phạm vi dữ liệu theo đợt

| Đợt | Nhóm dữ liệu |
| --- | --- |
| CORE | User, Address, Category, Brand, Product, ProductImage, Inventory, Cart, CartItem, Order, OrderItem, Payment. |
| Builder/Compatibility | PcBuild, PcBuildItem, các bảng Spec và danh mục Socket/FormFactor thật sự dùng cho rule. |
| Sau sprint | ProductReview, SetupPost/SetupImage, AI Recommendation, Promotion, Warranty, Media nâng cao. Không tạo trước chỉ vì class có trong sơ đồ. |

`Address` thuộc CORE theo data-model đã hiệu chỉnh; chưa có AdministrativeArea. `Order` tự lưu **shippingName, shippingPhone, shippingAddressText** tại lúc đặt. `CartItem` không chốt giá; `OrderItem` chốt `baseUnitPrice` và `unitPrice` lúc đặt (CORE chưa giảm giá nên hai giá bằng nhau). `Inventory` là nguồn tồn kho, không thêm một số tồn độc lập vào `Product`.

## 4. Class/field và JPA mapping

### 4.1 Tài khoản và catalog

| Class | Field từ sơ đồ | Quan hệ / ràng buộc triển khai |
| --- | --- | --- |
| `User` | `userId:int`, `fullName:String`, `email:String`, `passwordHash:String`, `phone:String`, `role:UserRole`, `status:UserStatus` | `email` chuẩn hóa chữ thường và unique; role `CUSTOMER/ADMIN`; status `ACTIVE/INACTIVE`. Địa chỉ lưu trong Address có FK tới User, không thay snapshot trong đơn. |
| `Category` | `categoryId:int`, `name`, `description`, `componentType:ComponentType?`, `status:ActiveStatus` | 1 category → nhiều product. `componentType` chỉ có giá trị cho nhóm linh kiện dùng Builder. |
| `Brand` | `brandId:int`, `name`, `description`, `logoUrl`, `status:ActiveStatus` | 1 brand → nhiều product. |
| `Product` | `productId:int`, `name`, `description`, `price:BigDecimal`, `status:ProductStatus`, `category:Category`, `brand:Brand` | `@ManyToOne` tới Category/Brand; `price >= 0`; sản phẩm trong đơn cũ không xóa cứng. |
| `ProductImage` | `imageId:int`, `product:Product`, `imageUrl`, `isPrimary:boolean`, `sortOrder:int` | `@ManyToOne Product`; mỗi product có tối đa một ảnh primary (ràng buộc DB hoặc service). |
| `Inventory` | `inventoryId`, `quantityOnHand:int`, `reservedQuantity:int` | Gắn 1–1 với Product. Theo data-model: giữ chỗ khi checkout, giảm cả on-hand/reserved khi xuất hàng; hủy trước xuất giải phóng reserved. Các thao tác nghiệp vụ triển khai ở Service sau T03. |

**ProductStatus đã chốt:** `ACTIVE`, `INACTIVE`, `DRAFT`, `OUT_OF_STOCK`, `DISCONTINUED`, `HIDDEN`. Xóa `ACTIVE` bị lặp trong sơ đồ; lưu enum bằng chuỗi. `Inventory.quantityOnHand` vẫn là nguồn số lượng thực. Service phải kiểm tra **cả trạng thái được phép bán và tồn > 0**; không suy số dư tồn từ enum. Quy tắc tự chuyển `ACTIVE ↔ OUT_OF_STOCK` cần thống nhất với thao tác chỉnh tồn của Admin trước khi code, để không vô tình mở bán một Product đang `DRAFT/HIDDEN`.

### 4.2 Giỏ, đơn và thanh toán

| Class | Field từ sơ đồ | Quan hệ / ràng buộc triển khai |
| --- | --- | --- |
| `Cart` | `cartId:int`, `items:List`, `createdAt`, `updatedAt` | Sơ đồ nối User 1 ↔ Cart 0..1; triển khai `@OneToOne User`, unique `user_id`. Cart có nhiều CartItem. |
| `CartItem` | `cartItemId:int`, `product:Product`, `quantity:int` | `@ManyToOne Cart/Product`; unique `(cart_id,product_id)`; `quantity > 0`. `getUnitPrice()` lấy giá Product hiện hành. |
| `Order` | `orderId:int`, `user:User`, `orderDate`, `status:OrderStatus`, `totalAmount:BigDecimal`, `shippingName`, `shippingPhone`, `shippingAddressText`, `deliveredAt?`, `items:List` | `@ManyToOne User`, `@OneToMany OrderItem`; `totalAmount` tính từ các dòng snapshot. |
| `OrderItem` | `orderItemId:int`, `order:Order`, `product:Product`, `quantity:int`, `baseUnitPrice:BigDecimal`, `unitPrice:BigDecimal` | `@ManyToOne Order/Product`; `quantity > 0`; cả hai giá được chốt trong CORE. Cột/FK `appliedPromotionRule` chỉ thêm ở migration Promotion. |
| `Payment` | `paymentId:int`, `order:Order`, `method:PaymentMethod`, `amount:BigDecimal`, `status:PaymentStatus`, `transactionId?`, `paidAt?` | Bản 2 tuần: một Payment/Order (`@OneToOne`, unique `order_id`), `COD` hoặc `BANK_TRANSFER` thủ công; trạng thái `PENDING/PAID/FAILED`. Không đánh dấu `PAID` chỉ vì tạo đơn. |

`OrderStatus` trên sơ đồ: `PENDING`, `CONFIRMED`, `SHIPPING`, `DELIVERED`, `CANCELLED`. Page 4 mô tả tiến tới DELIVERED; hủy từ PENDING/CONFIRMED. Service chỉ cho chuyển trạng thái hợp lệ và ghi nhận một lần. Điều kiện giao thành công còn được dùng cho Review/Setup Community sau này.

### 4.3 Builder và thông số linh kiện

| Class | Field từ sơ đồ | Quan hệ / ràng buộc triển khai |
| --- | --- | --- |
| `PcBuild` | `buildId:int`, `user:User`, `name`, `sourceType:BuildSourceType`, `items:List` | `@ManyToOne User`, `@OneToMany PcBuildItem`; `MANUAL/RECOMMENDATION`. Chỉ chủ sở hữu được xem/sửa/xóa. |
| `PcBuildItem` | `buildItemId:int`, `build:PcBuild`, `product:Product`, `quantity:int` | `@ManyToOne PcBuild/Product`; bản 2 tuần chỉ cấu hình mua mới, số cần mua bằng `quantity`. Page 4 còn nêu `ownedQuantity`; giữ quy tắc này trong thiết kế mở rộng, chưa bắt buộc lưu cột/logic ở sprint đầu. |
| `Socket` | `socketCode:String` (PK), `name` | CPU, motherboard và danh sách socket cooler dùng cùng mã. |
| `FormFactor` | `formFactorCode:String` (PK), `name` | Motherboard và danh sách form factor case dùng cùng mã. |
| `CpuSpec` | `product` (PK/FK), `socket`, `cores`, `threads`, `baseClockGhz`, `boostClockGhz`, `tdpWatts` | `@OneToOne` Product, shared PK (`@MapsId` nếu dùng entity riêng); `@ManyToOne Socket`. |
| `MotherboardSpec` | `product` (PK/FK), `socket`, `chipset`, `ramType`, `pcieVersion`, `formFactor`, `ramSlots`, `maxRamGb` | `@OneToOne` Product; Socket/FormFactor reference. |
| `RamSpec` | `product` (PK/FK), `ramType`, `capacityGb`, `speedMhz`, `moduleCount` | `@OneToOne` Product. Dung lượng tổng phụ thuộc số lượng bộ RAM chọn và `moduleCount`. |
| `GpuSpec` | `product` (PK/FK), `vramGb`, `memoryType`, `interfaceType`, `lengthMm`, `powerConsumptionW`, `recommendedPsuW` | `@OneToOne` Product. |
| `StorageSpec` | `product` (PK/FK), `storageType`, `interfaceType`, `capacityGb`, `readSpeedMBps`, `writeSpeedMBps` | `@OneToOne` Product. |
| `PsuSpec` | `product` (PK/FK), `wattage`, `efficiencyRating`, `modularType` | `@OneToOne` Product. |
| `CaseSpec` | `product` (PK/FK), `maxGpuLengthMm`, `maxCoolerHeightMm`, `maxRadiatorSizeMm` | `@OneToOne` Product; `CaseSupportedFormFactor` nối các form factor hỗ trợ. |
| `CoolerSpec` | `product` (PK/FK), `coolerType`, `maxTdpW`, `heightMm`, `radiatorSizeMm` | `@OneToOne` Product; `CoolerSupportedSocket` nối các socket hỗ trợ. |
| `CaseSupportedFormFactor` | `caseSpec`, `formFactor`; PK ghép | Bảng nối, PK `(case_product_id,form_factor_code)`. |
| `CoolerSupportedSocket` | `coolerSpec`, `socket`; PK ghép | Bảng nối, PK `(cooler_product_id,socket_code)`. |

`ComponentType`: `CPU`, `MOTHERBOARD`, `RAM`, `GPU`, `STORAGE`, `PSU`, `CASE`, `COOLER`. Đây là 8 nhóm chọn trong Builder. Sơ đồ còn có `MonitorSpec` và `GearSpec` cho catalog bán hàng; không đưa màn hình/gear vào kiểm tra tương thích thùng PC. Các Spec không cần cho bộ sản phẩm mẫu có thể bổ sung ở migration sau.

**Lưu ý mapping:** `Product` ↔ từng Spec là 1–0..1 với `product_id` vừa PK vừa FK ở bảng Spec. Product có thể có nhiều ảnh. Không dùng `@ManyToMany` ẩn cho hai bảng nối có khóa ghép nếu cần kiểm soát ràng buộc/seed rõ ràng. Dùng `EnumType.STRING`, không lưu ordinal. Sơ đồ lớp không quyết định tên bảng/cột SQL; migration đầu tiên sẽ chốt tên thống nhất và JPA ánh xạ theo đúng migration.

## 5. Các luồng nghiệp vụ backend

### Đăng ký, đăng nhập, quyền

1. Đăng ký: chuẩn hóa email, kiểm tra trùng, hash password, mặc định `CUSTOMER/ACTIVE`.
2. Đăng nhập: kiểm tra hash và trạng thái, tạo `HttpSession`; cookie phiên do Tomcat quản lý. Logout hủy session.
3. Filter chặn route cần đăng nhập, CUSTOMER hoặc ADMIN. Service tiếp tục kiểm tra `order.user.id`, `cart.user.id`, `build.user.id` trước mọi thao tác theo ID. Không tin `userId`, `role`, `price` do client gửi.
4. `CorsFilter` cho phép đúng origin trong `CORS_ALLOWED_ORIGINS` (danh sách phân cách dấu phẩy), bật credentials và từ chối origin khác. Giá trị Compose mặc định là `http://localhost:3000`; cấu hình domain frontend thật khi triển khai. Không dùng `Access-Control-Allow-Origin: *` cùng cookie. Filter điều chỉnh cookie `JSESSIONID` cho `Path=/`, `HttpOnly`, `SameSite=Lax` tương thích proxy `/api/*` tới context `/pc-store-backend`. Bật `SESSION_COOKIE_SECURE=true` khi chạy sau HTTPS. Khi frontend gọi trực tiếp backend khác site, cần HTTPS và cấu hình SameSite/CSRF phù hợp.

Các endpoint auth đã triển khai: `POST /api/auth/register` (201), `POST /api/auth/login` (200 + session cookie), `POST /api/auth/logout` (204), `GET /api/auth/me` (200). Lỗi JSON có dạng `{ "code": "...", "message": "..." }`; email được trim/chuyển chữ thường và unique, mật khẩu lưu PBKDF2-HMAC-SHA256. Route `/api/admin/*` yêu cầu ADMIN; `/api/customer/*` yêu cầu CUSTOMER; `/api/auth/me` và logout yêu cầu session. Không gửi cookie hoặc role trong JSON.

### Catalog → giỏ → checkout → đơn

1. Catalog chỉ trả sản phẩm được phép bán/hiển thị, giá hiện hành và lượng có thể mua. Search/filter và phân trang chạy ở DAO, không lấy toàn bộ DB rồi lọc ở Java.
2. Giỏ lưu Product + số lượng; thêm cùng sản phẩm thì gộp dòng. Tổng giỏ được tính lại bằng giá hiện hành trên server.
3. Checkout đọc giỏ của user, kiểm tra giỏ không rỗng, sản phẩm hợp lệ, số lượng dương, thông tin nhận hàng và tồn kho. Backend đọc lại giá, tuyệt đối không nhận `totalAmount` do client tính.
4. Trong **một transaction**: khóa/cập nhật tồn an toàn; tạo Order, OrderItem snapshot giá và địa chỉ; ghi Payment `COD` hoặc `BANK_TRANSFER`; tăng giữ chỗ; làm rỗng giỏ; commit. Nếu một bước lỗi thì rollback toàn bộ. Hai người mua món cuối không được cùng thành công.
5. Theo data-model §6.2, checkout tăng `reservedQuantity`, chưa giảm `quantityOnHand`; xuất hàng giảm cả hai. Hủy PENDING/CONFIRMED chưa PAID giải phóng giữ chỗ đúng một lần, không tăng on-hand. Service khóa Order/Inventory và kiểm tra trạng thái; không cho sửa số lượng đơn sau khi đặt.
6. Request checkout gửi lặp cần cơ chế chống tạo hai đơn (ví dụ idempotency key theo user + request); đây là chi tiết triển khai cần chốt khi code endpoint, không chỉ khóa nút trên UI.

Giữ bất biến `0 <= reservedQuantity <= quantityOnHand`; tồn khả dụng = on-hand − reserved. Không giữ chỗ khi thêm giỏ. Quy tắc khóa, đối soát và chuyển trạng thái theo data-model §6.2; T03 mới ràng buộc được bất biến trên một hàng.

Với `BANK_TRANSFER`, backend tạo đơn và Payment `PENDING`, trả thông tin để frontend hiển thị hướng dẫn chuyển khoản; **không tự xác nhận đã thanh toán**. Admin đối chiếu tiền đã nhận rồi chuyển Payment sang `PAID`, ghi `paidAt` (và mã tham chiếu nếu có). Chỉ được chuyển đơn chuyển khoản sang `SHIPPING` khi Payment đã `PAID`; backend kiểm tra điều này trong Service, không chỉ khóa nút trên UI. Thông tin tài khoản nhận tiền là cấu hình ngoài mã nguồn, không lưu thông tin nhạy cảm trong Git.

Với `COD`, Payment giữ `PENDING` sau checkout; Admin chỉ đánh dấu `PAID` sau khi xác nhận đã thu tiền lúc giao. Trạng thái thanh toán và trạng thái vận chuyển là hai giá trị riêng. Bản 2 tuần chưa có tự hủy đơn chuyển khoản quá hạn; Admin chủ động xử lý đơn chưa trả và việc hủy phải hoàn kho theo quy tắc trên.

### Admin

Admin thêm/sửa/ẩn sản phẩm, điều chỉnh kho theo quy tắc một nguồn Inventory, xem đơn và chuyển trạng thái hợp lệ. Không xóa cứng Product đã được OrderItem tham chiếu. Customer không gọi được API admin dù ẩn nút trong giao diện.

### Builder/Compatibility

1. Build lưu user, tên, nguồn tạo, Product và số lượng. Product phải thuộc đúng `ComponentType`; kiểm tra chủ sở hữu trước xem/sửa/xóa.
2. Tính tổng theo giá Product hiện hành của phần cần mua; không lưu một tổng độc lập dễ lệch sau khi giá đổi. Khi thêm vào giỏ, backend kiểm tra lại Product, số lượng và tồn.
3. Compatibility trả kết quả **từng rule**: `PASS`, `FAIL` hoặc `UNKNOWN` với lý do. Thiếu spec → `UNKNOWN`, không trả PASS. Không tuyên bố toàn bộ build tương thích khi còn rule bắt buộc UNKNOWN.
4. Các rule mục tiêu: CPU/main socket; CPU/cooler socket; RAM type, slot và dung lượng main; main/case form factor; GPU length/case; cooler height/case; PSU wattage theo dữ liệu `recommendedPsuW` và các giới hạn đã được nhóm chốt. BIOS, đầu cắm, radiator và những rule không có dữ liệu/test không được tự nhận là đã kiểm tra.
5. Chỉ thêm build vào giỏ khi đủ nhóm linh kiện và các rule bắt buộc đạt theo chính sách nhóm. Rule và dữ liệu mẫu phải có ca PASS, FAIL, UNKNOWN; ít nhất hai build hợp lệ cho demo.

## 6. Hợp đồng API đề xuất

**Đây là danh sách endpoint đề xuất để frontend/backend code thống nhất, không phải endpoint đã tồn tại trong Plane hay repo.** Khi triển khai endpoint nghiệp vụ, cập nhật path, JSON mẫu và mã lỗi trong hướng dẫn này để cả hai phía dùng một hợp đồng. Response dùng DTO; lỗi có dạng thống nhất như `{ "code": "OUT_OF_STOCK", "message": "..." }`.

| Method/path | Quyền | Request chính | Response chính |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Guest | `fullName,email,password` | user public DTO |
| `POST /api/auth/login` | Guest | `email,password` | user public DTO + session cookie |
| `POST /api/auth/logout` | Login | — | 204 |
| `GET /api/auth/me` | Login | — | user public DTO |
| `GET /api/products` | Public | `q,categoryId,brandId,minPrice,maxPrice,page,size` | products + pagination |
| `GET /api/products/{id}` | Public | — | product detail + images + availability |
| `GET /api/categories`, `GET /api/brands` | Public | — | danh mục/hãng đang hiển thị |
| `GET /api/cart` | Customer | — | items, giá hiện hành, tổng |
| `POST /api/cart/items` | Customer | `productId,quantity` | cart DTO |
| `PATCH /api/cart/items/{id}` | Customer | `quantity` | cart DTO |
| `DELETE /api/cart/items/{id}` | Customer | — | 204 |
| `POST /api/orders` | Customer | header `Idempotency-Key`; `shippingName,shippingPhone,shippingAddressText,paymentMethod: COD`; giỏ ở server | order ID, snapshot items/total/status và Payment status |
| `GET /api/orders`, `GET /api/orders/{id}` | Customer | — | chỉ đơn của chính user |
| `POST /api/orders/{id}/cancel` | Chủ đơn | — | order status, tồn giữ chỗ đã giải phóng nếu áp dụng |
| `POST /api/admin/products`, `PATCH /api/admin/products/{id}` | Admin | trường catalog/kho phù hợp | product DTO |
| `GET /api/admin/orders`, `GET /api/admin/orders/{id}` | Admin | — | mọi đơn hoặc chi tiết đơn |
| `PUT /api/admin/orders/{id}/status` | Admin | `status` mới | order DTO |
| `POST /api/admin/orders/{id}/confirm-payment` | Admin | mã tham chiếu tùy chọn sau khi đối chiếu | Payment `PAID`, `paidAt`; từ chối xác nhận lặp |
| `GET /api/builds`, `POST /api/builds` | Customer | name/items | build DTO |
| `GET /api/builds/{id}`, `PUT /api/builds/{id}`, `DELETE /api/builds/{id}` | Chủ build | items/name | build DTO hoặc 204 |
| `POST /api/builds/validate` | Customer | items tạm | kết quả từng rule |
| `POST /api/builds/{id}/add-to-cart` | Chủ build | — | cart DTO |

Mã lỗi tối thiểu: `400` input sai; `401` chưa đăng nhập; `403` thiếu quyền; `404` không thấy hoặc không sở hữu tài nguyên theo chính sách bảo mật; `409` xung đột như hết hàng, trạng thái đơn sai, checkout trùng; `500` lỗi server. Không trả stack trace, password hash hoặc Entity JPA ra JSON.

### 6.1. T05 catalog public (đã triển khai)

`GET /api/products` nhận `q`, `categoryId`, `brandId`, `minPrice`, `maxPrice`, `page` (mặc định `0`) và `size` (mặc định `20`, tối đa `100`). Các điều kiện lọc kết hợp bằng AND; tìm kiếm `q` không phân biệt hoa thường trên tên sản phẩm. Phân trang có thứ tự ổn định theo `product_id ASC`.

Catalog public chỉ trả Product có `status = ACTIVE`, Category và Brand có `status = ACTIVE`, có Inventory và `quantity_on_hand - reserved_quantity > 0`. Product detail áp dụng cùng chính sách; không tìm thấy hoặc không đủ điều kiện trả `404`. Giá là VND nguyên đồng. Lỗi query trả `{ "code": "INVALID_QUERY", "message": "..." }`; product không tồn tại trả `{ "code": "PRODUCT_NOT_FOUND", "message": "..." }`.

### 6.2. T14 checkout và đơn hàng (đã triển khai)

`POST /api/orders` chỉ hỗ trợ COD trong T14 và bắt buộc `Idempotency-Key` dài 8–128 ký tự. Checkout khóa Cart, sau đó khóa Inventory theo `product_id` tăng dần; đọc lại trạng thái/giá backend, snapshot giá và địa chỉ, tăng `reserved_quantity`, tạo Order/OrderItem/Payment rồi xóa dòng giỏ trong cùng transaction. Cùng key và cùng request trả lại đơn cũ với header `Idempotent-Replayed: true`; cùng key nhưng đổi nội dung trả `409 IDEMPOTENCY_KEY_REUSED`.

Customer chỉ đọc/hủy đơn của mình; truy cập ID của người khác trả `404`. Customer chỉ hủy `PENDING`. Admin chuyển đúng chuỗi `PENDING → CONFIRMED → SHIPPING → DELIVERED`, hoặc hủy từ `PENDING/CONFIRMED`. Khi sang `SHIPPING`, hệ thống giảm cả on-hand và reserved; khi hủy chỉ giảm reserved. Lần đầu sang `DELIVERED` ghi `deliveredAt` và chuyển COD Payment sang `PAID`; gọi lại cùng trạng thái không ghi thời gian hay trừ kho lần hai. `CANCELLED` luôn có `deliveredAt = null`, nên không đủ điều kiện cho Review/Setup.

Hướng dẫn chạy tay và collection import được lưu tại [T14_ORDER_API.md](../docs/T14_ORDER_API.md) và [T14-order-api.postman_collection.json](../docs/postman/T14-order-api.postman_collection.json).

`GET /api/categories` và `GET /api/brands` chỉ trả các bản ghi ACTIVE, sắp xếp theo tên rồi ID. Response catalog dùng DTO công khai, gồm ảnh, category, brand, giá và tồn khả dụng; không trả JPA Entity.

## 7. Schema, migration và kiểm thử cần có

**T10 (04/10/2026):** V3 thêm 21 bảng Builder/8 Spec, Review/Media/Like và Setup, bao gồm metadata kiểm duyệt Setup đã chốt để phục vụ T30. T10 chỉ thay schema, chưa có entity/API FEATURE. `PersistenceManager` tự chạy V3 trước Hibernate validate; V1/V2 giữ nguyên. Script xuống V2 chỉ dành cho DB thử nghiệm, kiểm thử và hướng dẫn bàn giao nằm tại [T10_MIGRATION.md](T10_MIGRATION.md). Các nhận định “chưa tạo FEATURE” ở phần T03 dưới đây mô tả riêng phạm vi lịch sử T03.

**Đã triển khai T03:** Flyway chạy V1 rồi `V2__create_core_schema.sql` trước khi Hibernate `validate`. V2 nâng Brand lên thiết kế hiện hành và thêm 11 bảng CORE. Có PK identity ALWAYS, FK theo chính sách RESTRICT/CASCADE của data-model, UNIQUE, CHECK, partial unique index cho địa chỉ mặc định/ảnh chính và index FK. Không sửa V1 đã áp dụng. Không tạo bảng FEATURE/ADVANCED hoặc cột promotion thiếu FK.

JPA dùng Integer ID, BigDecimal NUMERIC(19,0), LocalDateTime, enum STRING và quan hệ LAZY. `Order` có tên JPQL `PurchaseOrder`; SQL vẫn là `orders`. Collection dùng `mappedBy`; không cascade REMOVE từ entity sang lịch sử đơn. Entity chỉ dùng trong persistence, API phải có DTO riêng. `PersistenceManager` chạy Flyway rồi tạo một `EntityManagerFactory` dùng chung cho các Servlet; mỗi request tự tạo và đóng `EntityManager`. `PersistenceLifecycleListener` đóng factory khi web app dừng. Test database dùng `PersistenceManager.createEntityManagerFactory(url, user, password)` để tạo factory độc lập trên schema riêng và tự đóng factory đó. Danh sách entity được khai báo trong `META-INF/persistence.xml`. Service cung cấp thời gian theo Asia/Bangkok, chuẩn hóa chuỗi/email và kiểm tra VND nguyên đồng trước khi lưu (PostgreSQL NUMERIC(19,0) tự làm tròn số lẻ).

V2 không tự sửa dữ liệu Brand cũ: nếu tên/description/logo đang rỗng hoặc có khoảng trắng đầu/cuối, migration sẽ thất bại và rollback. Cần kiểm tra, chuẩn hóa dữ liệu có chủ đích trước khi nâng cấp; không dùng Flyway repair để bỏ qua lỗi dữ liệu/checksum.

### Chạy kiểm thử database

Trong thư mục gốc, tạo PostgreSQL riêng (không dùng DB ứng dụng):

```powershell
docker run --name pcstore-t03-test -e POSTGRES_DB=pcstore_test -e POSTGRES_USER=pcstore_test -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55433:5432 -d postgres:17
docker exec pcstore-t03-test pg_isready -U pcstore_test -d pcstore_test
cd backend
$env:TEST_DB_URL='jdbc:postgresql://localhost:55433/pcstore_test'
$env:TEST_DB_USER='pcstore_test'
$env:TEST_DB_PASSWORD='local-test-only'
mvn -B -Pdb-test verify
```

`local-test-only` chỉ là mật khẩu mẫu cho container test. Profile `db-test` bắt buộc đủ ba biến trên, không tự bỏ qua khi thiếu database. Mỗi test tạo schema ngẫu nhiên `t03_*` và chỉ xóa schema của chính nó. Chạy `mvn test` thông thường không chạy integration test PostgreSQL; dùng lệnh `verify` ở trên để nghiệm thu T03. Sau khi kiểm thử có thể dừng container bằng `docker stop pcstore-t03-test`.

Ngày 01/10/2026: `mvn -B -Pdb-test verify` build WAR thành công, **6 test, 0 failure/error/skip** trên PostgreSQL 17. Bao gồm schema mới/chạy lại, nâng V1 có dữ liệu, ràng buộc/partial unique/cascade, Hibernate validate và lưu/đọc toàn bộ quan hệ CORE. Chưa kiểm chứng API checkout, phân quyền, cạnh tranh tồn kho hoặc UI; những phần đó thuộc task nghiệp vụ tiếp theo. Xem [README](../README.md) để chạy ứng dụng bằng Docker Compose.

Trước migration đầu tiên, chốt PK/FK, `NOT NULL`, `UNIQUE`, `CHECK`, cascade/delete và index theo query. Ràng buộc tối thiểu: email unique; một Cart/User; một Inventory/Product; một CartItem/(Cart,Product); số lượng không âm ở Inventory và dương ở CartItem/OrderItem; giá không âm; Spec dùng shared Product PK/FK; bảng nối có PK ghép. Không cascade xóa User/Product sang Order lịch sử.

Kiểm thử có giá trị cao: Customer truy cập đơn/build khác; Customer gọi Admin; thay đổi giá sau khi đặt không đổi OrderItem; checkout giỏ rỗng/hết hàng rollback; hai checkout tranh món cuối; hủy đơn hoàn kho đúng một lần; gửi checkout lặp không tạo hai đơn; compatibility PASS/FAIL/UNKNOWN cho từng rule. Kiểm tra clone repo, dựng DB từ migration/seed và chạy trên máy khác trước báo cáo.

## 8. Phần toàn hệ thống để tham khảo, chưa code trong sprint đầu

Review liên kết `ProductReview` với đúng `OrderItem` đã giao, tối đa một review/OrderItem; media review là mở rộng. Setup Community yêu cầu user có đơn `DELIVERED`, có ảnh setup cơ bản. AI Recommendation có request/result/attempt và liên kết build; backend phải kiểm tra lại giá, kho, tương thích, ngân sách. Promotion dùng một nguồn tính giá thống nhất; Warranty cần snapshot chính sách trong đơn. Không đưa những bảng đó vào CORE chỉ vì chúng được vẽ sẵn.

Sơ đồ draw.io có `RecommendationResult.attempt: RecommendationAttempt` nhưng chưa thấy class `RecommendationAttempt` trong cùng sơ đồ; sửa mô hình khi bắt đầu AI Recommendation. `ProductStatus` đã được nhóm chọn bộ giá trị sạch ở §4.1; cập nhật ô enum bị lặp trong draw.io khi sửa sơ đồ nguồn.

## 9. Quyết định backend hiện hành

- **Theo data-model hiện hành:** COD và chuyển khoản thủ công giữ chỗ khi checkout, trừ on-hand/reserved khi xuất hàng, hủy trước xuất giải phóng reserved đúng một lần. Quyết định này thay mô tả trừ on-hand ngay trong hướng dẫn cũ.
- **Đã chốt:** sprint hỗ trợ cả COD và chuyển khoản thủ công (`BANK_TRANSFER`).
- **Đã chốt:** đồ khách đã sở hữu/`PcBuildItem.ownedQuantity` giữ trong thiết kế mở rộng, chưa làm ở sprint 2 tuần.
- **Đã chốt:** Admin đối chiếu rồi đánh dấu Payment chuyển khoản `PAID`; chỉ khi đó đơn chuyển khoản mới sang `SHIPPING`.
- **Đã chốt:** `ProductStatus` gồm `ACTIVE`, `INACTIVE`, `DRAFT`, `OUT_OF_STOCK`, `DISCONTINUED`, `HIDDEN`; bỏ `ACTIVE` lặp trong draw.io.
- **Đề xuất triển khai sprint:** chưa tự hủy đơn chuyển khoản quá hạn; Admin xem các đơn `PENDING` để xác nhận hoặc hủy thủ công.
- **Đã chốt:** dùng Flyway với migration SQL có phiên bản; Hibernate không tự tạo/cập nhật schema. ERD CORE và phạm vi migration hiện tại được ghi trong `docs/data-model.md`.
- **Cần chốt khi code:** công thức/nguồn dữ liệu chính xác cho rule PSU; cách đồng bộ `ACTIVE/OUT_OF_STOCK` với Inventory; cookie/CORS/CSRF theo địa chỉ chạy thật; mã lỗi/JSON mẫu cho API nghiệp vụ. Các mục này là chi tiết triển khai, không làm thay đổi nguồn ưu tiên ở §1.

Khi một quyết định đổi, sửa **file này, migration/entity và API liên quan trong cùng PR**. `README` dự án chỉ cần liên kết đến file này; tránh sao chép các bảng field/API sang nhiều tài liệu dễ lệch.

**Đồng bộ tài liệu cũ:** `docs/plane.md` trong repo hiện còn ghi bản demo chỉ COD và T01 là buổi chốt lại toàn bộ. Sau quyết định ở trên, T01 nên trở thành việc *đọc/đối chiếu hướng dẫn BE, thống nhất tên endpoint/DTO chưa có trong nguồn rồi bắt đầu code*; các task checkout/UI/Admin/test cần ghi thêm chuyển khoản thủ công. Giữ hướng dẫn BE này làm nguồn hiện hành cho chi tiết backend, còn kế hoạch Plane chỉ theo dõi thời gian và người nhận task.
