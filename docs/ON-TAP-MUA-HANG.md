# Ôn báo cáo: Mua hàng, thanh toán và xử lý đơn

## Điểm tiếp tục — 15/10/2026

- Đã soạn bài nói hoàn chỉnh trong docs/BAI-THUYET-TRINH-MUA-HANG.md: thứ tự mở file, dòng/hàm cần chỉ, lời nói, giải thích, câu chuyển phần và hỏi đáp. Lần sau dùng bài này để luyện từng mục; chưa xác nhận đã học thuộc hay chạy demo.

- Buổi học 1: giải thích CartService.java, tập trung addItem (dòng 38), checkAvailability (160), transaction (198); phân biệt thêm giỏ với giữ hàng. Đã cung cấp bài học, chưa có câu trả lời xác nhận người học hiểu.
- Câu hỏi cuối buổi: tồn thực tế 10, giữ 3, giỏ có 2, thêm 6 có hợp lệ không và vì sao? Đáp án: không; tổng mới 8 vượt tồn khả dụng 7.
- Tiếp theo: kiểm tra câu trả lời, rồi học CartServlet/CartDao hoặc OrderService.checkout theo nhu cầu. Các dòng bên dưới mô tả trạng thái khảo sát ban đầu ngày 14/10.

- Báo cáo ngày 15/10/2026. Phạm vi: giỏ, checkout COD/VNPay, giá/tồn, giữ hàng, chống trùng, đơn khách, Admin, callback/đối soát/hết hạn.
- Đã khảo sát code nhánh develop, lập danh sách dưới đây. Chưa bắt đầu giảng từng hàm hay luyện hỏi đáp; chưa chạy ứng dụng/test trong lượt khảo sát này.
- Lần sau bắt đầu giải thích CartService → OrderService.checkout → OrderDao, dùng ví dụ tồn 10, mua 2. Sau đó COD/Admin, cuối cùng VNPay. Không cần khảo sát lại toàn dự án.
- Chưa đọc trực tiếp sơ đồ đang mở trên diagrams.net. Danh sách class dưới đây dựa trên entity/code và docs/data-model.md; tài liệu nói file draw.io chưa được đồng bộ.
- Không sửa code, không commit/push. Đây là ghi chú học, không phải xác nhận mọi tính năng đã chạy đúng.

## File backend cần đọc

Tiền tố đường dẫn: backend/src/main/java/com/pcstore/

| File sau tiền tố | Đọc gì |
| --- | --- |
| controller/CartServlet.java | GET/POST/PATCH/DELETE giỏ; nhận request, lấy user, gọi service, trả JSON. |
| service/CartService.java | getCart, addItem, updateItem, deleteItem; ownedItem kiểm tra dòng thuộc giỏ; checkAvailability kiểm tra tồn khả dụng; thêm giỏ chưa giữ hàng. |
| dao/CartDao.java | Tìm giỏ theo user, dòng theo sản phẩm; khóa dữ liệu khi cập nhật. |
| controller/OrderServlet.java | POST /api/orders nhận Idempotency-Key; GET đơn của khách; cancel; vnpay-url; payment/sync. |
| dto/CheckoutRequest.java | Thông tin giao hàng, phương thức, cartItemIds; giá không lấy từ client. |
| service/OrderService.java | File trọng tâm: checkout; validateProducts; validateAndReserve; verifySameRequest; findOwnedOrders/findOwnedOrder; cancelOwnedOrder; transition; ship; cancel; toResponse. |
| dao/OrderDao.java | findByCheckoutKey, lockCartByUser, lockInventories, lock; truy vấn JPA và PESSIMISTIC_WRITE, khóa kho theo thứ tự ID. |
| controller/AdminOrderServlet.java | API xem đơn, đổi trạng thái, đối soát. |
| filter/AuthenticationFilter.java | Kiểm tra đăng nhập cho API cần session. |
| filter/AdminAuthorizationFilter.java | Kiểm tra quyền Admin tại backend. |
| service/VNPayPaymentService.java | createPaymentUrl, buildPaymentUrl, hmacSHA512, verifySignature, processIpn; số tiền nhân 100, reference, kiểm tra chữ ký, cập nhật Payment/Attempt. |
| controller/PaymentIpnServlet.java | Nhận callback/IPN và trả RspCode của VNPay. |
| dao/PaymentAttemptDao.java | Tìm/khóa attempt theo reference, lấy attempts của đơn. |
| service/VNPayQueryDrService.java | reconcileOrder, reconcileAttempt, markRetry; chủ động hỏi VNPay kết quả, lưu retry và requiresAdminReview. |
| service/OrderExpirationService.java | expirePendingOrders: quá hạn chuyển EXPIRED_PENDING_RECONCILIATION, vẫn giữ kho. |
| config/PersistenceLifecycleListener.java | Khởi động lịch kiểm tra hết hạn mỗi phút. |
| config/VNPayConfig.java | Đọc cấu hình môi trường Sandbox; không học/chép secret. |
| dto/OrderResponse.java, dto/OrderItemResponse.java, dto/OrderPaymentResponse.java | JSON trả frontend; tách entity khỏi dữ liệu API. |

## Frontend theo luồng demo

| File | Đọc gì |
| --- | --- |
| frontend/components/cart-provider.tsx | Trạng thái giỏ dùng chung, thêm/cập nhật và tải lại giỏ. |
| frontend/lib/cart-api.ts | Gọi API giỏ backend. |
| frontend/components/cart-drawer.tsx | Giỏ mở nhanh. |
| frontend/components/shopping.tsx | Giỏ/checkout, chọn dòng, địa chỉ, COD/VNPay, submit, tạo key, gọi checkout và chuyển trang. |
| frontend/app/checkout/page.tsx | Route bọc ShoppingPage; nghiệp vụ UI ở component. |
| frontend/lib/order-api.ts | checkout gửi Idempotency-Key; list/getById/cancel/createVNPayUrl/syncPayment. |
| frontend/components/orders.tsx | Danh sách/chi tiết đơn, trạng thái, đếm ngược, đồng bộ thanh toán. |
| frontend/app/orders/page.tsx, frontend/app/orders/[id]/page.tsx | Route danh sách và chi tiết. |
| frontend/app/orders/payment-return/page.tsx | Trang quay về từ VNPay; hiện chuyển query về endpoint IPN để backend xác minh. |
| frontend/components/admin/admin-orders.tsx | updateStatus, confirmCancellation, handleReconcile; giao diện Admin xử lý đơn. |
| frontend/lib/admin-order-api.ts | Gọi API Admin cập nhật trạng thái/đối soát. |
| frontend/app/admin/orders/page.tsx | Route Admin đơn hàng. |

## Class diagram cần hiểu

Các file entity đều ở backend/src/main/java/com/pcstore/entity/ và có tên Class.java.

- User: chủ giỏ và người đặt đơn; chỉ cần phần quan hệ, không học toàn bộ auth.
- Cart: giỏ của user. CartItem: product và quantity; không phải giá đã chốt.
- Product: giá bán hiện tại. Inventory: quantityOnHand, reservedQuantity; khả dụng = onHand - reserved.
- Order: người mua, trạng thái, tổng tiền, địa chỉ giao snapshot, key/hash, paymentExpiresAt.
- OrderItem: product, quantity, baseUnitPrice/unitPrice chốt lúc mua.
- Payment: phương thức, số tiền, trạng thái và paidAt của cả đơn.
- PaymentAttempt: từng lần thử VNPay, referenceCode, trạng thái, hạn, thông tin đối soát.

Quan hệ cần chỉ: User 1—0..1 Cart; Cart 1—0..* CartItem; CartItem *—1 Product; Product 1—0..1 Inventory; User 1—0..* Order; Order 1—1..* OrderItem theo nghiệp vụ checkout; OrderItem *—1 Product; Order 1—1 Payment theo nghiệp vụ checkout; Payment 1—0..* PaymentAttempt. PaymentAttempt còn tham chiếu trực tiếp Order trong code. UNIQUE/FK không tự bảo đảm cha luôn có con; service tạo đủ trong transaction.

Enum ở entity/enums/: OrderStatus.java, PaymentMethod.java, PaymentStatus.java, PaymentAttemptStatus.java. Phân biệt trạng thái giao hàng và trạng thái tiền.

Nếu sơ đồ có tầng xử lý, học CartServlet → CartService → CartDao; OrderServlet/AdminOrderServlet → OrderService → OrderDao; PaymentIpnServlet → VNPayPaymentService → PaymentAttemptDao/OrderDao; VNPayQueryDrService và OrderExpirationService.

## Luồng phải nói được

1. Thêm giỏ: kiểm tra sản phẩm/số lượng/tồn khả dụng; chưa giữ kho.
2. Checkout: backend lấy giá DB; khóa giỏ/kho, kiểm tra lại; tăng reserved; tạo Order/OrderItem/Payment, xóa các dòng đã mua, commit cùng transaction. Lỗi thì rollback.
3. Chống trùng: cùng user + key + nội dung thì trả đơn cũ; cùng key khác nội dung thì lỗi; unique index bảo vệ DB. Không phải cứ cùng sản phẩm là bị coi trùng.
4. COD: PENDING → CONFIRMED → SHIPPING → DELIVERED. SHIPPING giảm cả onHand và reserved. DELIVERED đánh dấu Payment PAID.
5. VNPay: checkout đặt hạn 15 phút; sinh URL/attempt; IPN xác minh chữ ký/reference/tiền rồi cập nhật. Chưa PAID không cho SHIPPING.
6. Hủy trước giao: giảm reserved; onHand chưa bị trừ nên không cộng lại. Code không cho hủy đơn đã PAID.
7. Hết hạn: EXPIRED_PENDING_RECONCILIATION vẫn giữ kho; đối soát để quyết định kết quả. Khách đọc lại đơn từ API để thấy trạng thái backend mới.

Ví dụ: onHand=10,reserved=0; mua 2 → 10,2 (khả dụng 8); giao → 8,0 (khả dụng 8); nếu hủy trước giao → 10,0.

## File schema và bài test để minh chứng

- backend/src/main/resources/db/migration/V2__create_core_schema.sql: bảng giỏ/đơn/payment/kho và ràng buộc.
- backend/src/main/resources/db/migration/V4__add_order_checkout_idempotency.sql: unique(user_id, checkout_idempotency_key), request hash.
- backend/src/main/resources/db/migration/V9__vnpay_payment_attempts.sql: attempts và hạn VNPay.
- backend/src/test/java/com/pcstore/CartServiceIT.java
- backend/src/test/java/com/pcstore/service/OrderServiceIT.java
- backend/src/test/java/com/pcstore/service/OrderValidationTest.java
- backend/src/test/java/com/pcstore/service/VNPayPaymentServiceTest.java
- backend/src/test/java/com/pcstore/service/VNPayQueryDrServiceTest.java
- backend/src/main/webapp/api-docs/openapi.yaml: contract; code có thể mới/khác tài liệu.

## Điểm cần nói đúng, không khẳng định quá mức

- VNPay là Sandbox.
- docs/T20B_VNPAY.md là thiết kế; chưa hoàn toàn trùng code. OrderService.cancel hiện kiểm tra PAID nhưng chưa kiểm tra attempt chưa rõ/QueryDR trước hủy như tài liệu yêu cầu.
- QueryDR hiện coi response 91 sau hết hạn là FAILED, khác yêu cầu thận trọng trong tài liệu. Có ghi nextRetryAt nhưng chưa thấy scheduler tự động QueryDR; scheduler tìm thấy chỉ chạy expiration. Có gọi đối soát qua Admin và API sync của khách.
- shopping.tsx sinh UUID mới mỗi submit; đảm bảo replay backend áp dụng khi gửi lại cùng key, không nên nói UI bảo đảm mọi lần bấm lại đều dùng key cũ.
- Không nói trạng thái khách cập nhật realtime/WebSocket; trình bày việc tải lại/đọc API.

## Thứ tự học tiếp

CartService → OrderService.checkout + OrderDao → transition/ship/cancel → entity và quan hệ → shopping/orders/Admin UI → VNPay/IPN/QueryDR/expiration → luyện câu hỏi giảng viên.

Câu nhắn tiếp: “Đọc docs/ON-TAP-MUA-HANG.md, tiếp tục dạy tôi phần báo cáo mua hàng. Bắt đầu CartService và OrderService.checkout, giải thích theo luồng và hỏi đáp.”
