# Tài liệu PC Store

Đọc [README ở thư mục gốc](../README.md) để chạy ứng dụng. Các tài liệu dưới đây có mục đích riêng:

| Cần tìm | Tài liệu | Vai trò |
| --- | --- | --- |
| Thứ tự và phạm vi triển khai | Trang này | Quyết định ưu tiên CORE → FEATURE → ADVANCED. |
| Task và phụ thuộc | [Kế hoạch T01–T38](plane.md) | Bản kế hoạch tại thời điểm lập; trạng thái Work Item xem trên Plane. |
| Tích hợp luồng mua hàng | [Nhật ký T20](T20_INTEGRATION_LOG.md) | Kết quả và giới hạn kiểm chứng khi ghép frontend với backend. |
| Schema và quy tắc dữ liệu | [Mô hình dữ liệu](data-model.md) | Thiết kế dữ liệu mục tiêu; đối chiếu migration để biết phần đã có. |
| Cách chạy kiểm thử | [Hướng dẫn kiểm thử](testing.md) | Lệnh kiểm thử và môi trường cần chuẩn bị. |
| API đã khai báo | [OpenAPI](../backend/src/main/webapp/api-docs/openapi.yaml) | Đặc tả HTTP; đối chiếu Servlet/DTO khi sửa endpoint. |
| Upload và truy cập media | [T21 media](../backend/T21_MEDIA.md) | Giới hạn, quyền và vòng đời file của dịch vụ media. |
| API bài đăng Setup | [T29 Setup](T29_SETUP.md) | Endpoint, DTO, lỗi và quyền cho FE/QA; ranh giới với T30. |
| API đánh giá sản phẩm | [T26 Review](T26_REVIEW_API.md) | Endpoint, DTO, lỗi và quyền cho FE/QA; contract dành trước cho T27. |
| Dữ liệu kiểm thử Builder | [T22 Builder](T22_BUILDER.md) | Seed spec và đáp án PASS/FAIL/UNKNOWN cho T23/T24. |
| Kiểm tra tương thích Builder | [T23 CompatibilityService](T23_COMPATIBILITY.md) | Contract, rule và giới hạn kiểm tra của backend. |
| Lưu build và thêm giỏ | [T24 Build API](T24_BUILD_API.md) | Endpoint, quyền, giá và điều kiện thêm giỏ của Builder. |
| Tích hợp Builder | [T32 Builder](T32_BUILDER.md) | Catalog thật, xem trước tương thích, lưu build và mua qua giỏ. |

## Phạm vi và thứ tự

**CORE:** đăng ký/đăng nhập và phân quyền; catalog, tìm kiếm/lọc; giỏ hàng; checkout COD, đơn hàng và tồn kho; Admin quản lý sản phẩm và đơn. Luồng nghiệm thu là khách đăng nhập → chọn sản phẩm → đặt hàng → Admin xử lý → khách xem trạng thái. Dữ liệu và kiểm tra quyền/giá/kho ở backend.

**FEATURE:** PC Builder và kiểm tra tương thích cơ bản; Review của sản phẩm thuộc đơn đã giao; Setup Community với ảnh cơ bản. Các mục này phụ thuộc dữ liệu và trạng thái đơn của CORE. Media phục vụ Review/Setup theo Work Item tương ứng.

**ADVANCED:** AI Recommendation, Promotion, Warranty và media mở rộng. Chỉ triển khai theo Work Item đã chốt; sơ đồ dữ liệu có bảng tương ứng không có nghĩa chức năng đã chạy.

Chưa bao gồm thanh toán online thật, tích hợp vận chuyển, chat, follow/friend, livestream hoặc kiểm tra tương thích chuyên sâu. Thiết kế nghiệp vụ gốc nằm trên [Page 4 của Plane](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/a1cc795d-126f-4258-8cab-5814e173364b/); ưu tiên triển khai ở trên là quyết định của nhóm sau đó. Khi đổi phạm vi, cập nhật trang này và Work Item liên quan.
