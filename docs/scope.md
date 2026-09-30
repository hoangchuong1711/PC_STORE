# Phạm vi và thứ tự triển khai

## CORE — ưu tiên đầu tiên

| Nhóm việc | Đầu ra tối thiểu có thể kiểm tra |
| --- | --- |
| Login/Register | Khách đăng ký, đăng nhập/đăng xuất; backend phân quyền Customer/Admin. |
| Product | Xem danh sách, chi tiết sản phẩm và danh mục từ database. |
| Search/Filter | Tìm theo tên và lọc cơ bản trên dữ liệu thật; chốt bộ lọc cụ thể trong Work Item. |
| Cart | Thêm, đổi số lượng, xóa sản phẩm; tổng tiền được tính từ giá do backend cung cấp. |
| Checkout/Order | Tạo đơn từ giỏ khi đủ tồn kho; lưu giá và địa chỉ giao hàng tại thời điểm đặt; khách xem đơn của mình. Chưa tích hợp thanh toán online thật hoặc vận chuyển. |
| Admin product/order | Admin quản lý sản phẩm và xử lý trạng thái đơn; Customer không truy cập được thao tác quản trị. |

Luồng nghiệm thu CORE: **đăng ký/đăng nhập → xem sản phẩm → thêm giỏ → đặt hàng → Admin xử lý đơn → khách xem trạng thái**. Dùng dữ liệu thật qua Next.js → Java Servlet → PostgreSQL; một giao diện giả lập API chưa được tính là hoàn thành.

## FEATURE — sau khi CORE chạy ổn

- **PC Builder:** chọn linh kiện từ catalog, tính chi phí và lưu cấu hình.
- **Compatibility:** kiểm tra các quy tắc cơ bản có dữ liệu xác thực; thiếu dữ liệu thì báo chưa kiểm tra được, không tự coi là tương thích.
- **Review:** đánh giá đúng sản phẩm trong đơn đã giao; phần sao/nội dung chữ là lõi. Ảnh/video review thuộc mở rộng Media.
- **Setup Community:** người đã có đơn giao thành công đăng setup, gắn sản phẩm; khách xem, like và xem xếp hạng cơ bản. **Một ảnh setup cơ bản** là dữ liệu cần thiết theo thiết kế Page 4; hệ thống media nhiều file/video/xử lý nâng cao thuộc ADVANCED.

Mỗi mục FEATURE cần một Work Item ghi rõ tiêu chí nghiệm thu trước khi triển khai. Review và Community phụ thuộc trạng thái đơn `DELIVERED` của CORE.

## ADVANCED — chỉ khi còn thời gian và nền tảng đã ổn

- **AI Recommendation:** Page 4 mô tả bộ 10 câu hỏi cố định, linh kiện khách đã có, AI đề xuất phần còn thiếu, backend kiểm tra lại độ đầy đủ, tương thích, giá, tồn kho và ngân sách. Không huấn luyện AI riêng. Chỉ triển khai sau Builder và Compatibility.
- **Promotion:** giảm giá phải dùng một nguồn tính giá chung cho catalog, cart, checkout và Builder.
- **Warranty:** hiển thị chính sách và tra cứu từ dữ liệu đã chốt trong đơn.
- **Media nâng cao:** nhiều ảnh/video, giới hạn và kiểm tra upload, quản lý vòng đời file. Không dùng mục này để trì hoãn ảnh setup cơ bản của FEATURE.

## Giới hạn đang giữ

Chưa làm thanh toán online thật, tích hợp đơn vị vận chuyển, chat, follow/friend, livestream hoặc compatibility chuyên sâu. Recommendation chỉ đề xuất linh kiện **thùng PC**, không đề xuất gear/màn hình/bàn/ghế. Những mặt hàng đó vẫn có thể nằm trong catalog bán hàng.

## Nguồn và thay đổi phạm vi

[Page 4 trên Plane](https://app.plane.so/ltrweb/projects/bfbe5013-9824-4809-a220-fb196fcd1f7c/pages/a1cc795d-126f-4258-8cab-5814e173364b/) là thiết kế nghiệp vụ gần nhất. Ba tầng ở trên là **ưu tiên triển khai do nhóm chốt sau đó**; một chức năng có trong Page 4 vẫn có thể nằm ở ADVANCED. Khi đổi ưu tiên, cập nhật file này và Work Item tương ứng, không sửa lặp ở nhiều Page cũ.
