# KẾ HOẠCH TRIỂN KHAI DỰ ÁN WEBSITE PC STORE

> Đây là bản kế hoạch T01–T38 tại thời điểm lập kế hoạch, giữ để tra cứu phạm vi và phụ thuộc của từng task. Trạng thái Work Item hiện tại theo dõi trên Plane; [mục lục tài liệu](README.md) tóm tắt thứ tự CORE → FEATURE → ADVANCED. Các mô tả triển khai trong file này không tự xác nhận tính năng đã hoàn thành.

**Thời gian 30/09/2026 đến hết 13/10/2026**

Nhóm 5 thành viên | 14 ngày | 4–5 giờ mỗi người mỗi ngày

**Cập nhật T03 (01/10/2026):** đã triển khai 12 bảng CORE theo [data-model](data-model.md), Flyway V2 tiếp nối V1, entity JPA, PK/FK/UNIQUE/CHECK và index. Maven WAR build và 6 integration test PostgreSQL 17 đã qua, gồm nâng V1 có dữ liệu và lưu/đọc JPA. Đây là hoàn tất phần schema/mapping T03 trong repo; API nghiệp vụ và các bảng FEATURE/ADVANCED thuộc task sau. Chưa cập nhật trạng thái Work Item trên Plane trực tiếp.

**Kế hoạch theo điều kiện hoàn thành, không ấn định thời hạn hai tuần.** T01–T03 đã khởi động được giữ nguyên nội dung và mốc gốc; các task từ T05 trở đi không gắn ngày cứng. Giữ mã T05–T38 để không làm lệch task đang theo dõi trên Plane. Nhóm 5 người nhận task theo owner, ghi người phụ trách trên Plane và mở issue lỗi riêng khi kiểm thử.

Mục tiêu: hoàn thiện CORE mua hàng, PC Builder với compatibility cơ bản, Product Review và Setup Community; có bản chạy lại được, kiểm thử và báo cáo khớp chức năng thực tế.

## I. Công nghệ và phạm vi

**Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui; giao diện khách, Admin, Builder, Review và Community.

**Backend:** Java 21, Servlet, Tomcat 10.1, Maven; Service/DAO xử lý nghiệp vụ, quyền và transaction.

**Dữ liệu:** JPA/Hibernate và PostgreSQL; migration/seed dùng chung.

**Đăng nhập:** HttpSession, Cookie, Servlet Filter cho CUSTOMER/ADMIN.

**Làm việc nhóm:** Git/GitHub, Plane; review PR và README chạy lại được.

**Kiểm thử:** nghiệp vụ Java, API, UI; ưu tiên tiền, kho, quyền, media và bốn luồng chính.

Giữ Servlet + JPA + DAO, PostgreSQL và Next.js theo kế hoạch hiện tại. [Mô hình dữ liệu](data-model.md) đã thiết kế Review và Setup Community; các task triển khai dùng thiết kế này làm đầu vào. Endpoint/DTO và mã lỗi được xác định trong task API tương ứng, thống nhất với FE và QA trước khi tích hợp.

### Phạm vi chính

**CORE:** tài khoản và quyền, catalog/tìm lọc, giỏ, checkout COD, đơn, Admin sản phẩm/tồn/đơn. Đơn DELIVERED là điều kiện đầu vào cho Review và Setup. Địa chỉ demo nhập văn bản; không cần thanh toán online thật.

**Builder:** chọn 8 nhóm linh kiện, tính tổng, lưu/sửa/xóa, kiểm tra tương thích cơ bản và mua qua giỏ. Bản đầu ưu tiên cấu hình mua mới (ownedQuantity=0); giới hạn này vẫn cần nhóm chốt theo T01, không tự thay đổi thiết kế tổng thể. Thiếu spec trả UNKNOWN; không tuyên bố kiểm tra BIOS, đầu cắm hoặc radiator.

**Review:** khách đánh giá đúng dòng hàng của đơn DELIVERED; sao, nội dung, ảnh/video theo giới hạn server, sửa/xóa mềm, tim, thống kê sao, lọc/sắp xếp và Admin ẩn/khôi phục. Một bài cho mỗi OrderItem, kể cả mua số lượng nhiều. Chưa có bình luận hoặc phản hồi shop.

**Setup Community:** khách có ít nhất một đơn DELIVERED đăng setup có ảnh và sản phẩm liên quan; feed/chi tiết công khai, like, ranking, liên kết sản phẩm về catalog/giỏ và Admin kiểm duyệt. Không triển khai chat/follow/friend/livestream.

AI Recommendation, Promotion và Warranty nằm ngoài phạm vi triển khai này. Media dùng chung chỉ phục vụ ảnh setup và ảnh/video review theo yêu cầu của hai module; chưa làm hệ quản trị media độc lập.

## II. Cách chia giai đoạn và bàn giao

Giai đoạn là cổng phụ thuộc, không phải lịch ngày. Các task cùng giai đoạn có ranh giới mã và người sở hữu riêng; frontend có thể dùng fixture trước, còn kết nối thật và nghiệm thu đặt ở giai đoạn tích hợp. Một owner duy nhất quản lý migration (T10) và dịch vụ media (T21) để tránh sửa trùng.

### Giai đoạn 0 — Công việc đã bắt đầu, giữ nguyên

Ba task dưới đây được chép nguyên nội dung, thời gian gốc và điều kiện hoàn thành từ kế hoạch trước.

| Task và công sức                                        | Thời gian gốc   | Đầu ra và điều kiện hoàn thành                                                                                                                                           | Nhận việc |
| ------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| T01 Chốt phạm vi và hợp đồng chung Nhóm / Vừa / 5 giờ   | 30/09 đến 30/09 | Chốt COD cho bản demo, lọc tên/danh mục/brand/giá, trạng thái đơn, quy tắc tồn kho và API JSON. Có danh sách endpoint/DTO cho từng người làm song song. Cần trước: Không | —         |
| T02 Dựng backend và môi trường chạy BE / Khó / 10 giờ   | 30/09 đến 01/10 | Maven WAR chạy trên Tomcat 10.1; Servlet trả JSON, JPA kết nối PostgreSQL. README ghi cách chạy; một máy khác thử được. Cần trước: T01                                   | —         |
| T03 ERD CORE và migration đầu tiên DB BE / Khó / 10 giờ | 30/09 đến 01/10 | Chốt User, Product, Category, Brand, Inventory, Cart/Item, Order/Item và Payment tối thiểu. Có khóa/ràng buộc, script tạo schema và mapping JPA. Cần trước: T01          | —         |

### Giai đoạn 1 — Nền tảng song song

Mỗi task sở hữu một khu vực rõ ràng: catalog, auth, giao diện tương ứng, dữ liệu và migration mở rộng. FE dùng DTO đã chốt và chỉ đánh dấu hoàn thành sau tích hợp.

#### T05 API catalog và tìm kiếm

**Owner / phạm vi mã:** BE catalog

**Việc cần làm:** Làm danh sách phân trang, chi tiết, lọc tên/danh mục/brand/giá; chỉ trả sản phẩm được phép bán và DTO công khai.

**Điều kiện hoàn thành:** Có ca sản phẩm không tồn tại, bộ lọc kết hợp và phân trang ổn định.

**Cần trước:** T02, T03, T01

#### T06 API đăng ký, đăng nhập và quyền

**Owner / phạm vi mã:** BE auth

**Việc cần làm:** Hash mật khẩu, HttpSession, logout, Filter CUSTOMER/ADMIN; kiểm tra email trùng và cookie giữa Next.js–Tomcat.

**Điều kiện hoàn thành:** Request chưa đăng nhập hoặc sai quyền bị chặn tại server.

**Cần trước:** T02, T03

#### T07 Giao diện catalog và chi tiết

**Owner / phạm vi mã:** FE catalog

**Việc cần làm:** Dựng danh sách, tìm/lọc, chi tiết, trạng thái tải/rỗng/lỗi và bố cục điện thoại theo DTO mẫu; giữ mã ở khu vực catalog FE.

**Điều kiện hoàn thành:** Các trạng thái và điều hướng chạy với fixture; nối API thật ở T20.

**Cần trước:** T01

#### T08 Giao diện tài khoản và phiên đăng nhập

**Owner / phạm vi mã:** FE auth

**Việc cần làm:** Dựng form đăng ký/đăng nhập, logout, giữ phiên và phản hồi lỗi theo DTO mẫu; giữ mã ở khu vực auth FE.

**Điều kiện hoàn thành:** Luồng UI/fixture và thông báo lỗi đầy đủ; nối API thật ở T20.

**Cần trước:** T01

#### T09 Dữ liệu mẫu catalog có nguồn

**Owner / phạm vi mã:** Dữ liệu

**Việc cần làm:** Chuẩn bị tối thiểu 30–40 SKU, ảnh/URL, giá demo, danh mục, brand và thông số linh kiện có nguồn; bàn giao file seed nhất quán với T03.

**Điều kiện hoàn thành:** Seed chạy lại được, có sản phẩm đủ cho mua hàng và Builder.

**Cần trước:** T01, T03

#### T10 Migration mở rộng Builder, Review và Setup

**Owner / phạm vi mã:** DB owner

**Việc cần làm:** Từ migration T03, bổ sung PcBuild/Item/Spec, ProductReview/ReviewMedia/ReviewLike, SetupPost/Image/Product/Like; FK, UNIQUE, CHECK, index và trạng thái. Mỗi thay đổi schema của ba module đi qua task này để tránh hai người sửa cùng migration.

**Điều kiện hoàn thành:** Migration lên/xuống trên DB mới; UNIQUE review theo OrderItem, like theo user+bài và quan hệ chủ sở hữu được kiểm thử.

**Cần trước:** T03

#### T11 Bộ fixture và ca kiểm thử liên module

**Owner / phạm vi mã:** QA / dữ liệu

**Việc cần làm:** Viết fixture user, admin, sản phẩm, đơn PENDING/DELIVERED/CANCELLED, build đúng/sai, bài review/setup công khai/ẩn; checklist cho từng quyền.

**Điều kiện hoàn thành:** Các module có dữ liệu dùng chung và ca âm để kiểm thử mà không tự tạo dữ liệu mâu thuẫn.

**Cần trước:** T09, T10

### Giai đoạn 2 — Luồng mua hàng CORE

BE tách Product/Cart/Order; FE tách Admin/Cart/Order. Mỗi nhánh làm theo hợp đồng và mock trước; việc nối các nhánh đặt ở T20.

#### T12 API Admin quản lý sản phẩm và tồn

**Owner / phạm vi mã:** BE product admin

**Việc cần làm:** Thêm/sửa/ẩn sản phẩm, chỉnh tồn có kiểm tra giá/số lượng và quyền ADMIN; không xóa cứng SKU đã có trong đơn.

**Điều kiện hoàn thành:** Thay đổi từ Admin hiện ở catalog; request CUSTOMER bị từ chối.

**Cần trước:** T05, T06

#### T13 API giỏ hàng

**Owner / phạm vi mã:** BE cart

**Việc cần làm:** Xem giỏ riêng, thêm/gộp dòng, đổi/xóa số lượng; backend tính giá và từ chối số lượng không hợp lệ.

**Điều kiện hoàn thành:** Giỏ hai user độc lập; không tin giá client gửi.

**Cần trước:** T05, T06

#### T14 API checkout, đơn và trạng thái giao

**Owner / phạm vi mã:** BE order

**Việc cần làm:** Tạo đơn COD từ giỏ theo hợp đồng, snapshot giá/địa chỉ, kiểm tra kho trong transaction, chống request lặp; API đơn theo chủ sở hữu và Admin chuyển trạng thái đến DELIVERED. Ghi deliveredAt một lần; trạng thái hủy không đủ điều kiện Review/Setup.

**Điều kiện hoàn thành:** Không âm kho/đơn trùng; đơn người khác bị chặn; trạng thái DELIVERED dùng được cho module sau.

**Cần trước:** T03, T06, T01

#### T15 Giao diện Admin sản phẩm và tồn

**Owner / phạm vi mã:** FE admin catalog

**Việc cần làm:** Form và danh sách thêm/sửa/ẩn sản phẩm, chỉnh tồn, báo lỗi hợp lệ; chỉ hiển thị với Admin.

**Điều kiện hoàn thành:** Dùng fixture; nối API thật ở T20; và thử API sai quyền.

**Cần trước:** T07, T08

#### T16 Giao diện giỏ và checkout COD

**Owner / phạm vi mã:** FE cart/checkout

**Việc cần làm:** Xem/đổi/xóa giỏ, nhập địa chỉ văn bản, xác nhận giá COD, chặn gửi lặp và hiển thị lỗi kho/giá.

**Điều kiện hoàn thành:** Dùng fixture; nối API thật ở T20; sau đặt hàng có mã đơn và giỏ được cập nhật.

**Cần trước:** T07, T08

#### T17 Giao diện đơn của khách

**Owner / phạm vi mã:** FE customer order

**Việc cần làm:** Danh sách/chi tiết đơn và trạng thái; có vị trí để mở Review cho sản phẩm thuộc đơn DELIVERED ở giai đoạn sau.

**Điều kiện hoàn thành:** Dùng fixture; nối API thật ở T20; khách không xem được đơn của người khác.

**Cần trước:** T08

#### T18 Giao diện Admin xử lý đơn

**Owner / phạm vi mã:** FE admin order

**Việc cần làm:** Danh sách/chi tiết đơn, chuyển trạng thái theo quy tắc đã chốt, hiển thị lỗi chuyển sai và trạng thái giao.

**Điều kiện hoàn thành:** Dùng fixture; nối API thật ở T20; DELIVERED phản ánh trên đơn khách.

**Cần trước:** T08

#### T19 Kiểm thử nghiệp vụ CORE theo contract

**Owner / phạm vi mã:** QA core

**Việc cần làm:** Chuẩn bị test giá/kho/quyền, hai người mua tồn cuối, checkout lặp và vòng đời PENDING→DELIVERED/CANCELLED trên API và UI.

**Điều kiện hoàn thành:** Lập danh sách lỗi có bước tái hiện; làm dữ liệu đầu vào cho T20.

**Cần trước:** T11

### Giai đoạn 3 — Tích hợp CORE và hạ tầng dùng chung

Ba task độc lập: T20 nối mua hàng, T21 sở hữu hạ tầng media, T22 sở hữu dữ liệu/rule Builder. Đây là cổng trước khi ba module chức năng chạy song song.

#### T20 Ghép và nghiệm thu CORE

**Owner / phạm vi mã:** Tích hợp / QA

**Việc cần làm:** Nối T12–T18 trên API thật, chạy các ca T19; sửa lỗi chặn, xác nhận trạng thái DELIVERED, snapshot giá/kho/quyền và dữ liệu đơn cho Review/Setup.

**Điều kiện hoàn thành:** Mua hàng từ catalog đến DELIVERED hoạt động; lỗi chặn được đóng hoặc ghi rõ.

**Cần trước:** T12–T19

#### T20-B Cổng thanh toán trực tuyến VNPay và đối soát

**Owner / phạm vi mã:** BE payment & FE checkout/admin

**Việc cần làm:** Tích hợp cổng thanh toán trực tuyến VNPay Sandbox; quy định thời hạn thanh toán 15 phút; lưu trữ `payment_attempts`; chuyển trạng thái `EXPIRED_PENDING_RECONCILIATION`; xử lý IPN và QueryDR đối soát; bảo vệ giữ chỗ tồn kho; cập nhật giao diện khách hàng và Admin.

**Điều kiện hoàn thành:** Mọi trạng thái xác định được quyền thanh toán, quyền giao hàng và giữ/nhả kho; IPN và QueryDR ghi nhận tiền chính xác; không làm ảnh hưởng luồng COD; hoàn thành kiểm thử nghiệm thu.

**Cần trước:** T20


#### T21 Dịch vụ media dùng chung

**Owner / phạm vi mã:** BE media

**Việc cần làm:** Tạo hợp đồng upload xác thực cho ảnh setup và ảnh/video review; kiểm tra định dạng thực, khả năng giải mã, kích thước/số lượng/thời lượng; lưu tạm rồi xác nhận, dọn tệp mồ côi. Tách namespace/quyền theo module.

**Điều kiện hoàn thành:** Không công khai file của bài chưa hợp lệ/đã ẩn; tệp lỗi bị từ chối và dọn được.

**Cần trước:** T10

#### T22 Spec và bộ linh kiện kiểm thử Builder

**Owner / phạm vi mã:** Dữ liệu / QA Builder

**Việc cần làm:** Chuẩn bị CPU/main/RAM/GPU/SSD/PSU/case/cooler có nguồn, ít nhất hai build hợp lệ và ca sai từng rule; xác định PASS/FAIL/UNKNOWN.

**Điều kiện hoàn thành:** Seed và expected result để T23/T24 cùng dùng; thiếu spec không thành PASS.

**Cần trước:** T09, T10

### Giai đoạn 4 — Ba nhánh chức năng song song

Builder, Review và Community có owner/module riêng. FE dùng fixture và DTO thống nhất với API từng module; chỉ nối thật ở giai đoạn 5. Không sửa schema chung hay media service trong nhánh riêng nếu chưa thống nhất với owner T10/T21.

#### T23 CompatibilityService

**Owner / phạm vi mã:** BE Builder rules

**Việc cần làm:** Kiểm tra socket CPU/main/cooler, RAM type/số thanh/dung lượng, form factor, kích thước GPU/cooler và công suất nguồn; trả PASS/FAIL/UNKNOWN kèm lý do từng rule.

**Điều kiện hoàn thành:** Test đủ bộ đúng/sai/thiếu spec T22; không tuyên bố kiểm tra BIOS/đầu cắm/radiator.

**Cần trước:** T10, T22

#### T24 API lưu build và thêm vào giỏ

**Owner / phạm vi mã:** BE Builder API

**Việc cần làm:** Tạo/xem/sửa/xóa build theo chủ sở hữu; tính giá từ catalog, thêm linh kiện cần mua vào giỏ, kiểm tra tồn và số lượng. Dùng contract T23, nối rule ở T32.

**Điều kiện hoàn thành:** Không đọc/sửa build người khác; giỏ chứa đúng SKU/số lượng/giá.

**Cần trước:** T10, T13, T22

#### T25 Giao diện PC Builder

**Owner / phạm vi mã:** FE Builder

**Việc cần làm:** Chọn 8 nhóm linh kiện, xem tổng giá và từng kết quả rule, lưu/sửa/xóa/thêm giỏ; xử lý build thiếu món và trạng thái tải/lỗi.

**Điều kiện hoàn thành:** Dùng DTO mẫu; nối T23/T24 tại T30.

**Cần trước:** T07, T08

#### T26 API Review: tạo, sửa, xóa và thống kê

**Owner / phạm vi mã:** BE Review core (ReviewService/DAO)

**Việc cần làm:** Dựa trên data-model.md, xác định DTO/endpoint, mã lỗi và quyền cho Review cùng T27, bàn giao cho FE/QA. Chỉ chủ OrderItem thuộc đơn DELIVERED được tạo một review/dòng; sao 1–5, nội dung hợp lệ, media qua T21, sửa và xóa mềm. Trả danh sách phân trang/lọc/sắp xếp, trung bình sao/phân bố chỉ từ bài PUBLISHED.

**Điều kiện hoàn thành:** Chặn chưa mua/sai SKU/sai chủ/chưa giao/gửi trùng; sửa/xóa cập nhật thống kê.

**Cần trước:** T10, T14, T21

#### T27 API Review: like và kiểm duyệt

**Owner / phạm vi mã:** BE Review social (Like/Moderation)

**Việc cần làm:** Tách endpoint/service cho like/unlike lặp an toàn, một user một tim, cấm tự tim; Admin ẩn bài kèm lý do và khôi phục. Dùng thiết kế Review trong data-model.md và migration T10, thống nhất DTO/endpoint với T26; không sửa ReviewService của T26.

**Điều kiện hoàn thành:** Sai quyền bị chặn; khôi phục cập nhật danh sách/thống kê đúng.

**Cần trước:** T10, T21

#### T28 Giao diện Review trên sản phẩm và đơn

**Owner / phạm vi mã:** FE Review

**Việc cần làm:** Trang sản phẩm hiển thị rating, phân bố sao, list phân trang/lọc sao/có media; trong đơn DELIVERED có form tạo/sửa/xóa review của đúng dòng, upload ảnh/video và trạng thái lỗi.

**Điều kiện hoàn thành:** Dùng DTO/endpoint thống nhất với T26/T27; nối API thật tại T33, không có bình luận/reply.

**Cần trước:** T07, T17

#### T29 API Setup: bài đăng, ảnh và sản phẩm

**Owner / phạm vi mã:** BE Community post (SetupService/DAO)

**Việc cần làm:** Dựa trên data-model.md, xác định DTO/endpoint, mã lỗi và quyền cho Setup cùng T30, bàn giao cho FE/QA. Chỉ user có ít nhất một đơn DELIVERED được đăng setup; bài có ít nhất một ảnh, nội dung và Product từ catalog; chủ bài sửa/xóa, guest xem bài PUBLISHED. Media dùng T21.

**Điều kiện hoàn thành:** Chặn chưa mua, bài thiếu ảnh, SKU không hợp lệ, sửa bài người khác; bài ẩn không công khai.

**Cần trước:** T10, T14, T21

#### T30 API Setup: like, ranking và kiểm duyệt

**Owner / phạm vi mã:** BE Community social (Like/Ranking/Moderation)

**Việc cần làm:** Tách endpoint/service like/unlike idempotent, ranking chỉ tính bài PUBLISHED và Admin ẩn/khôi phục kèm lý do; liên kết sản phẩm về catalog/cart. Dùng thiết kế SetupPost trong data-model.md và migration T10, thống nhất DTO/endpoint với T29; không sửa SetupService của T29.

**Điều kiện hoàn thành:** Không đếm trùng like, bài ẩn rời ranking, sai quyền bị từ chối.

**Cần trước:** T10, T21

#### T31 Giao diện Setup Community

**Owner / phạm vi mã:** FE Community

**Việc cần làm:** Feed/chi tiết setup, form đăng/sửa bài với ảnh và sản phẩm liên quan, like/ranking, liên kết từ sản phẩm tới giỏ; màn hình kiểm duyệt Admin.

**Điều kiện hoàn thành:** Dùng DTO/endpoint thống nhất với T29/T30; nối API thật tại T34; guest chỉ xem, user chưa đủ điều kiện thấy lý do không đăng được.

**Cần trước:** T07, T08

### Giai đoạn 5 — Tích hợp và nghiệm thu từng nhánh

Ba luồng được tích hợp và kiểm thử độc lập trên dữ liệu chung; mỗi task có người QA khác người code xác nhận.

#### T32 Ghép và nghiệm thu Builder

**Owner / phạm vi mã:** Tích hợp Builder / QA

**Việc cần làm:** Nối T23/T24/T25, chạy build đúng/sai/thiếu spec → giỏ → checkout → đơn, kiểm tra chủ sở hữu và giá/kho đổi giữa các bước.

**Điều kiện hoàn thành:** Builder mua được mà không làm hỏng CORE; giới hạn rule ghi rõ.

**Cần trước:** T20, T23–T25

#### T33 Ghép và nghiệm thu Review

**Owner / phạm vi mã:** Tích hợp Review / QA

**Việc cần làm:** Nối T26–T28; thử đơn chưa giao, sai chủ/SKU, review trùng, media lỗi, like lặp, ẩn/khôi phục và thống kê sau sửa/xóa.

**Điều kiện hoàn thành:** UI/API cùng trạng thái; không lộ bài/media ẩn và không sai rating.

**Cần trước:** T20, T26–T28

#### T34 Ghép và nghiệm thu Setup Community

**Owner / phạm vi mã:** Tích hợp Community / QA

**Việc cần làm:** Nối T29–T31; thử điều kiện đã mua DELIVERED, ảnh bắt buộc, bài có SKU, feed/ranking/like, quyền chủ bài và kiểm duyệt.

**Điều kiện hoàn thành:** Guest xem công khai; bài ẩn rời feed/ranking, đường dẫn Product→Cart hoạt động.

**Cần trước:** T20, T29–T31

### Giai đoạn 6 — Kiểm thử tổng thể và bàn giao

Chỉ chốt sau khi ba nhánh đạt nghiệm thu; không gắn mốc ngày cố định. Lỗi phát hiện được tạo issue riêng có người nhận và bằng chứng kiểm thử lại.

#### T35 Regression xuyên module và xử lý lỗi

**Owner / phạm vi mã:** QA lead + owner liên quan

**Việc cần làm:** Chạy lại auth, catalog, cart, order, Builder, Review, Community; thử API trái quyền, media riêng tư, hai người mua tồn cuối, checkout lặp, desktop/mobile. Phân lỗi theo mức độ, giao đúng owner và retest.

**Điều kiện hoàn thành:** Không còn lỗi chặn luồng chính hoặc sai tiền/kho/quyền; lỗi nhỏ có danh sách ảnh hưởng.

**Cần trước:** T32–T34

#### T36 README, seed và môi trường demo

**Owner / phạm vi mã:** Môi trường / QA

**Việc cần làm:** Clone mới theo README, dựng DB/migration/seed, cấu hình frontend/backend/media và tài khoản mẫu; lưu kịch bản reset dữ liệu, không đưa secret vào tài liệu.

**Điều kiện hoàn thành:** Một thành viên khác chạy được cả bốn luồng: mua hàng, Builder, Review, Community.

**Cần trước:** T35

#### T37 Báo cáo và slide theo bản chạy thật

**Owner / phạm vi mã:** Tài liệu

**Việc cần làm:** Cập nhật mục tiêu, stack Servlet/JPA/DAO, ERD mở rộng, API/quyền, bốn luồng, test và giới hạn; ảnh minh chứng lấy từ bản tích hợp.

**Điều kiện hoàn thành:** Tài liệu khớp tính năng đã triển khai và phân công đóng góp.

**Cần trước:** T35

#### T38 Diễn tập và chốt bản nộp

**Owner / phạm vi mã:** Cả nhóm

**Việc cần làm:** Diễn tập bốn luồng, câu hỏi transaction/quyền/rule, thử tài khoản và dữ liệu dự phòng; đóng gói mã nguồn, migration/seed, test, README, báo cáo, slide.

**Điều kiện hoàn thành:** Bản nộp mở được trên máy khác; danh sách giới hạn và lỗi còn lại được ghi rõ.

**Cần trước:** T36, T37

## III. Tiêu chí nghiệm thu

**CORE:** catalog từ DB; đăng nhập/quyền đúng; giỏ và COD tạo đơn đúng giá/kho, không đơn trùng; chỉ chủ đơn xem đơn, Admin chuyển trạng thái đúng và deliveredAt đáng tin cậy.

**Builder:** ít nhất hai cấu hình hợp lệ, ca sai và thiếu spec từng rule; build đúng chủ sở hữu, giá/giỏ/checkout khớp, không làm hỏng CORE.

**Review:** chặn chưa mua/chưa giao/sai sản phẩm/sai chủ/trùng OrderItem; sao và media hợp lệ; like idempotent, ẩn/xóa/khôi phục cập nhật danh sách, media và rating đúng.

**Setup Community:** chỉ người có đơn DELIVERED đăng được; ảnh bắt buộc, SKU hợp lệ, feed/ranking chỉ gồm bài công khai, like không đếm trùng, quyền chủ bài/Admin được kiểm thử.

**Bàn giao:** một thành viên khác dựng theo README và chạy đủ bốn luồng; giao diện desktop/điện thoại có trạng thái tải/rỗng/lỗi; báo cáo, slide và danh sách giới hạn khớp bản chạy.
