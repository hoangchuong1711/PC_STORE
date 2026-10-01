# KẾ HOẠCH TRIỂN KHAI DỰ ÁN WEBSITE PC STORE
**Thời gian 30/09/2026 đến hết 13/10/2026**

Nhóm 5 thành viên | 14 ngày | 4–5 giờ mỗi người mỗi ngày

**Cập nhật T03 (01/10/2026):** đã có [ERD CORE](data-model.md), Flyway và migration/JPA cho một bảng `brands`. Test tích hợp đã chạy thành công trên PostgreSQL riêng: 1 test, không lỗi, không bỏ qua. Các bảng CORE còn lại chưa triển khai; T03 chưa hoàn tất. Xem [README](../README.md) để chạy lại test và kết nối database phát triển.

Kế hoạch tập trung hoàn thiện luồng mua hàng CORE và PC Builder với kiểm tra tương thích cơ bản để báo cáo kết thúc môn Lập trình Web. Các thành viên tự nhận task phù hợp năng lực; cuối đợt cần có bản chạy được, kết quả kiểm thử và bộ tài liệu báo cáo thống nhất.

## I TỔNG QUAN CÔNG NGHỆ VÀ PHẠM VI

| Thành phần    | Công nghệ                                            | Vai trò                                                             |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Frontend      | Next.js, TypeScript, Tailwind CSS, shadcn/ui         | Giao diện khách hàng, Admin và PC Builder; gọi API Java.            |
| Backend       | Java 21, Servlet, Tomcat 10.1, Maven                 | Servlet → Service → DAO; nghiệp vụ, quyền và transaction ở backend. |
| Dữ liệu       | JPA, Hibernate, PostgreSQL                           | Entity/DAO, ràng buộc DB, migration và dữ liệu mẫu dùng chung.      |
| Đăng nhập     | HttpSession, Cookie, Servlet Filter                  | Xác thực Customer/Admin; kiểm tra quyền ở server.                   |
| Làm việc nhóm | Git/GitHub, Plane; Docker Compose cho DB nếu phù hợp | Task tự nhận, review PR, môi trường chạy lại được theo README.      |
| Kiểm thử      | Test nghiệp vụ Java, thử API và kiểm thử giao diện   | Ưu tiên giá, tồn kho, quyền và luồng mua hàng/Builder.              |

Yêu cầu môn học giữ nguyên Servlet + JPA + DAO. Repo hiện mới khởi tạo; kế hoạch có task dựng backend web và kết nối frontend. Các Page thiết kế mô tả chức năng dự kiến, không được tính là đã có code.

### Phạm vi demo trong hai tuần

CORE gồm đăng ký/đăng nhập, catalog và chi tiết sản phẩm, search/filter cơ bản, giỏ hàng, checkout, lịch sử/chi tiết đơn, Admin quản lý sản phẩm và đơn. Bản demo đề xuất dùng COD và địa chỉ nhập dạng văn bản, được chốt ở T01; chưa cần cổng thanh toán thật hay gợi ý Google Maps.

Builder gồm chọn CPU, mainboard, RAM, GPU, SSD, PSU, case, cooler; tính tổng, lưu/sửa/xóa build và thêm vào giỏ. Đề xuất bản đầu tập trung cấu hình mua mới (ownedQuantity = 0), đưa luồng đồ đã sở hữu sang đợt mở rộng. Nhóm cần chốt giới hạn này ở T01; đây chưa phải thay đổi được xác nhận đối với thiết kế tổng thể.

Compatibility kiểm tra socket CPU/main/cooler; RAM type, số thanh và dung lượng; mainboard/case form factor; kích thước GPU/cooler với case; công suất nguồn theo bộ rule được chốt và dữ liệu có nguồn. Hiển thị từng rule đã kiểm tra; thiếu spec trả UNKNOWN. Chưa xác nhận BIOS, đầu cắm, radiator hay độ tương thích ngoài dữ liệu được kiểm thử.

Review và Setup Community được đưa sang đợt sau. AI Recommendation, Promotion, Warranty và Media nâng cao tiếp tục là ADVANCED. Ảnh catalog cho demo dùng tài sản mẫu/URL đã chuẩn bị; chưa xây hệ thống upload media riêng. Dành thời gian dự phòng để hoàn thiện mục tiêu chính trước khi bổ sung chức năng.

### Nguồn lực và cách tự nhận task

Nguồn lực danh nghĩa là 5 × 14 × 4–5 = 280–350 giờ công. Danh mục bên dưới ước tính 224 giờ công, để lại 56–126 giờ cho trao đổi, review, học phần chưa quen và phát sinh. Giờ công là tổng thời gian của người tham gia; task 10 giờ làm bởi hai người vẫn được tính 10 giờ, không phải 10 giờ mỗi người.

Để đạt mốc này, cần ít nhất 3 người thực hiện phần code hoặc ghép cặp thường xuyên; 1–2 người còn lại nhận dữ liệu, ca kiểm thử, tài liệu và hỗ trợ ghép giao diện. Đây là điều kiện lập kế hoạch, chưa phải đánh giá năng lực cụ thể của từng thành viên. Nếu cuối ngày 2 chưa có người đáp ứng các task BE/Builder khó, nhóm phải điều chỉnh mức hoàn thiện hoặc thời hạn.

Mỗi task có một người chịu trách nhiệm, tự điền vào cột Nhận việc hoặc chọn Assignee trên Plane. Task khó có người phối hợp và một người review. Mỗi người giữ tối đa một task code chính đang làm; ưu tiên việc chặn task khác. T01, T16 và T28 cần nhiều thành viên cùng tham gia; chi phí đã tính theo giờ công.

Task phù hợp để bắt đầu khi ít kinh nghiệm code: T08, T09, T18, T22, T27 và T29. Người nhận dữ liệu/QA có thể chạy script dưới hướng dẫn, tự ghi lỗi có bước tái hiện và kết quả mong đợi. Nhóm rà soát task trống, việc bị chặn và tiến độ 10–15 phút mỗi ngày trên Plane.

## II LỘ TRÌNH TRIỂN KHAI

| Mốc         | Thời gian   | Điều kiện đạt                                                     |
| ----------- | ----------- | ----------------------------------------------------------------- |
| M1 Nền tảng | 30/09–03/10 | Môi trường chạy, catalog từ DB lên UI, đăng nhập và quyền.        |
| M2 CORE     | 04/10–06/10 | Mua hàng đến tạo đơn; Admin xử lý; kiểm tra giá/kho/quyền.        |
| M3 Builder  | 07/10–10/10 | Chọn/lưu build, các rule compatibility, thêm giỏ và mua được.     |
| M4 Báo cáo  | 11/10–13/10 | Sửa lỗi, chạy lại trên máy khác, hoàn thiện tài liệu và diễn tập. |

Tất cả ngày trong bảng thuộc năm 2026. Thời gian gồm cả cuối tuần. Cột điều kiện nêu phụ thuộc; task frontend có thể bắt đầu bằng DTO mẫu đã chốt nhưng chỉ hoàn thành khi nối API thật. Task chung hoặc ước tính trên 5 giờ trong một ngày cần người phối hợp.

### GIAI ĐOẠN 1 NỀN TẢNG CATALOG VÀ TÀI KHOẢN

**30/09 đến 03/10**

Mục tiêu là đưa dữ liệu thật từ PostgreSQL qua Servlet/JPA lên Next.js, đồng thời hoàn thành đăng nhập và phân quyền. T02/T03 phối hợp; frontend dùng DTO mẫu trong lúc backend triển khai.

| Task và công sức                                           | Thời gian       | Đầu ra và điều kiện hoàn thành                                                                                                                                           | Nhận việc |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| T01 Chốt phạm vi và hợp đồng chung Nhóm / Vừa / 5 giờ      | 30/09 đến 30/09 | Chốt COD cho bản demo, lọc tên/danh mục/brand/giá, trạng thái đơn, quy tắc tồn kho và API JSON. Có danh sách endpoint/DTO cho từng người làm song song. Cần trước: Không | —         |
| T02 Dựng backend và môi trường chạy BE / Khó / 10 giờ      | 30/09 đến 01/10 | Maven WAR chạy trên Tomcat 10.1; Servlet trả JSON, JPA kết nối PostgreSQL. README ghi cách chạy; một máy khác thử được. Cần trước: T01                                   | —         |
| T03 ERD CORE và migration đầu tiên DB BE / Khó / 10 giờ    | 30/09 đến 01/10 | Chốt User, Product, Category, Brand, Inventory, Cart/Item, Order/Item và Payment tối thiểu. Có khóa/ràng buộc, script tạo schema và mapping JPA. Cần trước: T01          | —         |
| T04 API catalog và tìm kiếm BE / Vừa / 8 giờ               | 02/10 đến 03/10 | API danh sách có phân trang, chi tiết, tìm tên và lọc cơ bản; DTO không lộ dữ liệu riêng. Kiểm tra sản phẩm không tồn tại. Cần trước: T02, T03                           | —         |
| T05 Đăng ký đăng nhập và phân quyền BE / Khó / 8 giờ       | 02/10 đến 03/10 | Hash mật khẩu; HttpSession, logout và Filter quyền. Frontend nhận/gửi cookie đúng; chặn Customer gọi API Admin, kiểm tra email trùng. Cần trước: T02, T03                | —         |
| T06 Giao diện catalog và chi tiết FE / Vừa / 8 giờ         | 01/10 đến 03/10 | Dựng layout, danh sách, bộ lọc, chi tiết và trạng thái tải/rỗng/lỗi. Dùng DTO mẫu trước, nối API T04 trước khi hoàn thành. Cần trước: T01                                | —         |
| T07 Giao diện đăng ký đăng nhập FE / Vừa / 6 giờ           | 02/10 đến 03/10 | Form báo lỗi rõ, giữ trạng thái đăng nhập, logout. Nối T05; ẩn điều hướng Admin cho Customer, backend vẫn kiểm tra quyền. Cần trước: T01                                 | —         |
| T08 Chuẩn bị dữ liệu catalog Dữ liệu / Dễ / 8 giờ          | 30/09 đến 03/10 | Thu thập 30–40 sản phẩm, tên/model/giá/danh mục/brand/ảnh và nguồn. Giá demo được ghi rõ; người code kiểm tra rồi nạp seed theo T03. Cần trước: T01                      | —         |
| T09 Viết ca kiểm thử và checklist QA tài liệu / Dễ / 4 giờ | 01/10 đến 03/10 | Checklist tài khoản, catalog, giỏ, đơn và quyền; mỗi ca có đầu vào, kết quả mong đợi. Gắn mã task để dùng khi kiểm thử tích hợp. Cần trước: T01                          | —         |

Tổng công sức nhóm task giai đoạn 1: 67 giờ công. Người nhận ghi tên trên Plane; cộng tác viên được ghi trong mô tả task.

Chốt M1 cuối 03/10: máy khác chạy được theo README; catalog và auth dùng API thật. Nếu chưa đạt, dồn người sửa nền tảng trước khi mở nhiều task mới.

### GIAI ĐOẠN 2 HOÀN THIỆN LUỒNG MUA HÀNG

**04/10 đến 06/10**

Mục tiêu là giỏ hàng, checkout, đơn hàng và Admin hoạt động cùng nhau. T12 có thể dựng service theo hợp đồng trước khi T11 xong; kiểm thử cuối phải dùng giỏ và API thật.

| Task và công sức                               | Thời gian       | Đầu ra và điều kiện hoàn thành                                                                                                                                                                                                                       | Nhận việc |
| ---------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| T10 API quản trị sản phẩm BE / Vừa / 6 giờ     | 04/10 đến 05/10 | Admin thêm/sửa/ẩn sản phẩm và chỉnh tồn theo quy tắc chung. Kiểm tra giá/số lượng; không xóa cứng sản phẩm đã nằm trong đơn. Cần trước: T04, T05                                                                                                     | —         |
| T11 API giỏ hàng BE / Vừa / 5 giờ              | 04/10 đến 05/10 | Thêm/gộp dòng, đổi số lượng, xóa và xem giỏ riêng của user. Từ chối lượng không hợp lệ; giá do backend tính. Cần trước: T04, T05                                                                                                                     | —         |
| T12 Checkout và xử lý đơn BE / Khó / 10 giờ    | 04/10 đến 06/10 | Tạo đơn COD từ giỏ, snapshot giá/địa chỉ; kiểm tra kho trong transaction, rollback lỗi và xử lý request lặp để không tạo đơn/trừ kho hai lần. Có API xem đơn riêng và Admin chuyển trạng thái; tích hợp T11 trước kiểm thử cuối. Cần trước: T03, T05 | —         |
| T13 Giao diện giỏ và checkout FE / Vừa / 8 giờ | 04/10 đến 06/10 | Thêm hàng, cập nhật giỏ, nhập địa chỉ, xác nhận COD và hiển thị kết quả. Nối T11/T12; chặn gửi lặp trên UI và hiển thị lỗi kho/giá. Cần trước: T06, T07                                                                                              | —         |
| T14 Giao diện quản trị FE / Vừa / 6 giờ        | 04/10 đến 06/10 | Admin quản lý sản phẩm/tồn và danh sách/chi tiết/trạng thái đơn. Nối T10/T12, kiểm tra lỗi và quyền truy cập. Cần trước: T06, T07                                                                                                                    | —         |
| T15 Lịch sử và chi tiết đơn FE / Vừa / 4 giờ   | 05/10 đến 06/10 | Khách xem đúng đơn của mình và trạng thái. Dùng mẫu API trước; hoàn thành khi đã nối T12 và thử truy cập đơn người khác. Cần trước: T07                                                                                                              | —         |
| T16 Nghiệm thu CORE QA nhóm / Vừa / 6 giờ      | 06/10 đến 06/10 | Thử trọn luồng mua hàng và Admin xử lý; kiểm tra kho không âm, giá đơn cũ không đổi, quyền sở hữu đơn. Ghi lỗi và quyết định qua mốc CORE. Cần trước: T10, T11, T12, T13, T14, T15                                                                   | —         |

Tổng công sức nhóm task giai đoạn 2: 45 giờ công. Người nhận ghi tên trên Plane; cộng tác viên được ghi trong mô tả task.

Chốt M2 cuối 06/10: trọn luồng CORE qua T16. Nếu chưa đạt, chưa tuyên bố đủ điều kiện mở Builder; dùng dự phòng để sửa và đánh giá lại mốc M3. Không bỏ kiểm thử hoặc ngày tập báo cáo để bù tính năng.

### GIAI ĐOẠN 3 PC BUILDER VÀ COMPATIBILITY

**07/10 đến 10/10**

Mục tiêu là build có thể lưu, kiểm tra và mua. T18 chuẩn bị spec từ 02/10 để giảm áp lực tuần hai. T21 dựng UI sau M2, dùng hợp đồng từ T17 và nối API trước nghiệm thu.

| Task và công sức                                             | Thời gian       | Đầu ra và điều kiện hoàn thành                                                                                                                                         | Nhận việc |
| ------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| T17 Chốt dữ liệu Builder và các rule DB BE / Khó / 6 giờ     | 07/10 đến 07/10 | Chốt PcBuild/Item, Spec và API kiểm tra. Quy định PASS/FAIL/UNKNOWN cho từng rule, số lượng và cấu hình đủ bộ; đồng bộ migration/JPA. Cần trước: T16, T03              | —         |
| T18 Chuẩn bị bộ linh kiện kiểm thử Dữ liệu QA / Vừa / 10 giờ | 02/10 đến 07/10 | Thu thập spec có nguồn cho CPU/main/RAM/GPU/SSD/PSU/case/cooler. Có ít nhất 2 bộ hợp lệ và ca sai từng rule; người BE duyệt theo T17. Cần trước: T01                   | —         |
| T19 API lưu build và thêm vào giỏ BE / Khó / 10 giờ          | 08/10 đến 09/10 | Tạo/xem/sửa/xóa build của chủ sở hữu; tính tổng từ catalog. Thêm các món cần mua vào giỏ, kiểm tra giá/kho; tích hợp T20 trước khi hoàn tất. Cần trước: T17, T11, T18  | —         |
| T20 CompatibilityService BE / Khó / 10 giờ                   | 08/10 đến 09/10 | Kiểm tra socket, RAM, form factor, GPU/cooler với case và nguồn theo rule đã chốt. Trả lỗi cụ thể từng linh kiện; thiếu spec là UNKNOWN, kèm test. Cần trước: T17, T18 | —         |
| T21 Giao diện PC Builder FE / Khó / 12 giờ                   | 07/10 đến 10/10 | Chọn 8 nhóm linh kiện, thấy giá/tổng và kết quả rule. Lưu/sửa/xóa/thêm giỏ, xử lý build thiếu món; nối T19/T20 trước khi hoàn thành. Cần trước: T16                    | —         |
| T22 Kiểm thử Builder QA / Vừa / 8 giờ                        | 09/10 đến 10/10 | Chuẩn bị ca từ bộ spec; chạy trên T19/T20/T21 khi có bản tích hợp. Thử build đúng/sai/thiếu dữ liệu, quyền sở hữu và giá/kho thay đổi. Cần trước: T18                  | —         |
| T23 Ghép Builder vào luồng mua hàng Tích hợp / Khó / 6 giờ   | 10/10 đến 10/10 | Build hợp lệ → giỏ → checkout → đơn; giỏ khớp số lượng/tổng. Chạy lại CORE sau khi thêm Builder và chốt ngừng nhận tính năng mới. Cần trước: T19, T20, T21, T22        | —         |

Tổng công sức nhóm task giai đoạn 3: 62 giờ công. Người nhận ghi tên trên Plane; cộng tác viên được ghi trong mô tả task.

Chốt M3 cuối 10/10: Builder qua T23 và CORE không bị hỏng. Chỉ demo những rule đã có test; nếu còn thiếu, ghi rõ giới hạn trong báo cáo. Từ 11/10 tập trung sửa lỗi và kiểm tra lại.

### GIAI ĐOẠN 4 KIỂM THỬ VÀ CHUẨN BỊ BÁO CÁO

**11/10 đến 13/10**

Ngừng nhận chức năng mới sau M3. T27 viết báo cáo từ 08/10, hoàn thiện bằng ảnh và sơ đồ của bản tích hợp. T25 dành cho sửa lỗi đã phát hiện; phát sinh lớn dùng quỹ dự phòng.

| Task và công sức                                             | Thời gian       | Đầu ra và điều kiện hoàn thành                                                                                                                                                  | Nhận việc |
| ------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| T24 Kiểm thử tổng thể và quyền QA BE / Khó / 8 giờ           | 11/10 đến 11/10 | Thử request trái quyền, đơn người khác, 2 người mua tồn cuối, gửi checkout lặp, input sai. Thử màn hình nhỏ và lỗi API; lập danh sách lỗi theo mức độ. Cần trước: T23           | —         |
| T25 Sửa lỗi và kiểm thử lại FE BE QA / Khó / 12 giờ          | 11/10 đến 12/10 | Ưu tiên lỗi chặn demo, sai tiền/kho/quyền. Mỗi lỗi có bước tái hiện và người kiểm tra lại; không thêm feature ngoài kế hoạch. Cần trước: T24                                    | —         |
| T26 Chuẩn bị môi trường demo Môi trường QA / Vừa / 6 giờ     | 11/10 đến 12/10 | Clone mới theo README, dựng DB/seed và chạy frontend/backend. Lưu script phục hồi dữ liệu demo; chuẩn bị máy dự phòng, không đưa secret vào báo cáo. Cần trước: T23             | —         |
| T27 Hoàn thiện báo cáo và slide Tài liệu / Vừa / 10 giờ      | 08/10 đến 12/10 | Viết phần mục tiêu, stack, ERD, luồng và đóng góp; bổ sung Builder sau T23. Ảnh minh chứng từ bản chạy thật; tài liệu khớp chức năng thực hiện. Cần trước: T16                  | —         |
| T28 Diễn tập báo cáo cả nhóm Nhóm / Vừa / 10 giờ             | 13/10 đến 13/10 | Cả 5 người tập 2 giờ/người: demo hai luồng, giải thích Servlet/Service/DAO/JPA, transaction và rule; kiểm tra tài khoản, dữ liệu và kịch bản dự phòng. Cần trước: T25, T26, T27 | —         |
| T29 Chốt bản nộp và bàn giao nội bộ Tài liệu QA / Dễ / 4 giờ | 13/10 đến 13/10 | Chốt mã nguồn và hướng dẫn chạy, schema/seed, báo cáo, slide, kết quả test và danh sách giới hạn. Đối chiếu mục nộp với yêu cầu môn, lưu bản dự phòng. Cần trước: T28           | —         |

Tổng công sức nhóm task giai đoạn 4: 50 giờ công. Người nhận ghi tên trên Plane; cộng tác viên được ghi trong mô tả task.

## III TIÊU CHÍ NGHIỆM THU VÀ BÁO CÁO

| Hạng mục              | Bằng chứng hoàn thành                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản và quyền    | Đăng ký/login/logout; thử email trùng, request chưa login, Customer gọi API Admin và truy cập đơn/build của người khác. Kết quả server đúng quyền.                                |
| Catalog và giỏ        | Danh sách/chi tiết lấy từ DB; filter đúng; thêm/đổi/xóa số lượng; giỏ mỗi user độc lập và tổng tiền khớp dữ liệu backend.                                                         |
| Checkout và đơn       | Tạo đơn COD thành công; lỗi kho làm rollback; giá/địa chỉ đơn cũ giữ nguyên khi catalog thay đổi. Hai người mua tồn cuối không làm âm kho; request lặp không tạo/trừ kho hai lần. |
| Admin                 | Quản lý sản phẩm và chuyển trạng thái đơn theo quy tắc T01. Chỉ ADMIN được thao tác; thay đổi có thể thấy ở tài khoản khách tương ứng.                                            |
| Builder               | Chọn đủ linh kiện, lưu/sửa/xóa đúng chủ sở hữu, tính giá hiện hành; thêm giỏ đúng sản phẩm/số lượng rồi checkout được.                                                            |
| Compatibility         | Ít nhất 2 cấu hình hợp lệ và ca sai từng nhóm rule; thiếu dữ liệu không trả PASS. Nêu rõ rule nào được kiểm tra và giới hạn nào chưa hỗ trợ.                                      |
| Chạy lại và giao diện | Thành viên khác clone/dựng DB/seed/chạy theo README; các màn hình chính không vỡ ở desktop và điện thoại; có báo tải/lỗi/rỗng.                                                    |
| Điều kiện chốt        | Không còn lỗi chặn hai luồng demo hoặc lỗi sai tiền, âm kho, trái quyền đã phát hiện. Lỗi nhỏ còn lại có danh sách và ảnh hưởng; không cam kết tải lớn hay SLA vận hành.          |

### Kịch bản báo cáo

Luồng 1: đăng nhập Customer → tìm/lọc sản phẩm → xem chi tiết → giỏ → checkout COD → xem đơn; chuyển sang Admin xử lý trạng thái rồi kiểm tra lại phía khách.

Luồng 2: chọn linh kiện trong Builder → cố ý tạo một trường hợp không tương thích → đọc lý do → sửa đúng → lưu build → thêm giỏ → đặt hàng. Giải thích rằng backend xác nhận giá, tồn kho và compatibility.

Mỗi thành viên trình bày phần mình thực hiện và một bằng chứng cụ thể: PR, ca kiểm thử, dữ liệu đã kiểm chứng hoặc phần tài liệu. Người ít code vẫn cần hiểu luồng chính và giải thích được đóng góp của mình.

### Bộ tài liệu và bản nộp

Chuẩn bị mã nguồn bản ổn định; README chạy dự án; tài liệu scope/architecture/data-model/API; ERD và class diagram khớp phiên bản thực hiện; migration và seed; báo cáo môn học; slide; checklist test, danh sách lỗi còn lại và kịch bản demo. Đây là bộ chuẩn bị nội bộ, cần đối chiếu hình thức nộp cuối cùng khi giảng viên thông báo.

### Cách kiểm soát trễ tiến độ

| Tình huống                     | Xử lý                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task chưa có người nhận        | Rà soát mỗi ngày, nhận việc chặn luồng trước. Task khó ghép cặp; người phụ trách bảo đảm phần được ghép vào hệ thống.                                      |
| Môi trường hoặc API lệch nhau  | Ưu tiên T01–T03 và README dùng chung. Chốt DTO trước; ghép frontend/backend hằng ngày, không chờ cuối đợt.                                                 |
| Thiếu spec hoặc rule chưa chắc | Giới hạn catalog demo ở sản phẩm có thông số xác thực; thiếu dữ liệu trả UNKNOWN. Không dùng thông số tự đoán để qua test.                                 |
| CORE hoặc Builder trễ          | Dùng quỹ dự phòng, dừng việc trang trí và mọi chức năng ngoài mục tiêu. Nếu vẫn không đạt, nhóm xác nhận lại phạm vi báo cáo; ghi rõ phần chưa hoàn thành. |
| Lỗi gần ngày báo cáo           | Ưu tiên tiền/kho/quyền và hai luồng demo. Giữ bản đã chạy ổn cùng seed phục hồi và máy dự phòng; dành ngày 13/10 để diễn tập.                              |

Cơ sở lập kế hoạch: quyết định của nhóm ngày 30/09/2026 về CORE + PC Builder/Compatibility; Page 4 Thiết kế hệ thống ClassDiagram ERD cho nghiệp vụ; Page BE cho Servlet, JPA, DAO và công nghệ backend. Các ngày là mục tiêu nội bộ trong 14 ngày, chưa phải hạn nộp chính thức do giảng viên xác nhận.
