# PC Recommendation

Nhánh `feat/pc-recommendation` tạo từ `develop` theo yêu cầu người dùng. Không gán mã T39 và không thay đổi các Work Item T01–T38. Tính năng ADVANCED này được triển khai riêng sau Builder.

## Phạm vi và luồng

Khách đăng nhập → `/recommendation` → bảng câu hỏi → POST trả 202 → FE poll GET → một cấu hình hoặc lý do thất bại. Một bộ gồm 8 nhóm, mỗi nhóm một sản phẩm/kit, GPU rời và tản khí. Chưa hỗ trợ linh kiện sở hữu, nhiều kit RAM/ổ đĩa, ưu tiên hãng/ngoại hình/Wi-Fi hay benchmark. Khách vẫn chỉnh thủ công sau khi sao chép sang Builder.

AI chỉ nhận câu trả lời (ngân sách, mục đích, công việc, phần mềm/website, game, mục tiêu độ phân giải/FPS, dung lượng). Không gửi catalog, tài khoản, email hoặc dữ liệu đơn hàng. Dùng Gemini `generateContent`, JSON Schema và kiểm tra DTO tại backend; nội dung nhập tự do là dữ liệu, không phải chỉ dẫn cho model.

Tiêu chí cho phép: CPU cores/threads; GPU vramGb; RAM capacityGb/speedMhz; STORAGE capacityGb/readSpeedMBps/writeSpeedMBps. Không nhận socket, công suất PSU hoặc kích thước từ AI. Mỗi tiêu chí có minimum/preferred nguyên dương, preferred >= minimum. BE áp dụng dung lượng tối thiểu khách nhập ngay cả khi AI đề xuất thấp hơn. Tiêu chí chỉ là heuristic; không cam kết FPS hoặc hiệu năng tốt nhất.

## Tìm kiếm

- Đọc catalog một lượt trước tìm kiếm; không truy vấn DB trong DFS. Không cắt top-k ứng viên nên giữ được các nền tảng khác nhau.
- Thứ tự: CPU → mainboard → RAM → GPU → storage → cooler → case → PSU. Giá giảm dần, ID tăng dần giúp thứ tự ổn định.
- Lượt PREFERRED áp dụng toàn bộ mức mong muốn. Chỉ khi lượt này kết thúc không có kết quả mới tìm MINIMUM. Nếu lượt PREFERRED hết giới hạn mà chưa tìm được, báo SEARCH_LIMIT; không khẳng định không tồn tại phương án mong muốn.
- DFS quay lui, cắt nhánh khi FAIL, vượt ngân sách, cận dưới phần còn thiếu vượt tiền hoặc cận trên không thể cải thiện kết quả đã có. UNKNOWN của cấu hình dở dang không bị xem như FAIL. Cấu hình hoàn chỉnh bắt buộc PASS.
- Mỗi lượt tối đa 200.000 nút hoặc 2 giây, có kiểm tra interrupt. Tổng tối đa hai lượt. Giữ một best-so-far trong bộ nhớ; mục tiêu là tổng tiền lớn nhất không vượt ngân sách, không chấm điểm hiệu năng hoặc phân hạng sản phẩm. Hòa giá giữ bộ gặp trước.
- Kết quả có searchLimited để chỉ rõ phạm vi tối ưu; NO_MATCH không khẳng định nhu cầu luôn cần ngân sách cao hơn ở nơi khác.
- Trước khi lưu, khóa và đọc lại giá/kho/spec, chạy CompatibilityService bằng ID thật. Có thay đổi thì CATALOG_CHANGED, không lưu kết quả cũ. Không giữ tồn kho.

PASS chỉ xác nhận các rule của T23, không xác nhận BIOS/chipset, đầu nguồn, cổng ổ đĩa hoặc điện năng toàn hệ thống. Các cấu hình tản nước chưa đạt rule lắp case nên không được chấp nhận.

## Persistence và vòng đời

Flyway V11 thêm recommendation_requests, recommendation_request_purposes, recommendation_attempts, recommendation_results. SQL nằm trong DAO và thực thi bằng JPA EntityManager; PcBuild/PcBuildItem dùng entity hiện có. Không đổi migration cũ.

Request lưu từng trường câu trả lời và bảng con purpose. Bản đầu bỏ DRAFT, tạo thẳng QUEUED; → PROCESSING → SUCCEEDED/FAILED. Một request có một attempt (attemptNo=1); retry tạo request mới. Attempt RUNNING tính cả thời gian chờ worker; → ACCEPTED, REJECTED (không tìm được), ERROR (AI/lỗi xử lý). Criteria JSON là bản ghi kiểm toán đầu ra AI, không thay quan hệ sản phẩm/purpose bằng JSON. Không lưu API key hoặc raw provider response.

Một ACCEPTED có một Result và build RECOMMENDATION. Lưu build/result và kết thúc request trong cùng transaction. Result giữ estimatedTotal bất biến; GET trả thêm giá/spec/khả dụng hiện tại. Build gợi ý không sửa/xóa qua API MANUAL. Copy tạo build MANUAL trong danh sách Builder; thêm giỏ dùng endpoint riêng và kiểm tra lại toàn bộ, không idempotent.

Một yêu cầu đang chạy/user, cách lượt gửi ít nhất 30 giây. Worker pool 2, hàng chờ 4. Không giữ transaction hoặc EntityManager khi gọi AI. HTTP timeout 35 giây. Công việc bị dừng do restart/quá hạn 3 phút được kết thúc ERROR khi GET hoặc POST kế tiếp của chủ yêu cầu; không tự gọi lại AI và không để kết quả đến muộn ghi đè FAILED. Phù hợp một backend instance cho bản đầu; chưa có durable queue hoặc tác vụ khôi phục phân tán.

## API

Hợp đồng đầy đủ trong [OpenAPI](../backend/src/main/webapp/api-docs/openapi.yaml).

| Method | Endpoint | Kết quả |
| --- | --- | --- |
| POST | `/api/customer/recommendations` | 202 requestId/status |
| GET | `/api/customer/recommendations/{id}` | Trạng thái, answers, criteria, result hoặc failure |
| POST | `/api/customer/recommendations/{id}/cart` | Giỏ hiện tại, giá/kho được kiểm tra lại |
| POST | `/api/customer/recommendations/{id}/copy` | 201 bản sao MANUAL |

CUSTOMER session bắt buộc; khác chủ trả 404. Body tối đa 16 KiB; trường lạ, sai kiểu số, tiêu chí AI bất hợp lệ bị từ chối. Lỗi provider không lộ response gốc/key. Các request GET trả no-store. Giao diện giữ ID trong URL để tải lại kết quả sau refresh và không hiển thị kết quả của phiên tài khoản khác.

## Cấu hình Gemini

1. Tạo API key tại [Google AI Studio](https://aistudio.google.com/apikey). Chọn model có Structured Outputs và quota phù hợp trong project của bạn; không mặc định tất cả model đều miễn phí.
2. Thêm vào `.env` **ở gốc repo** nếu chạy Docker Compose, giữ nguyên các biến khác:

```dotenv
AI_RECOMMENDATION_ENABLED=true
GEMINI_API_KEY=your-local-key
GEMINI_MODEL=your-supported-model-id
```

3. Chạy lại backend qua `docker compose up --build`. Nếu chạy Java/Tomcat trực tiếp, đặt ba biến trên trong environment của tiến trình; Java không tự đọc `.env`. Railway dùng Variables của backend rồi redeploy. Frontend local mặc định gọi backend Railway theo README; muốn thử code nhánh này hãy chạy stack local.
4. Không đặt key trong frontend/.env.local hoặc NEXT_PUBLIC_*, không gửi key vào chat, không commit `.env`. Mặc định feature tắt; chưa cấu hình trả AI_NOT_CONFIGURED, không trả kết quả giả.

Tham khảo chính thức: [generateContent](https://ai.google.dev/api/generate-content), [Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output), [giá/quota model](https://ai.google.dev/gemini-api/docs/pricing). Free tier có thể dùng nội dung để cải thiện dịch vụ; form nhắc khách không gửi dữ liệu cá nhân/nhạy cảm.

## Kiểm thử

- `mvn -B test` trong backend: thuật toán, validation, HTTP provider với server giả lập, Servlet và hồi quy.
- `mvn -B -Pdb-test verify` với PostgreSQL test riêng theo [testing.md](testing.md): migration, quyền, vòng đời request, snapshot/copy/cart và các module hiện có.
- `node --experimental-strip-types --test`, `npm run lint`, `npm run build` trong frontend.
- `frontend/tests/recommendation-ui.py`: Playwright với API fixture; không thay thế nghiệm thu Gemini thật. Cần Playwright và Edge, Next local ở cổng 3011 hoặc QA_BASE_URL.

Chưa nghiệm thu Gemini thật nếu chưa có key/model/quota. Kiểm tra thực tế cần dùng vài hồ sơ nhu cầu trên catalog đã nhập đủ spec và xác nhận chất lượng tiêu chí. Không báo hoàn tất nghiệm thu AI chỉ dựa trên fixture.
