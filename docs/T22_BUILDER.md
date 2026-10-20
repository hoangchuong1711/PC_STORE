# T22 — dữ liệu và ca kiểm thử PC Builder

T22 bàn giao thông số của 40 sản phẩm mẫu T09 cho các bảng Builder và một bộ đáp án chung cho T23/T24. Dữ liệu sản phẩm, nguồn tra cứu, mã `catalogCode`, SKU và ghi chú xác minh nằm trong [`data/t09_catalog.json`](data/t09_catalog.json). Không dùng thông số giả lập trong fixture để cập nhật catalog.

## Nạp dữ liệu

Trên database test hoặc demo đã chạy Flyway V3 trở lên, chạy `backend/src/main/resources/db/seed/t09_catalog.sql` trước, sau đó chạy `backend/src/main/resources/db/seed/t22_builder_specs.sql`. T22 là seed riêng, không phải migration. Script dừng nếu sản phẩm T09 thiếu, bị trùng tên hoặc brand/category/type khác nguồn; nó chỉ chèn spec chưa có và chạy lặp được. Tạo lại SQL sau khi chỉnh nguồn T09 bằng `python scripts/generate_t22_seed.py`.

Ví dụ sau khi tạo container `pcstore-test-db` theo [`testing.md`](testing.md):

```powershell
docker cp backend/src/main/resources/db/seed/t09_catalog.sql pcstore-test-db:/tmp/t09_catalog.sql
docker cp backend/src/main/resources/db/seed/t22_builder_specs.sql pcstore-test-db:/tmp/t22_builder_specs.sql
docker exec pcstore-test-db psql -U pcstore_test -d pcstore_test -v ON_ERROR_STOP=1 -f /tmp/t09_catalog.sql
docker exec pcstore-test-db psql -U pcstore_test -d pcstore_test -v ON_ERROR_STOP=1 -f /tmp/t22_builder_specs.sql
```

Integration test `BuilderSeedIT` tự tạo schema riêng trong PostgreSQL test và xóa schema đó sau khi chạy. Các lệnh nạp seed thủ công ở trên dùng schema mặc định của container test dùng một lần.

## Bộ đáp án cho T23/T24

[`data/t22_builder_cases.json`](data/t22_builder_cases.json) có hai cấu hình đầy đủ dùng sản phẩm T09 thực: AM4/DDR4 và AM5/DDR5. `selection` lưu `catalogCode` và `quantity` (số sản phẩm/kit bán ra). T24 có thể dùng hai cấu hình này để thử lưu build, lấy giá và thêm vào giỏ. Backend hiện không có cột SKU hoặc `catalogCode`; khi nạp vào database, đối chiếu theo tên, brand và category như seed T09.

Mảng `cases` có một `FAIL` và một `UNKNOWN` cho từng rule dưới đây. Mỗi ca kế thừa `baseBuild`, sau đó áp dụng `replace` và `overrides`. `replace` chọn sản phẩm T09 khác; `overrides` thay thông số **trong bộ nhớ kiểm thử** để tạo ca biên hoặc thiếu dữ liệu. Giá trị `null` nghĩa là trường cần kiểm tra chưa biết, kể cả khi cột database không cho phép NULL. Với một sản phẩm không có cả dòng spec, T23 cũng phải trả UNKNOWN cho các rule cần spec đó. `expected` và `reason` là đáp án tham chiếu, không được sinh từ chính CompatibilityService.

| Rule ID | Phép kiểm tra | Dữ liệu cần có |
| --- | --- | --- |
| `cpu_main_socket` | Socket CPU bằng socket main | CPU, main |
| `cpu_cooler_socket` | Socket CPU thuộc danh sách tản hỗ trợ | CPU, cooler |
| `ram_type` | Loại RAM bằng loại main hỗ trợ | RAM, main |
| `ram_slots` | `quantity × moduleCount ≤ ramSlots` | RAM, main |
| `ram_capacity` | `quantity × capacityGb ≤ maxRamGb` | RAM, main |
| `main_case_form_factor` | Form factor main thuộc danh sách case hỗ trợ | Main, case |
| `gpu_case_length` | `lengthMm ≤ maxGpuLengthMm` | GPU, case |
| `cooler_case_height` | `heightMm ≤ maxCoolerHeightMm` với tản khí | Cooler, case |
| `psu_gpu_wattage` | `wattage ≥ recommendedPsuW` của GPU | PSU, GPU |

Đủ dữ liệu và đạt so sánh → `PASS`; đủ dữ liệu và không đạt → `FAIL`; thiếu bất kỳ dữ liệu cần thiết nào → `UNKNOWN`. Ca synthetic chỉ thử logic so sánh; chúng không khẳng định tồn tại sản phẩm có thông số giả lập đó. Bộ này không kiểm tra BIOS, đầu cấp nguồn, cổng lưu trữ hay vị trí lắp radiator. Mức PSU khuyến nghị của GPU là ngưỡng tối thiểu hiện được mô hình dữ liệu chốt, không phải phép tính điện năng toàn máy.

## Kiểm tra

Từ thư mục gốc, chạy `python -m unittest scripts/test_t22_fixture.py` để xác nhận mã sản phẩm, hai build PASS và đáp án từng ca. Với PostgreSQL 17 test riêng và Java 21, chạy `mvn -B -Pdb-test "-Dit.test=BuilderSeedIT" verify` từ `backend/` theo cách đặt `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD` trong [`testing.md`](testing.md). Test nạp Flyway, T09, T22 hai lần rồi kiểm tra 40 dòng spec và các bảng quan hệ.
