# Kịch bản báo cáo: Mua hàng, thanh toán và xử lý đơn

Bản đối chiếu code ngày 15/10/2026. Thời lượng gợi ý: 12–15 phút, chưa tính thao tác chờ demo. Chỉ đọc phần **Lời nói** khi thuyết trình; phần **Hiểu đoạn này** dùng để học và trả lời câu hỏi. Số dòng đúng tại lúc soạn; nếu code đổi, tìm theo tên hàm.

## Chuẩn bị trước khi nói

Mở sẵn các file theo đường dẫn bên dưới. Khi trình bày, chỉ vào đoạn được ghi, không đọc hết import/getter/setter. Demo COD trước cho liền luồng; phần VNPay giải thích riêng bằng code, chỉ demo cổng nếu môi trường Sandbox đã được cấu hình và thử trước.

Trật tự: CartService → shopping.tsx/OrderServlet → OrderService.checkout → OrderDao → chống trùng → VNPay → đơn khách → Admin → hết hạn/đối soát → class diagram.

## 1. Mở đầu — 30 giây

**Lời nói**

“Em phụ trách phần mua hàng, thanh toán và xử lý đơn. Luồng chính là khách thêm sản phẩm vào giỏ, checkout bằng COD hoặc VNPay, xem đơn; sau đó Admin xử lý và khách xem trạng thái mới.

Frontend dùng Next.js để hiển thị và gửi yêu cầu HTTP. Backend Java nhận yêu cầu qua Servlet, xử lý nghiệp vụ ở Service và truy cập dữ liệu qua DAO sử dụng JPA. Các kiểm tra quan trọng như giá, tồn kho, quyền và trạng thái được thực hiện ở backend.”

**Hiểu đoạn này**

Servlet nhận yêu cầu; Service quyết định có được thực hiện không; DAO đọc/ghi dữ liệu. Không nói frontend quyết định giá cuối hay trạng thái thanh toán.

**Chuyển phần:** “Đầu tiên em trình bày thao tác thêm vào giỏ.”

## 2. Giỏ hàng — khoảng 1 phút

**Mở:** [CartService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/CartService.java:38).

**Chỉ code theo thứ tự:** dòng 38–71, hàm addItem → dòng 160–165, checkAvailability.

**Lời nói**

“Hàm addItem nhận mã người dùng, mã sản phẩm và số lượng muốn thêm. Đầu tiên hệ thống kiểm tra đầu vào, kiểm tra khách hàng và lấy giỏ của khách.

Nếu sản phẩm đã có trong giỏ, hệ thống cộng số lượng thêm vào số lượng cũ. Ví dụ giỏ có hai sản phẩm, thêm ba thì kiểm tra số lượng mới là năm.

Hàm checkAvailability kiểm tra sản phẩm được phép bán và số lượng không vượt tồn khả dụng. Tồn khả dụng bằng tồn thực tế trừ số lượng đã giữ cho các đơn.

Nếu hợp lệ, hệ thống tạo dòng giỏ mới hoặc cập nhật dòng hiện có, rồi trả dữ liệu giỏ cho giao diện. Bước thêm giỏ chưa giữ hàng.”

**Hiểu đoạn này**

- Dòng 43–44 yêu cầu khóa user và giỏ. Khóa user còn giúp xử lý lúc khách chưa có giỏ.
- Dòng 48 là cộng dồn; không phải ghi đè bằng lượng vừa thêm.
- Kiểm tra kho ở đây không có nghĩa chắc chắn mua được: người khác có thể checkout trước.
- updateItem ở dòng 108 thay số lượng bằng giá trị mới; quantity bằng 0 thì xóa dòng.
- ownedItem ở dòng 148 tìm dòng theo cả giỏ và mã dòng, tránh sửa giỏ người khác.
- transaction ở dòng 198: thành công commit, lỗi rollback. flush không đồng nghĩa commit.

**Nếu cần chỉ đường HTTP:** [CartServlet.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/controller/CartServlet.java:22), xem ánh xạ /api/customer/cart/* và phần gọi CartService. API sửa giỏ dùng PATCH.

**Chuyển phần:** “Sau khi chọn sản phẩm, khách chuyển sang checkout. Đây là lúc backend kiểm tra lại và giữ hàng.”

## 3. Từ nút đặt hàng đến backend — 45 giây

**Mở:** [shopping.tsx](D:/WEB/PROJECT/PC_STORE/frontend/components/shopping.tsx:217), dòng 217–226.

**Lời nói**

“Ở giao diện, khách nhập thông tin nhận hàng, chọn COD hoặc VNPay và các dòng giỏ cần mua. Frontend tạo một Idempotency-Key rồi gửi yêu cầu checkout.”

**Tiếp theo mở:** [OrderServlet.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/controller/OrderServlet.java:72), dòng 72–82.

“OrderServlet lấy người dùng từ session, đọc header Idempotency-Key và dữ liệu CheckoutRequest, sau đó gọi OrderService.checkout. Đơn mới trả HTTP 201; nếu đây là yêu cầu được gửi lại với cùng key và nội dung phù hợp thì trả đơn cũ với HTTP 200.”

**Hiểu đoạn này**

- [CheckoutRequest.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/dto/CheckoutRequest.java) chứa dữ liệu khách nhập, không chứa giá để backend tin theo.
- [order-api.ts](D:/WEB/PROJECT/PC_STORE/frontend/lib/order-api.ts:99) là chỗ frontend gửi header.
- Key nhận diện yêu cầu checkout. Đây không phải mã sản phẩm.
- UI hiện sinh UUID mỗi lần submit; không nói mọi lần người dùng bấm lại đều tái sử dụng key cũ.

**Chuyển phần:** “Tiếp theo là phần xử lý chính trong OrderService.”

## 4. Checkout: kiểm tra giá, tồn và giữ hàng — khoảng 2 phút

**Mở:** [OrderService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/OrderService.java:66).

**Chỉ:** checkout dòng 66–171; tập trung dòng 99–159. Sau đó đến validateAndReserve dòng 379–391.

**Lời nói**

“Hàm checkout thực hiện trong một transaction. Hệ thống lấy những dòng giỏ được chọn, kiểm tra sản phẩm còn được bán rồi khóa các bản ghi tồn kho liên quan.

Giá được lấy từ Product trong database. Tổng đơn được backend tính từ giá nhân số lượng, không lấy tổng tiền do frontend cung cấp.

Trong validateAndReserve, hệ thống tính tồn khả dụng bằng quantityOnHand trừ reservedQuantity. Nếu thiếu hàng thì báo lỗi; nếu đủ thì tăng reservedQuantity để giữ hàng cho đơn.

Ví dụ kho có mười sản phẩm, chưa giữ sản phẩm nào. Khách checkout hai sản phẩm thì tồn thực tế vẫn là mười, đang giữ là hai, còn có thể bán tám.

Sau đó hệ thống tạo Order, các OrderItem và Payment. OrderItem lưu giá tại thời điểm mua; Payment ban đầu có trạng thái PENDING. Nếu chọn VNPay, đơn có hạn thanh toán mười lăm phút.

Cuối cùng hệ thống xóa các dòng giỏ đã mua và commit. Nếu phát sinh lỗi trước khi hoàn tất transaction thì rollback, tránh việc chỉ giữ kho nhưng chưa tạo được đơn.”

**Hiểu đoạn này**

- Order là đầu đơn; OrderItem là từng sản phẩm trong đơn.
- Giá chốt ở OrderItem giúp giá của đơn đã mua không thay theo giá bán mới.
- Chỉ các dòng giỏ đã chọn bị xóa, không nhất thiết xóa toàn bộ giỏ.
- reservedQuantity là số lượng dành cho đơn chưa xuất kho, không phải số đã giao.
- Transaction giúp các thay đổi database trong checkout cùng thành công hoặc cùng bị hoàn tác.

**Mở thêm:** [OrderDao.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/dao/OrderDao.java:51), dòng 51–62.

**Lời nói**

“Ở DAO, lockInventories dùng PESSIMISTIC_WRITE để khóa các dòng kho trong transaction. Khi hai yêu cầu cùng mua một sản phẩm, chúng không được cùng cập nhật bản ghi kho đó mà bỏ qua thay đổi của nhau. Các sản phẩm được khóa theo thứ tự mã để giảm nguy cơ khóa chéo.”

**Chuyển phần:** “Ngoài tranh chấp tồn kho, checkout còn cần xử lý yêu cầu gửi lặp.”

## 5. Chống tạo đơn trùng — khoảng 1 phút

**Mở:** [OrderService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/OrderService.java:74), dòng 74–97; sau đó verifySameRequest dòng 494–498.

**Lời nói**

“Hệ thống tìm đơn theo người dùng và Idempotency-Key trước khi tạo đơn. Nếu đã có đơn, hệ thống so sánh hash của nội dung yêu cầu. Cùng key và nội dung phù hợp thì trả đơn cũ; cùng key nhưng đổi nội dung thì báo lỗi.

Sau khi khóa giỏ, hệ thống kiểm tra lại key một lần nữa vì trong lúc yêu cầu này chờ khóa, một yêu cầu khác có thể đã tạo đơn xong.”

**Mở:** [V4__add_order_checkout_idempotency.sql](D:/WEB/PROJECT/PC_STORE/backend/src/main/resources/db/migration/V4__add_order_checkout_idempotency.sql).

“Ở database còn có unique index trên user_id và checkout_idempotency_key, bảo vệ việc một khách dùng cùng key để tạo nhiều đơn.”

**Hiểu đoạn này**

- Chống trùng là chống xử lý lặp cùng một yêu cầu, không cấm khách mua cùng sản phẩm trong hai đơn khác nhau.
- Hash hiện được tính từ thông tin giao hàng, phương thức và danh sách mã dòng được chọn nếu có; không nói hash chứa toàn bộ giá/số lượng giỏ.
- Khóa kho giải quyết nhiều yêu cầu tranh tồn; idempotency giải quyết gửi lặp. Hai việc khác nhau.

**Chuyển phần:** “Sau khi tạo đơn, COD chờ xử lý giao hàng; còn VNPay cần bước thanh toán qua cổng.”

## 6. Thanh toán VNPay và callback — khoảng 2 phút

**Mở:** [VNPayPaymentService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/VNPayPaymentService.java:55).

**Chỉ:** createPaymentUrl dòng 55–139 → buildPaymentUrl dòng 142 → processIpn dòng 222–310.

**Lời nói**

“Với VNPay Sandbox, createPaymentUrl kiểm tra đơn thuộc khách hiện tại, dùng phương thức VNPay, chưa thanh toán và còn trong hạn.

Mỗi lần thử thanh toán được lưu bằng PaymentAttempt, có mã tham chiếu riêng. Nếu lần gần nhất đang INITIATED hoặc PENDING và còn hiệu lực, code tái sử dụng thông tin lần đó để tạo URL. Hạn của attempt lấy từ hạn đơn, nên thử lại không tự kéo dài mười lăm phút.

Hàm buildPaymentUrl tạo các tham số, chuyển số tiền sang định dạng nhân một trăm của VNPay và ký HMAC-SHA512.

Khi nhận thông báo kết quả, processIpn kiểm tra chữ ký, tìm attempt theo mã tham chiếu, kiểm tra đơn và số tiền. Nếu kết quả hợp lệ và thành công thì cập nhật attempt thành SUCCESS, Payment thành PAID. Nếu Payment đã PAID thì trả phản hồi đã xác nhận, tránh xử lý lại như thanh toán mới.”

**Nếu cần chỉ điểm vào:** [PaymentIpnServlet.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/controller/PaymentIpnServlet.java:35), doGet chuyển dữ liệu tới processIpn.

**Hiểu đoạn này**

- Payment là thanh toán tổng của đơn; PaymentAttempt là từng lần thử.
- Chữ ký dùng để kiểm tra dữ liệu phản hồi có bị thay đổi và có đúng nguồn ký dự kiến không.
- Trang “thanh toán thành công” trên trình duyệt không tự có quyền ghi PAID.
- [payment-return/page.tsx](D:/WEB/PROJECT/PC_STORE/frontend/app/orders/payment-return/page.tsx:30) hiện chuyển query về endpoint IPN; backend vẫn kiểm chữ ký.
- Thanh toán thành công không đồng nghĩa giao hàng thành công: Payment có thể PAID khi Order chưa SHIPPING.
- Không khẳng định cơ chế tạo attempt đã an toàn tuyệt đối với mọi request đồng thời; bài nói mô tả nhánh xử lý hiện có.

**Chuyển phần:** “Sau checkout hoặc thanh toán, khách xem đơn từ dữ liệu backend.”

## 7. Đơn của khách và kiểm tra quyền sở hữu — 45 giây

**Mở:** [OrderService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/OrderService.java:175), dòng 175–191.

**Lời nói**

“findOwnedOrders lấy danh sách đơn theo người dùng. findOwnedOrder kiểm tra mã người sở hữu trước khi trả chi tiết. Vì vậy khách không thể chỉ đổi mã đơn trên đường dẫn để đọc đơn của người khác.

Dữ liệu trả về là OrderResponse, gồm trạng thái, tổng tiền, các dòng hàng và thanh toán, thay vì trả trực tiếp entity.”

**Mở giao diện:** [orders.tsx](D:/WEB/PROJECT/PC_STORE/frontend/components/orders.tsx:459), hàm loadOrder; danh sách nằm trong OrdersPage dòng 181.

“Giao diện gọi API để hiển thị dữ liệu đơn. Sau khi Admin thay đổi trạng thái, khách tải lại trang hoặc lấy lại dữ liệu sẽ thấy trạng thái mới.”

**Hiểu đoạn này**

Không nói đây là cập nhật realtime bằng WebSocket. Bộ đếm ngược trên UI cũng không thay thế việc backend kiểm tra hạn.

**Chuyển phần:** “Em chuyển sang phần Admin xử lý đơn và tác động tới tồn kho.”

## 8. Admin chuyển trạng thái, COD và hủy đơn — khoảng 2 phút

**Mở UI:** [admin-orders.tsx](D:/WEB/PROJECT/PC_STORE/frontend/components/admin/admin-orders.tsx:155), hàm updateStatus.

**Tiếp theo:** [AdminOrderServlet.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/controller/AdminOrderServlet.java:78), doPut.

**Lời nói**

“Admin chọn trạng thái trên giao diện, frontend gửi yêu cầu tới AdminOrderServlet. Servlet gọi OrderService.updateStatusForAdmin. Quyền Admin được kiểm tra tại backend qua AdminAuthorizationFilter.”

**File phân quyền nếu bị hỏi:** [AdminAuthorizationFilter.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/filter/AdminAuthorizationFilter.java:12).

**Mở chính:** [OrderService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/OrderService.java:260), transition dòng 260–305 → ship dòng 308–320 → cancel dòng 322–338.

“Luồng thông thường là PENDING, CONFIRMED, SHIPPING rồi DELIVERED. Backend kiểm tra trạng thái hiện tại trước khi cho chuyển, ví dụ phải CONFIRMED mới chuyển SHIPPING.

Với VNPay, muốn SHIPPING thì Payment phải PAID. Với COD, hệ thống cho giao khi chưa thu tiền và đánh dấu PAID khi chuyển DELIVERED.

Khi chuyển SHIPPING, hàm ship giảm cả quantityOnHand và reservedQuantity. Ví dụ trước đó kho có mười và đang giữ hai; giao hai thì kho còn tám và lượng giữ còn không.

Nếu hủy trước giao, hàm cancel chỉ giảm lượng giữ. Không cộng lại tồn thực tế vì checkout chưa trừ tồn thực tế. Code không cho hủy đơn đã PAID.”

**Hiểu đoạn này**

- mutateOrder dòng 233 mở transaction và khóa đơn trước khi thay đổi.
- Khách tự hủy ở cancelOwnedOrder dòng 194: chỉ đơn của mình, đang PENDING, chưa PAID.
- Admin có thể hủy từ một số trạng thái được liệt kê trong transition; không được tùy ý chuyển mọi trạng thái.
- COD ghi PAID khi Admin đánh dấu giao thành công; ứng dụng không tích hợp tự động xác nhận tiền từ shipper.

**Chuyển phần:** “Trường hợp cuối là khách chưa hoàn thành VNPay trong thời hạn.”

## 9. Hết hạn và đối soát — khoảng 1 phút rưỡi

**Mở:** [OrderExpirationService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/OrderExpirationService.java:39), expirePendingOrders.

**Lời nói**

“Tác vụ hết hạn tìm đơn PENDING đã qua paymentExpiresAt và có phương thức VNPay, chuyển sang EXPIRED_PENDING_RECONCILIATION. Khi chuyển trạng thái này, hệ thống chưa giải phóng hàng đang giữ.”

**Chỉ thêm nếu cần:** [PersistenceLifecycleListener.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/config/PersistenceLifecycleListener.java:21), lịch kiểm tra mỗi phút.

**Mở:** [VNPayQueryDrService.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/service/VNPayQueryDrService.java:76), reconcileOrder → reconcileAttempt dòng 138 → markRetry dòng 205.

“Đối soát là backend chủ động hỏi VNPay về kết quả giao dịch khi cần xác minh. Nếu kết quả thành công thì Payment được cập nhật PAID; đơn đang chờ đối soát được đưa về PENDING để xử lý.

Code có nhánh hủy đơn hết hạn khi tất cả attempts thuộc trạng thái FAILED hoặc EXPIRED. Khi chưa xác định được kết quả hoặc gọi dịch vụ lỗi, hệ thống lưu lỗi, số lần thử và thông tin thử lại; đạt ngưỡng năm lần thì đánh dấu cần Admin kiểm tra.”

**Hiểu đoạn này**

- IPN: cổng thanh toán chủ động báo về. QueryDR: ứng dụng chủ động hỏi cổng.
- Lịch tìm thấy trong code tự động kiểm tra hết hạn; chưa thấy lịch tự chạy QueryDR theo nextRetryAt.
- Đối soát có thể được gọi qua nút Admin và API sync của khách.
- Mốc hết hạn là 15 phút; tác vụ quét định kỳ có thể đánh dấu trạng thái sau mốc đó. API tạo URL vẫn tự kiểm tra thời gian.

**Nếu được hỏi mức độ hoàn thiện, nói đúng:**

“Phần VNPay hiện ở Sandbox. Một số nhánh an toàn cần hoàn thiện thêm, như kiểm tra attempt chưa rõ kết quả trước khi hủy chủ động và tự động chạy lại đối soát.”

Không nói mọi lỗi thanh toán đều đã được xử lý an toàn. Code hiện còn coi phản hồi QueryDR 91 sau hạn là FAILED, khác yêu cầu thận trọng trong tài liệu thiết kế.

**Chuyển phần:** “Các xử lý vừa trình bày được thể hiện qua nhóm class bán hàng trên sơ đồ.”

## 10. Chỉ class diagram và kết thúc — khoảng 1 phút

**Lời nói**

“Ở class diagram, User sở hữu Cart; Cart chứa các CartItem, mỗi dòng trỏ đến Product. Inventory theo dõi tồn thực tế và lượng giữ của Product.

Sau checkout, User có Order; Order chứa các OrderItem lưu sản phẩm, số lượng và giá đã chốt. Theo nghiệp vụ checkout, mỗi Order tạo một Payment; Payment có thể có nhiều PaymentAttempt khi thanh toán VNPay.

Việc tách CartItem và OrderItem giúp phân biệt dữ liệu đang chọn mua với dữ liệu đã chốt. Tách Payment và PaymentAttempt giúp phân biệt kết quả thanh toán tổng với lịch sử từng lần thử.

Qua luồng này, backend chịu trách nhiệm kiểm tra giá, tồn, quyền sở hữu và chuyển trạng thái; frontend hiển thị và gửi thao tác của người dùng. Em xin hết phần trình bày.”

**File class để mở khi cần**

| Class | File | Thuộc tính/quan hệ cần chỉ |
| --- | --- | --- |
| User | [User.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/User.java) | Người sở hữu giỏ/đơn |
| Cart | [Cart.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/Cart.java) | user |
| CartItem | [CartItem.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/CartItem.java) | cart, product, quantity |
| Product | [Product.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/Product.java) | price |
| Inventory | [Inventory.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/Inventory.java) | quantityOnHand, reservedQuantity |
| Order | [Order.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/Order.java) | user, status, totalAmount, key/hash, paymentExpiresAt |
| OrderItem | [OrderItem.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/OrderItem.java) | order, product, quantity, unitPrice |
| Payment | [Payment.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/Payment.java) | order, method, status, amount, paidAt |
| PaymentAttempt | [PaymentAttempt.java](D:/WEB/PROJECT/PC_STORE/backend/src/main/java/com/pcstore/entity/PaymentAttempt.java) | payment, order, referenceCode, status, thời hạn/đối soát |

Danh sách này đối chiếu entity trong repository, chưa xác minh trực tiếp file diagrams.net đang mở. Nếu sơ đồ cũ thiếu PaymentAttempt hoặc thuộc tính mới thì nói rõ đó là phần code đã bổ sung.

## Câu hỏi ôn nhanh

| Thầy hỏi | Trả lời ngắn |
| --- | --- |
| Thêm giỏ đã giữ hàng chưa? | Chưa; checkout mới tăng reservedQuantity. |
| Vì sao checkout kiểm tra lại kho? | Từ lúc thêm giỏ đến lúc mua, khách khác có thể đã mua/giữ hàng. |
| Vì sao không tin giá frontend? | Request có thể bị chỉnh sửa; backend lấy giá DB để tính. |
| Hai khách mua sản phẩm cuối cùng? | Checkout khóa bản ghi kho rồi kiểm tra tồn khả dụng trong transaction. |
| Chống đơn trùng bằng gì? | Key theo user, kiểm tra request hash và unique index ở DB. |
| Flush khác commit thế nào? | Flush đồng bộ SQL trong transaction; commit xác nhận giao dịch. Sau flush vẫn có thể rollback. |
| Vì sao OrderItem lưu giá? | Để giữ giá lúc mua dù Product đổi giá sau đó. |
| PAID khác DELIVERED thế nào? | PAID là tiền; DELIVERED là giao hàng. |
| Hủy có cộng lại onHand không? | Hủy trước giao chỉ nhả reserved vì onHand chưa bị trừ. |
| Hết 15 phút nhả kho ngay không? | Không, bước expiration giữ kho và chuyển chờ đối soát. |
| IPN khác QueryDR? | IPN cổng báo về; QueryDR ứng dụng chủ động hỏi. |
| Khách biết Admin đổi trạng thái thế nào? | Đọc lại dữ liệu đơn từ API, không khẳng định realtime. |

## Tiến độ học để tiếp tục

Đã soạn kịch bản và đối chiếu vị trí hàm ngày 15/10/2026. Chưa luyện nói, chưa xác nhận người học hiểu, chưa chạy demo/test trong lượt soạn bài. Lần sau đọc file này và luyện từng mục: người học nói lại, trợ lý sửa cách diễn đạt và hỏi hai câu về code. Bắt đầu mục 2 nếu chưa nắm giỏ; ưu tiên mục 4, 5, 8 nếu thời gian gấp.

