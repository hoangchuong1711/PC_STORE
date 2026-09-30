# Kiến trúc và quyết định triển khai

## Nguồn ưu tiên

1. Yêu cầu môn học và quyết định nhóm đã ghi trong repo.
2. [Plane — BE](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/3029ba6f-9259-4e5c-96f8-1626271c3b60/) cho **cách triển khai backend**.
3. [Plane — Page 4](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/a1cc795d-126f-4258-8cab-5814e173364b/) cho **nghiệp vụ, mô hình và luồng thiết kế**.

Các Page 0–3 và Requirements cũ là tài liệu tham khảo lịch sử. Page 4 có vài đoạn cũ vẫn nhắc JDBC, Address/AdministrativeArea hoặc bảng `OrderItemWarranty`; những đoạn chốt về sau trong chính Page 4 và quy định BE được ưu tiên như dưới đây. Không dùng một câu cũ để âm thầm đổi kiến trúc toàn dự án.

## Stack đã chốt

| Phần | Quyết định |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui. Repo hiện dùng npm (`package-lock.json`). |
| Backend | Java 21, Java Servlet, Tomcat 10.1, Maven; API HTTP/JSON. |
| Phân lớp | Servlet/Controller → Service → DAO → JPA (`EntityManager`, Hibernate provider) → PostgreSQL. |
| Authentication | `HttpSession`/cookie; quyền Customer/Admin được kiểm tra ở backend, dùng Filter khi phù hợp. |
| Database | PostgreSQL là database chính. Schema thay đổi phải có migration hoặc script được commit; không chỉ sửa DB bằng GUI trên một máy. |
| Môi trường nhóm | Docker Compose là mục tiêu đồng bộ môi trường, chưa có cấu hình trong repo. |

Next.js làm giao diện và gọi Java API. Không dùng Next.js làm backend nghiệp vụ chính hoặc truy cập PostgreSQL trực tiếp. Servlet xử lý HTTP, Service giữ quy tắc và transaction, DAO truy cập dữ liệu qua JPA. Dùng `jakarta.servlet.*` và `jakarta.persistence.*` theo stack này.

## Quy tắc dữ liệu quan trọng

- Giá, tồn kho, quyền và dữ liệu sở hữu được xác thực ở Java backend. Giao diện có thể kiểm tra thêm để báo lỗi sớm.
- Giỏ hàng dùng giá hiện hành; `OrderItem` lưu giá đã chốt khi đặt. `Order` lưu tên, số điện thoại và **chuỗi địa chỉ giao hàng** tại thời điểm đặt để lịch sử không thay đổi theo catalog hay dịch vụ bên ngoài.
- Theo mục chốt về class diagram khái niệm ở cuối Page 4, CORE chưa cần sổ địa chỉ `Address`/`AdministrativeArea`. Nếu sau này cần lưu địa chỉ dùng lại, nhóm sẽ quyết định schema riêng. Tích hợp gợi ý địa chỉ Google Maps không phải điều kiện để bắt đầu checkout CORE.
- `Inventory` là nguồn số lượng tồn; `Product` giữ thông tin sản phẩm. Quy tắc tương thích dùng chung cho Builder và AI Recommendation khi triển khai.
- Page 4 mô tả AI Recommendation; tài liệu scope hiện xếp nó vào ADVANCED. Thiết kế có sẵn không đồng nghĩa phải triển khai trước CORE.
- Với bảo hành, dữ liệu chính sách lúc mua phải được chốt trong đơn. Page 4 đoạn cuối đề xuất snapshot trên `OrderItem` và lược `OrderItemWarranty` khỏi sơ đồ khái niệm; bảng triển khai chi tiết sẽ được quyết định khi thực sự làm Warranty.

## Giao diện giữa frontend và backend

API trả JSON qua HTTP. Không trả trực tiếp entity có `passwordHash` hay quan hệ vòng; dùng request/response DTO. Lỗi trả mã HTTP và thông điệp ổn định. Khi một luồng chuẩn bị code, ghi endpoint, request, response, lỗi và quyền truy cập vào Work Item hoặc `docs/api.md` (tạo file khi API đầu tiên được chốt), rồi frontend/backend cùng theo hợp đồng đó.

## Quyết định còn mở, chưa được giả định thành sự thật

- Cách chạy Tomcat/PostgreSQL và cấu hình Docker Compose cho nhóm.
- Công cụ migration/schema và dữ liệu mẫu.
- Chi tiết session/cookie khi frontend và backend chạy khác origin, bao gồm CORS/CSRF.
- Bộ lọc sản phẩm đầu tiên, phương thức thanh toán không qua cổng và các trạng thái đơn cụ thể cho CORE.
- Nhà cung cấp AI, giới hạn chi phí và khóa API nếu nhánh ADVANCED được nhận làm.

Chốt mỗi mục trước Work Item phụ thuộc vào nó; cập nhật file này cùng code/config liên quan. Không cần giải hết ADVANCED trước khi làm lát cắt Product đầu tiên.
