# PC STORE — hướng dẫn triển khai backend

> Đọc trước khi sửa `backend/`. Tài liệu này gom quy tắc nghiệp vụ, mô hình dữ liệu và hợp đồng API cho bản CORE + PC Builder/Compatibility. Đây là **thiết kế triển khai**, không phải mô tả những gì đã code xong.

## 1. Nguồn và phạm vi

- [Plane — 4. Thiết kế hệ thống, ClassDiagram, ERD](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/a1cc795d-126f-4258-8cab-5814e173364b/) là nguồn ưu tiên cho **nghiệp vụ và mô hình**. Ưu tiên phần chốt mới nhất trong chính page này khi đoạn cũ mâu thuẫn.
- [Plane — BE](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/3029ba6f-9259-4e5c-96f8-1626271c3b60/) là nguồn ưu tiên cho **cách triển khai Java backend**. Các đoạn DB trùng hoặc cũ trong page BE không thay thế Page 4.
- [Sơ đồ lớp draw.io](https://drive.google.com/file/d/1DLNWCcSMbpzboYWm2-Qguv7lnr3yn1jK/view) cung cấp tên class, field và quan hệ trực quan. Các field bên dưới được đối chiếu trực tiếp từ file `.drawio` sửa ngày 30/09/2026. Sơ đồ này là thiết kế toàn hệ thống; không phải lệnh tạo tất cả bảng trong sprint đầu.
- Page **SystemDesign** là tài liệu tham khảo kiến trúc trước Page 4/BE; nếu khác về nghiệp vụ thì theo Page 4, nếu khác về triển khai backend thì theo BE.
- Quyết định nhóm: **CORE + PC Builder/Compatibility** là mục tiêu 2 tuần; Review, Setup Community rồi ADVANCED làm sau khi phần trước chạy chắc.

**Mức kiểm chứng:** file draw.io và các tài liệu đã có trong repo được đọc lại trực tiếp khi soạn bản này. Công cụ đọc Plane không mở lại được các page trong lượt làm việc hiện tại, nên phần Page 4/BE/SystemDesign dựa trên nội dung đã đọc ở lượt trước và bản tóm lược `docs/architecture.md`, `docs/scope.md`. Vì vậy tên endpoint, schema vật lý và chi tiết chưa thể kiểm tra trực tiếp được đánh dấu là đề xuất/chưa chốt, không gán nhầm là nội dung nguyên văn từ Plane.

**Trạng thái repo khi viết:** `backend/pom.xml` mới có Java 21; `com.example.Main` là scaffold; các package `com.pcstore.controller/service/dao/entity/dto/filter/config/util/exception` đang trống. Chưa có Servlet, JPA mapping, migration hay API hoạt động. Mọi tên endpoint và ràng buộc triển khai ở dưới là **hợp đồng đề xuất** để lập trình, cần cập nhật cùng code nếu nhóm chọn tên khác.

## 2. Kiến trúc và quy ước code

```text
Next.js (HTTP JSON + session cookie)
    → Tomcat 10.1 / Jakarta Servlet controller
    → Service (nghiệp vụ, phân quyền cấp đối tượng, transaction)
    → DAO (JPA EntityManager)
    → Hibernate → PostgreSQL
```

Java 21, Maven WAR, `jakarta.servlet.*`, `jakarta.persistence.*`. Frontend không truy cập PostgreSQL. Servlet nhận request, validate hình dạng dữ liệu, gọi Service và chuyển DTO thành JSON. Service kiểm tra quy tắc và điều phối transaction. DAO chỉ truy vấn/lưu bằng JPA; các DAO trong cùng thao tác checkout dùng **cùng EntityManager/transaction**. Không đưa nghiệp vụ vào JSP/Next.js hoặc cho Servlet thao tác SQL/JPA trực tiếp.

| Package | Trách nhiệm |
| --- | --- |
| `controller` | Servlet route, parse request, HTTP status, JSON response. |
| `dto` | Request/response riêng; không trả JPA Entity trực tiếp. |
| `service` | Giá, kho, quyền sở hữu, trạng thái đơn, compatibility, transaction. |
| `dao` | Truy vấn và persistence qua `EntityManager`. |
| `entity` | JPA Entity, enum và quan hệ ánh xạ database. |
| `filter` | Session/role cho route; Service vẫn kiểm tra chủ sở hữu từng đơn/build. |
| `config` | JPA, datasource, JSON, CORS/cookie theo môi trường thực tế. |
| `exception` | Lỗi nghiệp vụ và ánh xạ sang HTTP response. |

Tiền dùng `BigDecimal` ở Java và `NUMERIC/DECIMAL` ở PostgreSQL; không dùng `double` để tính tiền. Password chỉ lưu hash. Mọi thay đổi schema đi qua migration/script được commit; không dựa vào DB trên máy một thành viên. DB, entity, DAO, tài liệu quan hệ và dữ liệu mẫu phải cùng phiên bản.

## 3. Phạm vi dữ liệu theo đợt

| Đợt | Nhóm dữ liệu |
| --- | --- |
| CORE | User, Category, Brand, Product, ProductImage nếu UI cần, Inventory, Cart, CartItem, Order, OrderItem, Payment tối thiểu nếu ghi thanh toán. |
| Builder/Compatibility | PcBuild, PcBuildItem, các bảng Spec và danh mục Socket/FormFactor thật sự dùng cho rule. |
| Sau sprint | ProductReview, SetupPost/SetupImage, AI Recommendation, Promotion, Warranty, Media nâng cao. Không tạo trước chỉ vì class có trong sơ đồ. |

`Address` và `AdministrativeArea` không cần cho CORE hiện tại. `Order` tự lưu **shippingName, shippingPhone, shippingAddressText** tại lúc đặt. `CartItem` không chốt giá; `OrderItem` chốt `unitPrice` lúc đặt. `Inventory` là nguồn tồn kho, không thêm một số tồn độc lập vào `Product`.

## 4. Class/field và JPA mapping

### 4.1 Tài khoản và catalog

| Class | Field từ sơ đồ | Quan hệ / ràng buộc triển khai |
| --- | --- | --- |
| `User` | `userId:int`, `fullName:String`, `email:String`, `passwordHash:String`, `address:String`, `phone:String`, `role:UserRole`, `status:UserStatus` | `email` unique; role `CUSTOMER/ADMIN`; status `ACTIVE/INACTIVE`. Địa chỉ/điện thoại hồ sơ không thay snapshot trong đơn. |
| `Category` | `categoryId:int`, `name`, `description`, `componentType:ComponentType?`, `status:ActiveStatus` | 1 category → nhiều product. `componentType` chỉ có giá trị cho nhóm linh kiện dùng Builder. |
| `Brand` | `brandId:int`, `name`, `description`, `logoUrl`, `status:ActiveStatus` | 1 brand → nhiều product. |
| `Product` | `productId:int`, `name`, `description`, `price:BigDecimal`, `status:ProductStatus`, `category:Category`, `brand:Brand` | `@ManyToOne` tới Category/Brand; `price >= 0`; sản phẩm trong đơn cũ không xóa cứng. |
| `ProductImage` | `imageId:int`, `product:Product`, `imageUrl`, `isPrimary:boolean`, `sortOrder:int` | `@ManyToOne Product`; mỗi product có tối đa một ảnh primary (ràng buộc DB hoặc service). |
| `Inventory` | `inventoryId`, `quantityOnHand:int`, `reservedQuantity:int` trong sơ đồ; phương thức `getAvailableQuantity`, `reserve`, `release` | Gắn 1–1 với Product. **Quyết định mới của nhóm:** đặt đơn thành công thì trừ tồn ngay; hủy hợp lệ thì hoàn lại. `reservedQuantity` chưa cần tham gia luồng CORE này, xem §5. |

**ProductStatus đã chốt:** `ACTIVE`, `INACTIVE`, `DRAFT`, `OUT_OF_STOCK`, `DISCONTINUED`, `HIDDEN`. Xóa `ACTIVE` bị lặp trong sơ đồ; lưu enum bằng chuỗi. `Inventory.quantityOnHand` vẫn là nguồn số lượng thực. Service phải kiểm tra **cả trạng thái được phép bán và tồn > 0**; không suy số dư tồn từ enum. Quy tắc tự chuyển `ACTIVE ↔ OUT_OF_STOCK` cần thống nhất với thao tác chỉnh tồn của Admin trước khi code, để không vô tình mở bán một Product đang `DRAFT/HIDDEN`.

### 4.2 Giỏ, đơn và thanh toán

| Class | Field từ sơ đồ | Quan hệ / ràng buộc triển khai |
| --- | --- | --- |
| `Cart` | `cartId:int`, `items:List`, `createdAt`, `updatedAt` | Sơ đồ nối User 1 ↔ Cart 0..1; triển khai `@OneToOne User`, unique `user_id`. Cart có nhiều CartItem. |
| `CartItem` | `cartItemId:int`, `product:Product`, `quantity:int` | `@ManyToOne Cart/Product`; unique `(cart_id,product_id)`; `quantity > 0`. `getUnitPrice()` lấy giá Product hiện hành. |
| `Order` | `orderId:int`, `user:User`, `orderDate`, `status:OrderStatus`, `totalAmount:BigDecimal`, `shippingName`, `shippingPhone`, `shippingAddressText`, `deliveredAt?`, `items:List` | `@ManyToOne User`, `@OneToMany OrderItem`; `totalAmount` tính từ các dòng snapshot. |
| `OrderItem` | `orderItemId:int`, `order:Order`, `product:Product`, `quantity:int`, `baseUnitPrice:BigDecimal`, `unitPrice:BigDecimal`, `appliedPromotionRule?` | `@ManyToOne Order/Product`; `quantity > 0`; `unitPrice` là giá chốt. Hai field liên quan Promotion chỉ dùng khi triển khai Promotion; chưa cần logic giảm giá trong CORE. |
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
3. Filter chặn route cần đăng nhập/ADMIN. Service tiếp tục kiểm tra `order.user.id`, `cart.user.id`, `build.user.id` trước mọi thao tác theo ID. Không tin `userId`, `role`, `price` do client gửi.
4. Chốt cấu hình cookie, CORS và CSRF theo origin thực tế trước khi nối frontend; không ghi `Access-Control-Allow-Origin: *` cùng cookie.

### Catalog → giỏ → checkout → đơn

1. Catalog chỉ trả sản phẩm được phép bán/hiển thị, giá hiện hành và lượng có thể mua. Search/filter và phân trang chạy ở DAO, không lấy toàn bộ DB rồi lọc ở Java.
2. Giỏ lưu Product + số lượng; thêm cùng sản phẩm thì gộp dòng. Tổng giỏ được tính lại bằng giá hiện hành trên server.
3. Checkout đọc giỏ của user, kiểm tra giỏ không rỗng, sản phẩm hợp lệ, số lượng dương, thông tin nhận hàng và tồn kho. Backend đọc lại giá, tuyệt đối không nhận `totalAmount` do client tính.
4. Trong **một transaction**: khóa/cập nhật tồn an toàn; tạo Order, OrderItem snapshot giá và địa chỉ; ghi Payment `COD` hoặc `BANK_TRANSFER` theo lựa chọn; trừ tồn; làm rỗng giỏ; commit. Nếu một bước lỗi thì rollback toàn bộ. Hai người mua món cuối không được cùng thành công.
5. Với quyết định của nhóm, `quantityOnHand` giảm ngay khi đặt đơn thành công cho **cả COD lẫn chuyển khoản thủ công**, dù chuyển khoản còn `PENDING`. Hủy từ trạng thái được phép thì tăng lại đúng số lượng **một lần** trong cùng transaction cập nhật trạng thái. Đơn chuyển khoản chưa trả do Admin hủy cũng hoàn kho. Không hoàn kho lần nữa nếu đơn đã `CANCELLED`; không cho sửa số lượng đơn sau khi đặt.
6. Request checkout gửi lặp cần cơ chế chống tạo hai đơn (ví dụ idempotency key theo user + request); đây là chi tiết triển khai cần chốt khi code endpoint, không chỉ khóa nút trên UI.

Giữ bất biến `quantityOnHand >= 0`. Vì sprint dùng trừ tồn ngay, `reservedQuantity` trong sơ đồ chưa phục vụ luồng này; không dùng lẫn công thức `available = onHand - reserved` với quy tắc trừ tồn ngay. Nếu vẫn giữ cột cho tương lai, mặc định bằng 0 và không tăng trong checkout CORE.

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

**Đây là danh sách endpoint đề xuất để frontend/backend code thống nhất, không phải endpoint đã tồn tại trong Plane hay repo.** Khi tạo Servlet đầu tiên, cập nhật path, JSON mẫu và mã lỗi trong file này hoặc `docs/api.md`, rồi cả hai phía dùng một hợp đồng. Response dùng DTO; lỗi có dạng thống nhất như `{ "code": "OUT_OF_STOCK", "message": "..." }`.

| Method/path | Quyền | Request chính | Response chính |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Guest | `fullName,email,password` | user public DTO |
| `POST /api/auth/login` | Guest | `email,password` | user public DTO + session cookie |
| `POST /api/auth/logout` | Login | — | 204 |
| `GET /api/auth/me` | Login | — | user public DTO |
| `GET /api/products` | Public | `q,categoryId,brandId,minPrice,maxPrice,page,size` | products + pagination |
| `GET /api/products/{id}` | Public | — | product detail + specs/image/availability nếu có |
| `GET /api/categories`, `GET /api/brands` | Public | — | danh mục/hãng đang hiển thị |
| `GET /api/cart` | Customer | — | items, giá hiện hành, tổng |
| `POST /api/cart/items` | Customer | `productId,quantity` | cart DTO |
| `PATCH /api/cart/items/{id}` | Customer | `quantity` | cart DTO |
| `DELETE /api/cart/items/{id}` | Customer | — | 204 |
| `POST /api/orders` | Customer | `shippingName,shippingPhone,shippingAddressText,paymentMethod: COD/BANK_TRANSFER`; giỏ ở server | order ID, snapshot items/total/status và Payment status |
| `GET /api/orders`, `GET /api/orders/{id}` | Customer | — | chỉ đơn của chính user |
| `POST /api/orders/{id}/cancel` | Chủ đơn/Admin theo rule | — | order status, tồn đã hoàn nếu áp dụng |
| `POST /api/admin/products`, `PATCH /api/admin/products/{id}` | Admin | trường catalog/kho phù hợp | product DTO |
| `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status` | Admin | status mới | order DTO |
| `POST /api/admin/orders/{id}/confirm-payment` | Admin | mã tham chiếu tùy chọn sau khi đối chiếu | Payment `PAID`, `paidAt`; từ chối xác nhận lặp |
| `GET /api/builds`, `POST /api/builds` | Customer | name/items | build DTO |
| `GET /api/builds/{id}`, `PUT /api/builds/{id}`, `DELETE /api/builds/{id}` | Chủ build | items/name | build DTO hoặc 204 |
| `POST /api/builds/validate` | Customer | items tạm | kết quả từng rule |
| `POST /api/builds/{id}/add-to-cart` | Chủ build | — | cart DTO |

Mã lỗi tối thiểu: `400` input sai; `401` chưa đăng nhập; `403` thiếu quyền; `404` không thấy hoặc không sở hữu tài nguyên theo chính sách bảo mật; `409` xung đột như hết hàng, trạng thái đơn sai, checkout trùng; `500` lỗi server. Không trả stack trace, password hash hoặc Entity JPA ra JSON.

## 7. Schema, migration và kiểm thử cần có

Trước migration đầu tiên, chốt PK/FK, `NOT NULL`, `UNIQUE`, `CHECK`, cascade/delete và index theo query. Ràng buộc tối thiểu: email unique; một Cart/User; một Inventory/Product; một CartItem/(Cart,Product); số lượng không âm ở Inventory và dương ở CartItem/OrderItem; giá không âm; Spec dùng shared Product PK/FK; bảng nối có PK ghép. Không cascade xóa User/Product sang Order lịch sử.

Kiểm thử có giá trị cao: Customer truy cập đơn/build khác; Customer gọi Admin; thay đổi giá sau khi đặt không đổi OrderItem; checkout giỏ rỗng/hết hàng rollback; hai checkout tranh món cuối; hủy đơn hoàn kho đúng một lần; gửi checkout lặp không tạo hai đơn; compatibility PASS/FAIL/UNKNOWN cho từng rule. Kiểm tra clone repo, dựng DB từ migration/seed và chạy trên máy khác trước báo cáo.

## 8. Phần toàn hệ thống để tham khảo, chưa code trong sprint đầu

Review liên kết `ProductReview` với đúng `OrderItem` đã giao, tối đa một review/OrderItem; media review là mở rộng. Setup Community yêu cầu user có đơn `DELIVERED`, có ảnh setup cơ bản. AI Recommendation có request/result/attempt và liên kết build; backend phải kiểm tra lại giá, kho, tương thích, ngân sách. Promotion dùng một nguồn tính giá thống nhất; Warranty cần snapshot chính sách trong đơn. Không đưa những bảng đó vào CORE chỉ vì chúng được vẽ sẵn.

Sơ đồ draw.io có `RecommendationResult.attempt: RecommendationAttempt` nhưng chưa thấy class `RecommendationAttempt` trong cùng sơ đồ; sửa mô hình khi bắt đầu AI Recommendation. `ProductStatus` đã được nhóm chọn bộ giá trị sạch ở §4.1; cập nhật ô enum bị lặp trong draw.io khi sửa sơ đồ nguồn.

## 9. Quyết định backend hiện hành

- **Đã chốt:** COD và chuyển khoản thủ công đều trừ `quantityOnHand` ngay khi đặt; hủy hợp lệ hoàn lại đúng một lần, gồm đơn chuyển khoản chưa trả do Admin hủy.
- **Đã chốt:** sprint hỗ trợ cả COD và chuyển khoản thủ công (`BANK_TRANSFER`).
- **Đã chốt:** đồ khách đã sở hữu/`PcBuildItem.ownedQuantity` giữ trong thiết kế mở rộng, chưa làm ở sprint 2 tuần.
- **Đã chốt:** Admin đối chiếu rồi đánh dấu Payment chuyển khoản `PAID`; chỉ khi đó đơn chuyển khoản mới sang `SHIPPING`.
- **Đã chốt:** `ProductStatus` gồm `ACTIVE`, `INACTIVE`, `DRAFT`, `OUT_OF_STOCK`, `DISCONTINUED`, `HIDDEN`; bỏ `ACTIVE` lặp trong draw.io.
- **Đề xuất triển khai sprint:** chưa tự hủy đơn chuyển khoản quá hạn; Admin xem các đơn `PENDING` để xác nhận hoặc hủy thủ công.
- **Cần chốt khi code:** công thức/nguồn dữ liệu chính xác cho rule PSU; cách đồng bộ `ACTIVE/OUT_OF_STOCK` với Inventory; cookie/CORS/CSRF theo địa chỉ chạy thật; định dạng migration và mã lỗi/JSON mẫu. Các mục này là chi tiết triển khai, không làm thay đổi nguồn ưu tiên ở §1.

Khi một quyết định đổi, sửa **file này, migration/entity và API liên quan trong cùng PR**. `README` dự án chỉ cần liên kết đến file này; tránh sao chép các bảng field/API sang nhiều tài liệu dễ lệch.

**Đồng bộ tài liệu cũ:** `docs/plane.md` trong repo hiện còn ghi bản demo chỉ COD và T01 là buổi chốt lại toàn bộ. Sau quyết định ở trên, T01 nên trở thành việc *đọc/đối chiếu hướng dẫn BE, thống nhất tên endpoint/DTO chưa có trong nguồn rồi bắt đầu code*; các task checkout/UI/Admin/test cần ghi thêm chuyển khoản thủ công. `docs/architecture.md` hiện còn liệt kê phương thức thanh toán là quyết định mở; bỏ dòng đó khi cập nhật repo. Giữ hướng dẫn BE này làm nguồn hiện hành cho chi tiết backend, còn kế hoạch Plane chỉ theo dõi thời gian và người nhận task.
