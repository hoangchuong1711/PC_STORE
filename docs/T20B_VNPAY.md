# Tài liệu tích hợp T20-B: Cổng thanh toán trực tuyến VNPay và Quản lý đối soát

## 1. Mục tiêu và phạm vi
- **Mã task**: `T20-B`
- **Nhánh làm việc**: `feat/t20b-vnpay-payment`
- **Mục tiêu**: Bổ sung phương thức thanh toán trực tuyến qua cổng VNPay Sandbox, quản lý thời hạn thanh toán 15 phút, lưu trữ chi tiết từng lần thanh toán (`payment_attempts`), cơ chế chuyển trạng thái `EXPIRED_PENDING_RECONCILIATION`, xử lý IPN và QueryDR đối soát nhằm bảo toàn dữ liệu tiền tệ và tồn kho giữ chỗ.

---

## 2. Quy tắc nghiệp vụ cốt lõi

### 2.1. Phương thức thanh toán
- Hệ thống hỗ trợ 2 phương thức thanh toán chính thức: **`COD`** (Thanh toán khi nhận hàng) và **`VNPAY`** (Cổng thanh toán trực tuyến Sandbox).
- Loại bỏ hoàn toàn phương thức chuyển khoản ngân hàng thủ công (`BANK_TRANSFER`) vì toàn bộ việc quét mã VietQR và liên kết ngân hàng đã được tích hợp qua cổng VNPAY.
- Khách hàng lựa chọn `COD` hoặc `VNPAY` tại trang Checkout.

### 2.2. Thời hạn thanh toán (Expiration - 15 phút)
- Mỗi đơn hàng VNPay có thời hạn thanh toán cố định là **15 phút tính từ khi checkout thành công** (`payment_expires_at = order_date + 15 minutes`).
- Các lần thử lại thanh toán (Retry payment attempt) **KHÔNG** kéo dài thời hạn này.
- Khi vượt quá 15 phút:
  - Khách hàng không thể tạo thêm URL thanh toán mới.
  - Đơn chuyển sang trạng thái `EXPIRED_PENDING_RECONCILIATION`.
  - **Tồn kho giữ chỗ (`reserved_quantity`) TIẾP TỤC ĐƯỢC GIỮ CHỖ**, không giải phóng ngay lập tức nhằm tránh rủi ro khách đã bị trừ tiền nhưng IPN đến chậm.

### 2.3. Quản lý Payment và Payment Attempts
- **Bản ghi Payment tổng hợp**: Mỗi Order chỉ có duy nhất 1 bản ghi `Payment` (quan hệ 1-1). Số tiền `amount = total_amount` không đổi.
- **Bảng `payment_attempts`**: Lưu chi tiết từng lần sinh URL thanh toán gửi sang VNPay:
  - `reference_code`: Mã tham chiếu duy nhất của lần thanh toán (`vnp_TxnRef`), có tiền tố `PCS_{orderId}_{seq}_{timestamp}` để chống trùng lặp.
  - `amount`: Số tiền thanh toán của attempt.
  - `created_at`, `expires_at`: Thời gian bắt đầu và hết hạn của attempt (không vượt quá hạn 15 phút của đơn).
  - `status`: `INITIATED` (vừa tạo URL), `PENDING` (khách đang thao tác tại cổng), `SUCCESS` (thành công), `FAILED` (thất bại), `EXPIRED` (hết hạn), `UNKNOWN` (chưa rõ).
  - `vnp_transaction_no`: Mã giao dịch do VNPay phản hồi.
  - Cột đối soát: `last_reconciled_at`, `next_retry_at`, `retry_count`, `error_message`, `requires_admin_review`.
- **Nguyên tắc chống tạo attempt trùng**:
  - Không tạo 2 attempt hoạt động song song. Nếu attempt cũ còn hiệu lực và chưa có kết luận thất bại, trả về attempt hiện tại.
  - Chỉ cho phép tạo attempt mới khi attempt trước đã có kết luận thất bại (`FAILED`) và đơn vẫn còn trong thời hạn 15 phút.

---

## 3. Máy trạng thái đơn hàng và Quyền hạn (State Machine)

### 3.1. Bảng ma trận trạng thái

| Trạng thái Order | Quyền tạo thanh toán | Quyền giao hàng (`SHIPPING`) | Giữ chỗ tồn kho | Quy tắc chuyển tiếp |
| :--- | :---: | :---: | :---: | :--- |
| **`PENDING` (COD)** | N/A | Cần duyệt `CONFIRMED` | **GIỮ CHỖ** | Admin duyệt sang `CONFIRMED` hoặc Hủy sang `CANCELLED`. |
| **`PENDING` (VNPay)** | **ĐƯỢC** (Trong 15 phút) | **CẤM** | **GIỮ CHỖ** | - Nhận IPN thành công → Payment `PAID`, đơn chuyển `PENDING`/`CONFIRMED`.<br>- Hết 15 phút chưa thu tiền → Sang `EXPIRED_PENDING_RECONCILIATION`. |
| **`EXPIRED_PENDING_RECONCILIATION`** | **CẤM** | **CẤM** | **TIẾP TỤC GIỮ CHỖ** | - QueryDR xác nhận ĐÃ TRẢ TIỀN: Payment thành `PAID`, đưa đơn về `PENDING`/`CONFIRMED` để xử lý.<br>- QueryDR xác nhận THẤT BẠI DỨT ĐIỂM: Chuyển `CANCELLED`, giải phóng giữ chỗ.<br>- QueryDR chưa rõ: Tiếp tục thử lại; quá ngưỡng retry đánh dấu `requires_admin_review = true`. |
| **`CONFIRMED`** | N/A | **ĐƯỢC** (Nếu COD hoặc VNPay `PAID`) | **GIỮ CHỖ** | Chuyển sang `SHIPPING` (lúc này trừ tồn khả dụng và trừ tồn thực tế). |
| **`SHIPPING`** | N/A | Đang giao | ĐÃ TRỪ TỒN THỰC TẾ | Shipper giao thành công → Chuyển `DELIVERED`. Với COD, cập nhật `PAID`. |
| **`DELIVERED`** | N/A | Đã giao | ĐÃ TRỪ TỒN THỰC TẾ | Hoàn tất. Đủ điều kiện viết Review và đăng bài Setup. |
| **`CANCELLED`** | **CẤM** | **CẤM** | **GIẢI PHÓNG TỒN** | Hoàn trả toàn bộ `reserved_quantity` về tồn khả dụng. |

### 3.2. Quy tắc đối soát và giải phóng kho an toàn
1. **Chỉ giải phóng kho khi an toàn tuyệt đối**:
   - Chỉ giải phóng kho khi **toàn bộ các `payment_attempts`** của đơn đã được xác nhận thất bại an toàn (`FAILED` hoặc `EXPIRED`).
   - Lỗi mạng hoặc phản hồi "chưa tìm thấy giao dịch" từ QueryDR không đồng nghĩa với chưa thu tiền. Phải thực hiện thử lại theo backoff.
2. **Hủy chủ động (User/Admin cancel)**:
   - Trước khi nhả kho, hệ thống phải kiểm tra xem có attempt nào đang ở trạng thái chưa rõ kết quả không. Nếu có, phải kích hoạt QueryDR xác minh trước khi cho phép hủy.

---

## 4. Hợp đồng API (API Contracts)

### 4.1. Tạo URL thanh toán VNPay
- **Endpoint**: `POST /api/orders/{id}/payment/vnpay-url`
- **Bảo mật**: Yêu cầu session cookie (`CUSTOMER` sở hữu đơn hàng).
- **Phản hồi 200/201**:
```json
{
  "orderId": 12,
  "paymentMethod": "VNPAY",
  "referenceCode": "PCS_12_1_1728475200000",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...",
  "expiresAt": "2026-10-09T19:40:00"
}
```
- **Lỗi**:
  - `400 BAD_REQUEST`: Đơn không dùng phương thức VNPay hoặc đã thanh toán.
  - `409 PAYMENT_EXPIRED`: Đơn đã quá thời hạn 15 phút.
  - `409 ATTEMPT_IN_PROGRESS`: Lần thanh toán trước đang diễn ra (trả về URL cũ).

### 4.2. IPN Webhook từ VNPay
- **Endpoint**: `GET /api/payment/vnpay/ipn`
- **Bảo mật**: Công khai (Server-to-Server). Kiểm tra chữ ký HMAC-SHA512.
- **Xử lý**:
  - Khóa bi quan: Order → Payment → PaymentAttempt.
  - Kiểm tra số tiền, mã tham chiếu, chữ ký bảo mật.
  - Cập nhật kết quả vào cơ sở dữ liệu trong cùng một transaction.
- **Phản hồi (chuẩn VNPay)**:
  - `{"RspCode":"00","Message":"Confirm Success"}`
  - `{"RspCode":"01","Message":"Order not found"}`
  - `{"RspCode":"02","Message":"Order already confirmed"}`
  - `{"RspCode":"04","Message":"Invalid Amount"}`
  - `{"RspCode":"97","Message":"Invalid Checksum"}`

### 4.3. Admin kiểm tra đối soát thủ công
- **Endpoint**: `POST /api/admin/orders/{id}/reconcile`
- **Bảo mật**: Yêu cầu session cookie (`ADMIN`).
- **Phản hồi**: Trả về thông tin đơn hàng sau khi kích hoạt tác vụ QueryDR.

---

## 5. Quy trình cấu hình môi trường Sandbox
- `VNPAY_ENABLED`: `true`
- `VNPAY_TMN_CODE`: Mã website do VNPay Sandbox cung cấp (ví dụ: `PCSTORE1`).
- `VNPAY_HASH_SECRET`: Chuỗi khóa bí mật ký HMAC-SHA512.
- `VNPAY_PAY_URL`: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- `VNPAY_API_URL`: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`
- `VNPAY_RETURN_URL`: `http://localhost:3000/orders/payment-return`
