# Tổng hợp test và cách chạy — PC Store

Cập nhật: 06/10/2026. Phạm vi: toàn bộ test tự động đang có trong repo, bao gồm phần bổ sung T19.

## 1. Kết quả kiểm chứng gần nhất

| Nhóm | Số ca thực thi | Kết quả |
| --- | ---: | --- |
| Backend unit/contract — Surefire | 33 | 33 đạt |
| Backend integration — Failsafe | 95 | 93 đạt, 2 lỗi thiếu file rollback |
| Frontend — Node test runner | 18 | 18 đạt |
| Tổng | 146 | 144 đạt, 2 lỗi, không bỏ qua ca |

Đây là kết quả lượt chạy 06/10/2026, không phải cam kết mọi lần chạy sau đều đạt. Backend gồm 13 lớp, frontend gồm 5 file. Test tham số được tính theo số bộ dữ liệu; vòng lặp assertion bên trong một test không được tính thành nhiều ca riêng.

63 ca mới của T19 đều đạt: 31 ca bổ sung vào OrderServiceIT, 14 ca OrderValidationTest và 18 ca CoreHttpIT. OrderServiceIT có tổng cộng 36 ca, gồm 5 ca đã có.

Hai lỗi hiện tại thuộc FeatureMigrationIT:
- `rollsBackOnlyT10AndCanMigrateUpAgain`
- `rollbackRequiresOptInAndRefusesLaterMigrations`

Cùng nguyên nhân: thiếu `backend/src/main/resources/db/rollback/V3__drop_builder_review_setup.sql`. Lệnh chạy toàn bộ backend hiện trả **BUILD FAILURE** do hai lỗi này. Không bỏ qua chúng để gọi bộ test là đạt toàn bộ.

## 2. Chuẩn bị môi trường (PowerShell)

### Java và Maven

Backend cần Java 21 và Maven. Kiểm tra JVM Maven thực sự dùng:

```powershell
Set-Location D:\PC_STORE\backend
mvn -version
```

Máy hiện tại có Java 21 tại đường dẫn sau; chỉ đặt biến cho cửa sổ PowerShell hiện tại, không thay Java toàn máy:

```powershell
$env:JAVA_HOME='D:\IntelliJ IDEA 2025.3.2\jbr'
mvn -version
```

Nếu chạy trên máy khác, thay JAVA_HOME bằng thư mục JDK 21 đã cài. Java 17 không biên dịch được dự án này. Maven cần quyền ghi kho dependency và truy cập mạng khi dependency chưa được tải.

### PostgreSQL riêng cho integration test

Unit test (`*Test`) không cần database. Integration test (`*IT`) cần PostgreSQL 17 đang chạy. Mở Docker Desktop, dùng Linux containers.

Container `pcstore-t19-test-20261006` đã được tạo trên máy này và được dừng sau kiểm thử. Khởi động lại:

```powershell
docker start pcstore-t19-test-20261006
docker exec pcstore-t19-test-20261006 pg_isready -U t19_test -d t19_test
```

Nếu kiểm tra chưa báo `accepting connections`, chờ rồi chạy lại pg_isready.

Chỉ khi container trên **chưa tồn tại**, tạo mới bằng lệnh dưới đây. Không chạy lệnh tạo mới nếu đã có container cùng tên:

```powershell
docker run -d --name pcstore-t19-test-20261006 -e POSTGRES_USER=t19_test -e POSTGRES_PASSWORD=t19-disposable-test -e POSTGRES_DB=t19_test -p 127.0.0.1:55419:5432 postgres:17
docker exec pcstore-t19-test-20261006 pg_isready -U t19_test -d t19_test
```

Đây là tài khoản/mật khẩu **mẫu chỉ dành cho database test**, không dùng cho môi trường thật. Nếu cổng 55419 đã được dùng, chọn cổng khác và đổi TEST_DB_URL tương ứng.

Trong chính cửa sổ PowerShell sẽ chạy Maven:

```powershell
$env:TEST_DB_URL='jdbc:postgresql://127.0.0.1:55419/t19_test'
$env:TEST_DB_USER='t19_test'
$env:TEST_DB_PASSWORD='t19-disposable-test'
Set-Location D:\PC_STORE\backend
```

Không trỏ TEST_DB_URL vào database ứng dụng. Test tự tạo schema ngẫu nhiên, chạy migration/fixture và xóa schema đó sau kiểm thử. Tài khoản test phải có quyền tạo/xóa schema và tạo bảng/function/trigger trong database test. Không cần tự seed dữ liệu.

CoreHttpIT tự khởi động Tomcat 10.1.57 nhúng trên cổng trống, bind 127.0.0.1, rồi dừng sau test; không cần mở Tomcat hay frontend riêng. Test dùng servlet/filter/service/JPA thật. Nó gắn factory DB riêng vào PersistenceManager trong thời gian chạy, nên giữ chế độ chạy test tuần tự mặc định, không bật chạy song song các lớp.

Sau khi hoàn tất:

```powershell
docker stop pcstore-t19-test-20261006
```

Lệnh stop không xóa container hoặc volume.

### Frontend

Lệnh bên dưới đã chạy trên Node.js 22.17.1:

```powershell
Set-Location D:\PC_STORE\frontend
node --version
```

Các test hiện tại dùng `node:test`, import trực tiếp file TypeScript và chạy với `--experimental-strip-types`. Không cần chạy Next.js dev server. `package.json` hiện chưa có script `npm test`.

## 3. Các lệnh chạy nhanh

### Toàn bộ backend

Chạy từ `D:\PC_STORE\backend`:

```powershell
# 33 ca unit/contract, không cần PostgreSQL
mvn -B test

# Unit + tất cả integration test + đóng gói WAR; cần TEST_DB_* và PostgreSQL
mvn -B -Pdb-test verify

# Unit + hai lớp integration order/HTTP của T19
mvn -B -Pdb-test "-Dit.test=OrderServiceIT,CoreHttpIT" verify
```

`mvn test` không chạy `*IT`. Phải bật `-Pdb-test` và đi đến phase `verify` để chạy và nhận kết luận integration test. Lệnh dùng `-Dit.test` vẫn chạy tất cả unit test trước đó; đó là hành vi bình thường.

### Một lớp hoặc một phương thức backend

```powershell
# Unit
mvn -B "-Dtest=OrderValidationTest" test
mvn -B "-Dtest=OrderValidationTest#rejectsNullRequest" test

# Integration
mvn -B -Pdb-test "-Dit.test=OrderServiceIT" verify
mvn -B -Pdb-test "-Dit.test=OrderServiceIT#concurrentCustomersCannotOversellLastUnit" verify
```

Đặt tham số chứa `#` trong dấu nháy như ví dụ. Chạy tên phương thức có `@ParameterizedTest` sẽ chạy tất cả bộ dữ liệu của phương thức đó. Không cần tự gọi setup/cleanup.

### Toàn bộ frontend

Chạy từ `D:\PC_STORE\frontend`:

```powershell
node --experimental-strip-types --test lib/account.test.mjs lib/cart.test.mjs lib/community.test.mjs lib/orders.test.mjs lib/reviews.test.mjs
```

### Đọc kết quả

- Unit: `backend/target/surefire-reports/`.
- Integration: `backend/target/failsafe-reports/`.
- Frontend: kết quả TAP và tổng pass/fail trên terminal.
- Maven có thể ghi log bằng cách thêm `-l target/test-run.log` vào lệnh. Đây là file kết quả build, không commit.
- Khi xuất hiện `No tests matching pattern`, kiểm tra đúng tên lớp/phương thức và đúng `-Dtest` hoặc `-Dit.test`; không tắt báo lỗi để che việc chưa chạy test.
- Cảnh báo SLF4J provider, pool Hibernate phục vụ test, Tomcat add-opens hoặc Node type stripping đã xuất hiện trong lượt chạy; chúng không thay thế việc kiểm tra tổng failures/errors và exit code.

## 4. Chi tiết từng lớp backend

Tất cả lệnh trong phần này chạy ở `D:\PC_STORE\backend`. Các lớp có hậu tố IT yêu cầu hoàn thành cấu hình PostgreSQL ở phần 2.

### CartServletTest — 7 ca thực thi

File: [CartServletTest.java](../backend/src/test/java/com/pcstore/controller/CartServletTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=CartServletTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `unauthenticatedRequestReturnsJson401` | Chưa đăng nhập: JSON 401. | `mvn -B "-Dtest=CartServletTest#unauthenticatedRequestReturnsJson401" test` |
| `invalidJsonIsRejectedBeforeDatabaseAccess` | Từ chối JSON thiếu/sai trước khi truy cập DB. | `mvn -B "-Dtest=CartServletTest#invalidJsonIsRejectedBeforeDatabaseAccess" test` |
| `fractionalStringsAndOverflowAreNotCoercedToIntegers` | Không ép số lẻ, chuỗi, boolean hoặc số tràn thành integer. | `mvn -B "-Dtest=CartServletTest#fractionalStringsAndOverflowAreNotCoercedToIntegers" test` |
| `clientPriceAndUserIdFieldsAreRejected` | Từ chối trường giá, userId hoặc role do client chèn. | `mvn -B "-Dtest=CartServletTest#clientPriceAndUserIdFieldsAreRejected" test` |
| `invalidQuantitiesAreRejectedBeforeDatabaseAccess` | Từ chối số lượng sai trước khi truy cập DB. | `mvn -B "-Dtest=CartServletTest#invalidQuantitiesAreRejectedBeforeDatabaseAccess" test` |
| `invalidItemIdsReturnJson400ForPatchAndDelete` | ID dòng giỏ sai trả JSON 400. | `mvn -B "-Dtest=CartServletTest#invalidItemIdsReturnJson400ForPatchAndDelete" test` |
| `unknownPathsAndUnsupportedMethodsHaveJsonErrors` | Đường dẫn sai và method không hỗ trợ trả lỗi JSON. | `mvn -B "-Dtest=CartServletTest#unknownPathsAndUnsupportedMethodsHaveJsonErrors" test` |

### OpenApiContractTest — 1 ca thực thi

File: [OpenApiContractTest.java](../backend/src/test/java/com/pcstore/docs/OpenApiContractTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=OpenApiContractTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `publishedContractResolvesAndDescribesImplementedOperations` | Parse OpenAPI, kiểm tra endpoint đã khai báo, operationId và session security; không tự kiểm chứng response runtime. | `mvn -B "-Dtest=OpenApiContractTest#publishedContractResolvesAndDescribesImplementedOperations" test` |

### ProductSearchQueryTest — 2 ca thực thi

File: [ProductSearchQueryTest.java](../backend/src/test/java/com/pcstore/dto/ProductSearchQueryTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=ProductSearchQueryTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `parsesDefaultsAndFilters` | Parse giá trị mặc định và bộ lọc catalog. | `mvn -B "-Dtest=ProductSearchQueryTest#parsesDefaultsAndFilters" test` |
| `rejectsInvalidRangeAndPagination` | Từ chối khoảng giá và phân trang sai. | `mvn -B "-Dtest=ProductSearchQueryTest#rejectsInvalidRangeAndPagination" test` |

### AdminAuthorizationFilterTest — 2 ca thực thi

File: [AdminAuthorizationFilterTest.java](../backend/src/test/java/com/pcstore/filter/AdminAuthorizationFilterTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=AdminAuthorizationFilterTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `rejectsCustomerBeforeAdminServletRuns` | Customer bị chặn 403 trước servlet Admin. | `mvn -B "-Dtest=AdminAuthorizationFilterTest#rejectsCustomerBeforeAdminServletRuns" test` |
| `allowsAdminToReachServlet` | Admin được đi tiếp qua filter. | `mvn -B "-Dtest=AdminAuthorizationFilterTest#allowsAdminToReachServlet" test` |

### CorsFilterTest — 7 ca thực thi

File: [CorsFilterTest.java](../backend/src/test/java/com/pcstore/filter/CorsFilterTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=CorsFilterTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `onlySameOriginOrExplicitlyAllowedOriginsReachServlet` | 7 bộ Origin: cho phép cùng origin/allowlist, chặn origin khác và giả mạo hostname. | `mvn -B "-Dtest=CorsFilterTest#onlySameOriginOrExplicitlyAllowedOriginsReachServlet" test` |

### OrderValidationTest — 14 ca thực thi

File: [OrderValidationTest.java](../backend/src/test/java/com/pcstore/service/OrderValidationTest.java).

Loại: unit/contract, không cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B "-Dtest=OrderValidationTest" test
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `rejectsMissingOrMalformedIdempotencyKey` | 6 giá trị key null/rỗng/khoảng trắng/ngắn/ký tự không hợp lệ. | `mvn -B "-Dtest=OrderValidationTest#rejectsMissingOrMalformedIdempotencyKey" test` |
| `rejectsKeyLongerThan128Characters` | Key dài hơn 128 ký tự bị từ chối. | `mvn -B "-Dtest=OrderValidationTest#rejectsKeyLongerThan128Characters" test` |
| `rejectsNullRequest` | Request checkout null bị từ chối. | `mvn -B "-Dtest=OrderValidationTest#rejectsNullRequest" test` |
| `requiresRecipientNamePhoneAndAddress` | 4 giá trị thiếu/rỗng cho từng trường tên, điện thoại và địa chỉ. | `mvn -B "-Dtest=OrderValidationTest#requiresRecipientNamePhoneAndAddress" test` |
| `rejectsRecipientFieldsExceedingStorageLimits` | Tên trên 255 hoặc điện thoại trên 32 ký tự bị từ chối. | `mvn -B "-Dtest=OrderValidationTest#rejectsRecipientFieldsExceedingStorageLimits" test` |
| `requiresPaymentMethod` | Phương thức thanh toán là bắt buộc. | `mvn -B "-Dtest=OrderValidationTest#requiresPaymentMethod" test` |

### CartServiceIT — 21 ca thực thi

File: [CartServiceIT.java](../backend/src/test/java/com/pcstore/CartServiceIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=CartServiceIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `emptyCartHasZeroTotalAndDoesNotCreateRows` | Giỏ rỗng có tổng 0 và không tự tạo dòng DB. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#emptyCartHasZeroTotalAndDoesNotCreateRows" verify` |
| `repeatedAddsMergeOneLineUsingDatabasePriceWithoutReservingStock` | Thêm cùng sản phẩm gộp dòng, dùng giá DB và chưa giữ tồn. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#repeatedAddsMergeOneLineUsingDatabasePriceWithoutReservingStock" verify` |
| `totalsIncludeAllProductsInTheCart` | Tổng giỏ cộng đúng nhiều sản phẩm. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#totalsIncludeAllProductsInTheCart" verify` |
| `customerCartsAreIndependent` | Giỏ hai Customer độc lập. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#customerCartsAreIndependent" verify` |
| `cannotUpdateOrDeleteAnotherCustomersLine` | Không sửa/xóa dòng giỏ của người khác, kể cả quantity=0. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#cannotUpdateOrDeleteAnotherCustomersLine" verify` |
| `updateReplacesQuantityAndDeleteRemovesLine` | Sửa thay số lượng; DELETE xóa dòng. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#updateReplacesQuantityAndDeleteRemovesLine" verify` |
| `missingCartItemCannotBeUpdatedOrDeleted` | Dòng không tồn tại trả lỗi. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#missingCartItemCannotBeUpdatedOrDeleted" verify` |
| `zeroQuantityRemovesLineAndRecalculatesRemainingTotal` | Quantity=0 xóa dòng và tính lại tổng còn lại. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#zeroQuantityRemovesLineAndRecalculatesRemainingTotal" verify` |
| `zeroQuantityRemovesLastLineWithoutRemovingCartOrChangingStock` | Xóa dòng cuối giữ bản ghi giỏ, không đổi tồn và cập nhật thời gian. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#zeroQuantityRemovesLastLineWithoutRemovingCartOrChangingStock" verify` |
| `zeroQuantityCanRemoveUnavailableProduct` | Vẫn xóa được sản phẩm không còn bán bằng quantity=0. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#zeroQuantityCanRemoveUnavailableProduct" verify` |
| `priceChangesAreReflectedWhenReadingExistingCart` | Giỏ phản ánh giá hiện hành khi đọc lại. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#priceChangesAreReflectedWhenReadingExistingCart" verify` |
| `invalidQuantitiesDoNotChangeCart` | Số lượng sai không làm đổi giỏ. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#invalidQuantitiesDoNotChangeCart" verify` |
| `invalidOrMissingProductsDoNotCreateCart` | Sản phẩm/ID sai không tạo giỏ mới. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#invalidOrMissingProductsDoNotCreateCart" verify` |
| `addAndUpdateRespectAvailableStockIncludingMergedQuantity` | Thêm/gộp/sửa không vượt tồn khả dụng. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#addAndUpdateRespectAvailableStockIncludingMergedQuantity" verify` |
| `largeMergedQuantityCannotOverflowToNegative` | Số lượng lớn không tràn thành âm. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#largeMergedQuantityCannotOverflowToNegative" verify` |
| `unavailableProductCategoryBrandOrMissingInventoryCannotBeAdded` | Chặn sản phẩm không bán, category/brand inactive hoặc thiếu Inventory. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#unavailableProductCategoryBrandOrMissingInventoryCannotBeAdded" verify` |
| `existingUnavailableLineIsVisibleAndCanStillBeDeleted` | Dòng hết hàng/bị ẩn vẫn nhìn thấy và xóa được. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#existingUnavailableLineIsVisibleAndCanStillBeDeleted" verify` |
| `invalidInactiveOrAdminUsersCannotUseCartService` | Chặn user không tồn tại, inactive hoặc Admin tại CartService. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#invalidInactiveOrAdminUsersCannotUseCartService" verify` |
| `cartTimestampChangesOnlyOnSuccessfulWrites` | Chỉ ghi thành công mới đổi updatedAt. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#cartTimestampChangesOnlyOnSuccessfulWrites" verify` |
| `concurrentFirstAddsCreateOneCartAndMergeOneLine` | Hai lần thêm đầu đồng thời chỉ tạo một giỏ/một dòng. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#concurrentFirstAddsCreateOneCartAndMergeOneLine" verify` |
| `concurrentMergedAddsDoNotExceedStockOrLoseUpdates` | Thêm đồng thời không mất cập nhật hoặc vượt tồn. | `mvn -B -Pdb-test "-Dit.test=CartServiceIT#concurrentMergedAddsDoNotExceedStockOrLoseUpdates" verify` |

### CoreDatabaseIT — 7 ca thực thi

File: [CoreDatabaseIT.java](../backend/src/test/java/com/pcstore/CoreDatabaseIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `migratesAllCoreTablesAndCanRunAgain` | Migration CORE trên schema mới và chạy lại. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#migratesAllCoreTablesAndCanRunAgain" verify` |
| `rejectsInvalidValuesAndPreservesOrderHistory` | Ràng buộc dữ liệu và bảo vệ lịch sử đơn. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#rejectsInvalidValuesAndPreservesOrderHistory" verify` |
| `enforcesInventoryCartAndPartialUniqueIndexes` | Ràng buộc tồn/giỏ và partial unique index. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#enforcesInventoryCartAndPartialUniqueIndexes" verify` |
| `enforcesCheckoutIdempotencyPerUser` | Unique checkout key theo từng user ở DB. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#enforcesCheckoutIdempotencyPerUser" verify` |
| `validatesAndRegistersAllCoreMappings` | Hibernate validate và đăng ký mapping CORE. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#validatesAndRegistersAllCoreMappings" verify` |
| `persistsAndReloadsCoreGraphWithIndependentPriceSnapshots` | Lưu/đọc quan hệ CORE và snapshot giá độc lập. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#persistsAndReloadsCoreGraphWithIndependentPriceSnapshots" verify` |
| `upgradesExistingV1BrandsWithoutLosingData` | Nâng từ V1 không mất dữ liệu hãng. | `mvn -B -Pdb-test "-Dit.test=CoreDatabaseIT#upgradesExistingV1BrandsWithoutLosingData" verify` |

### FeatureMigrationIT — 10 ca thực thi

File: [FeatureMigrationIT.java](../backend/src/test/java/com/pcstore/FeatureMigrationIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `migratesFreshDatabaseAndCanRunAgain` | Migration FEATURE schema mới và chạy lại. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#migratesFreshDatabaseAndCanRunAgain" verify` |
| `upgradesPopulatedT03WithoutChangingCoreData` | Nâng từ T03 có dữ liệu, giữ dữ liệu CORE. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#upgradesPopulatedT03WithoutChangingCoreData" verify` |
| `rollsBackOnlyT10AndCanMigrateUpAgain` | Rollback T10 và migrate lại. **Đang lỗi: thiếu file rollback V3.** | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#rollsBackOnlyT10AndCanMigrateUpAgain" verify` |
| `rollbackRequiresOptInAndRefusesLaterMigrations` | Rollback yêu cầu opt-in và từ chối khi có migration mới hơn. **Đang lỗi: thiếu file rollback V3.** | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#rollbackRequiresOptInAndRefusesLaterMigrations" verify` |
| `enforcesOneReviewPerOrderItemEvenAfterSoftDeleteAndOneLikePerUser` | Một review/OrderItem kể cả xóa mềm; một like/user. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#enforcesOneReviewPerOrderItemEvenAfterSoftDeleteAndOneLikePerUser" verify` |
| `preservesOwnershipPathsAndRejectsOrphanReferences` | FK xác định chủ sở hữu và chặn tham chiếu mồ côi. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#preservesOwnershipPathsAndRejectsOrphanReferences" verify` |
| `validatesReviewMediaAndModerationStates` | Ràng buộc media review và trạng thái kiểm duyệt. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#validatesReviewMediaAndModerationStates" verify` |
| `validatesBuildAndAllEightSpecs` | Ràng buộc build và tám loại thông số linh kiện. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#validatesBuildAndAllEightSpecs" verify` |
| `cascadesDependentDataButPreservesOwnersAndPurchaseHistory` | Cascade dữ liệu phụ thuộc nhưng giữ chủ sở hữu/lịch sử mua. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#cascadesDependentDataButPreservesOwnersAndPurchaseHistory" verify` |
| `indexesEveryFeatureForeignKey` | Kiểm tra index cho FK FEATURE. | `mvn -B -Pdb-test "-Dit.test=FeatureMigrationIT#indexesEveryFeatureForeignKey" verify` |

### DemoDataSeederIT — 1 ca thực thi

File: [DemoDataSeederIT.java](../backend/src/test/java/com/pcstore/config/DemoDataSeederIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=DemoDataSeederIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `seedsPublicCatalogWithoutDuplicatingRowsOrResettingStock` | Seed catalog không trùng, không reset tồn; đọc được qua DAO/service. | `mvn -B -Pdb-test "-Dit.test=DemoDataSeederIT#seedsPublicCatalogWithoutDuplicatingRowsOrResettingStock" verify` |

### AdminProductServiceIT — 2 ca thực thi

File: [AdminProductServiceIT.java](../backend/src/test/java/com/pcstore/service/AdminProductServiceIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=AdminProductServiceIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `createsUpdatesAndHidesProductFromPublicCatalog` | Tạo/sửa/ẩn sản phẩm phản ánh ra catalog public. | `mvn -B -Pdb-test "-Dit.test=AdminProductServiceIT#createsUpdatesAndHidesProductFromPublicCatalog" verify` |
| `rejectsInvalidPriceAndInventoryBelowReservedQuantity` | Từ chối giá lẻ và chỉnh tồn thấp hơn lượng đã giữ chỗ. | `mvn -B -Pdb-test "-Dit.test=AdminProductServiceIT#rejectsInvalidPriceAndInventoryBelowReservedQuantity" verify` |

### OrderServiceIT — 36 ca thực thi

File: [OrderServiceIT.java](../backend/src/test/java/com/pcstore/service/OrderServiceIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=OrderServiceIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `checkoutSnapshotsPriceAndAddressAndReplaysSameKey` | Snapshot giá/địa chỉ, replay cùng key, xung đột nội dung và chặn xem đơn người khác. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#checkoutSnapshotsPriceAndAddressAndReplaysSameKey" verify` |
| `cancellationReleasesReservationOnlyOnceAndNeverQualifiesAsDelivered` | Hủy giải phóng tồn đúng một lần, không có deliveredAt. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#cancellationReleasesReservationOnlyOnceAndNeverQualifiesAsDelivered" verify` |
| `adminLifecycleConsumesReservedStockAndWritesDeliveredAtOnce` | Luồng COD đến DELIVERED; kho, paidAt, deliveredAt đúng và không ghi lại khi replay. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#adminLifecycleConsumesReservedStockAndWritesDeliveredAtOnce" verify` |
| `concurrentCustomersCannotOversellLastUnit` | Hai Customer tranh món cuối: chỉ một người thành công. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#concurrentCustomersCannotOversellLastUnit" verify` |
| `concurrentDuplicateCheckoutCreatesOneOrder` | Cùng key đồng thời chỉ tạo một đơn, một lần giữ tồn. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#concurrentDuplicateCheckoutCreatesOneOrder" verify` |
| `emptyCartCannotCreateOrderOrPayment` | Giỏ rỗng không tạo đơn/thanh toán. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#emptyCartCannotCreateOrderOrPayment" verify` |
| `productMadeUnavailableAfterAddingToCartCannotCheckout` | 3 trường hợp sản phẩm/category/brand không còn bán sau khi thêm giỏ. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#productMadeUnavailableAfterAddingToCartCannotCheckout" verify` |
| `oneUnavailableLineRollsBackReservationsForEntireCart` | Một dòng thiếu tồn khiến cả giỏ không checkout, không giữ tồn phần còn lại. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#oneUnavailableLineRollsBackReservationsForEntireCart" verify` |
| `databaseFailureAfterOrderWritesRollsBackAndSameKeyCanBeRetried` | Trigger test gây lỗi lúc xóa giỏ sau ghi đơn: rollback toàn bộ; retry cùng key được. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#databaseFailureAfterOrderWritesRollsBackAndSameKeyCanBeRetried" verify` |
| `checkoutRepricesMultipleLinesAndPaymentMatchesPersistedTotal` | Giá đổi trước đặt hàng, nhiều dòng/số lượng, Payment khớp tổng và snapshot không đổi sau đó. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#checkoutRepricesMultipleLinesAndPaymentMatchesPersistedTotal" verify` |
| `overflowingTotalDoesNotReserveStockOrClearCart` | Tổng vượt NUMERIC(19,0) không giữ tồn/xóa giỏ. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#overflowingTotalDoesNotReserveStockOrClearCart" verify` |
| `otherCustomerCannotCancelAndOrderListsArePrivate` | Không hủy đơn người khác; danh sách riêng; cùng key giữa hai user độc lập. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#otherCustomerCannotCancelAndOrderListsArePrivate" verify` |
| `inactiveCustomerCannotCreateNewCheckout` | User inactive không tạo checkout mới. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#inactiveCustomerCannotCreateNewCheckout" verify` |
| `invalidTransitionsLeaveOrderAndInventoryUnchanged` | 15 cặp chuyển trạng thái sai giữ nguyên đơn và tồn. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#invalidTransitionsLeaveOrderAndInventoryUnchanged" verify` |
| `onlyAdminCanCancelConfirmedOrderAndReleasesReservationOnce` | Customer không hủy CONFIRMED; thao tác Admin hủy và giải phóng đúng một lần. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#onlyAdminCanCancelConfirmedOrderAndReleasesReservationOnce" verify` |
| `paidOrderCannotBeCancelledByCustomerOrAdmin` | Đơn đã PAID không hủy bằng Customer hoặc Admin. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#paidOrderCannotBeCancelledByCustomerOrAdmin" verify` |
| `repeatedShippingDoesNotConsumeInventoryTwice` | Gửi SHIPPING lặp không trừ tồn lần hai. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#repeatedShippingDoesNotConsumeInventoryTwice" verify` |
| `bankTransferRequiresPaymentBeforeShipping` | Đơn chuyển khoản fixture phải PAID trước SHIPPING; giữ paidAt khi giao. Không test tạo checkout chuyển khoản. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#bankTransferRequiresPaymentBeforeShipping" verify` |
| `differentKeysAgainstSameCartCannotCreateTwoOrders` | Hai key khác nhau cùng giỏ đồng thời không tạo hai đơn. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#differentKeysAgainstSameCartCannotCreateTwoOrders" verify` |
| `concurrentCancelAndShippingPreserveInventory` | Hủy/xuất hàng đồng thời chỉ một thao tác thắng; tồn khớp trạng thái cuối. | `mvn -B -Pdb-test "-Dit.test=OrderServiceIT#concurrentCancelAndShippingPreserveInventory" verify` |

### CoreHttpIT — 18 ca thực thi

File: [CoreHttpIT.java](../backend/src/test/java/com/pcstore/http/CoreHttpIT.java).

Loại: integration, cần PostgreSQL.

Chạy cả lớp:

```powershell
mvn -B -Pdb-test "-Dit.test=CoreHttpIT" verify
```

| Phương thức | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `loginCartCheckoutReplayAndAdminDeliveryWorkOverHttp` | HTTP thật: login → giỏ → checkout 201/replay 200 → Admin giao → khách đọc đơn; kiểm tra DB. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#loginCartCheckoutReplayAndAdminDeliveryWorkOverHttp" verify` |
| `sessionsEnforceGuestRoleAndOwnershipBoundaries` | Guest 401, sai role 403, đơn người khác 404, không lộ danh sách đơn. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#sessionsEnforceGuestRoleAndOwnershipBoundaries" verify` |
| `logoutInvalidatesSessionForProtectedRoutes` | Logout làm session mất quyền truy cập. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#logoutInvalidatesSessionForProtectedRoutes" verify` |
| `malformedAndForgedCheckoutBodiesCannotCreateOrders` | 6 JSON sai/giả mạo không tạo đơn hoặc xóa giỏ. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#malformedAndForgedCheckoutBodiesCannotCreateOrders" verify` |
| `invalidIdempotencyKeyDoesNotMutateCart` | 4 trường hợp thiếu/key sai không đổi dữ liệu. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#invalidIdempotencyKeyDoesNotMutateCart" verify` |
| `changedBodyWithUsedKeyReturnsConflict` | Cùng key khác nội dung trả 409 IDEMPOTENCY_KEY_REUSED. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#changedBodyWithUsedKeyReturnsConflict" verify` |
| `stockChangedAfterAddingCartReturnsConflictAndPreservesCart` | Tồn giảm sau thêm giỏ: checkout 409, giữ giỏ. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#stockChangedAfterAddingCartReturnsConflictAndPreservesCart" verify` |
| `invalidAdminStatusAndMalformedBodyLeaveOrderUnchanged` | JSON/trạng thái Admin sai không đổi đơn hoặc tồn. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#invalidAdminStatusAndMalformedBodyLeaveOrderUnchanged" verify` |
| `malformedOrderIdsAndUnknownPathsReturnJson404` | ID/route sai và tài nguyên không tồn tại trả JSON 404 đúng mã. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#malformedOrderIdsAndUnknownPathsReturnJson404" verify` |
| `failedLoginDoesNotCreateAuthenticatedSession` | Sai mật khẩu không tạo session có quyền. | `mvn -B -Pdb-test "-Dit.test=CoreHttpIT#failedLoginDoesNotCreateAuthenticatedSession" verify` |

## 5. Chi tiết frontend

Các test dưới đây kiểm tra hàm và fixture trong thư viện frontend. Chúng không thao tác trình duyệt và không chứng minh API/database thật hay phân quyền backend. Chạy từ `D:\PC_STORE\frontend`.

### account.test.mjs — 3 ca

File: [account.test.mjs](../frontend/lib/account.test.mjs).

Chạy cả file:

```powershell
node --experimental-strip-types --test lib/account.test.mjs
```

| Tên test | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `gets and updates user profile` | Đọc/cập nhật hồ sơ. | `node --experimental-strip-types --test --test-name-pattern="^gets and updates user profile$" lib/account.test.mjs` |
| `manages saved addresses: add, set default, and delete` | Thêm/sửa/đặt mặc định/xóa địa chỉ. | `node --experimental-strip-types --test --test-name-pattern="^manages saved addresses: add, set default, and delete$" lib/account.test.mjs` |
| `gets and deletes saved builds` | Đọc và xóa cấu hình đã lưu. | `node --experimental-strip-types --test --test-name-pattern="^gets and deletes saved builds$" lib/account.test.mjs` |

### cart.test.mjs — 2 ca

File: [cart.test.mjs](../frontend/lib/cart.test.mjs).

Chạy cả file:

```powershell
node --experimental-strip-types --test lib/cart.test.mjs
```

| Tên test | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `adding the same product merges quantities without exceeding demo stock` | Gộp số lượng theo tồn demo, giữ input ban đầu. | `node --experimental-strip-types --test --test-name-pattern="^adding the same product merges quantities without exceeding demo stock$" lib/cart.test.mjs` |
| `unavailable items cannot be added and removing a line leaves others intact` | Không thêm hàng hết tồn; xóa không ảnh hưởng dòng khác. | `node --experimental-strip-types --test --test-name-pattern="^unavailable items cannot be added and removing a line leaves others intact$" lib/cart.test.mjs` |

### community.test.mjs — 6 ca

File: [community.test.mjs](../frontend/lib/community.test.mjs).

Chạy cả file:

```powershell
node --experimental-strip-types --test lib/community.test.mjs
```

| Tên test | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `returns featured setup post` | Lấy bài nổi bật. | `node --experimental-strip-types --test --test-name-pattern="^returns featured setup post$" lib/community.test.mjs` |
| `filters community posts by style` | Lọc phong cách. | `node --experimental-strip-types --test --test-name-pattern="^filters community posts by style$" lib/community.test.mjs` |
| `filters community posts by search query` | Tìm kiếm bài. | `node --experimental-strip-types --test --test-name-pattern="^filters community posts by search query$" lib/community.test.mjs` |
| `toggles like count properly` | Bật/tắt like và cập nhật số lượng. | `node --experimental-strip-types --test --test-name-pattern="^toggles like count properly$" lib/community.test.mjs` |
| `adds comment to post` | Thêm bình luận vào dữ liệu fixture. | `node --experimental-strip-types --test --test-name-pattern="^adds comment to post$" lib/community.test.mjs` |
| `creates new community post with components` | Tạo bài với linh kiện fixture. | `node --experimental-strip-types --test --test-name-pattern="^creates new community post with components$" lib/community.test.mjs` |

### orders.test.mjs — 3 ca

File: [orders.test.mjs](../frontend/lib/orders.test.mjs).

Chạy cả file:

```powershell
node --experimental-strip-types --test lib/orders.test.mjs
```

| Tên test | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `filters the order history by status` | Lọc lịch sử đơn theo trạng thái. | `node --experimental-strip-types --test --test-name-pattern="^filters the order history by status$" lib/orders.test.mjs` |
| `marks each reached delivery step in order` | Các bước đã đạt tới SHIPPING. | `node --experimental-strip-types --test --test-name-pattern="^marks each reached delivery step in order$" lib/orders.test.mjs` |
| `cancelled orders do not report delivery progress` | Đơn hủy không báo tiến trình giao. | `node --experimental-strip-types --test --test-name-pattern="^cancelled orders do not report delivery progress$" lib/orders.test.mjs` |

### reviews.test.mjs — 4 ca

File: [reviews.test.mjs](../frontend/lib/reviews.test.mjs).

Chạy cả file:

```powershell
node --experimental-strip-types --test lib/reviews.test.mjs
```

| Tên test | Nội dung | Lệnh chạy riêng |
| --- | --- | --- |
| `calculates review summary and distribution correctly` | Thống kê review/phân bố sao. | `node --experimental-strip-types --test --test-name-pattern="^calculates review summary and distribution correctly$" lib/reviews.test.mjs` |
| `returns default summary when no reviews exist` | Giá trị mặc định khi chưa có review. | `node --experimental-strip-types --test --test-name-pattern="^returns default summary when no reviews exist$" lib/reviews.test.mjs` |
| `adds review and updates verified buyer flag` | Thêm review và cờ người mua trong fixture; không chứng minh quyền mua thật ở backend. | `node --experimental-strip-types --test --test-name-pattern="^adds review and updates verified buyer flag$" lib/reviews.test.mjs` |
| `toggles like count properly` | Bật/tắt like review. | `node --experimental-strip-types --test --test-name-pattern="^toggles like count properly$" lib/reviews.test.mjs` |

## 6. Giới hạn coverage và các phần chưa hoàn tất

- UI checkout hiện giả lập mã đơn; chưa có browser end-to-end test chứng minh UI gọi API đặt hàng thật. Cần nối API ở T20 trước khi nghiệm thu luồng UI thật.
- Checkout hiện chỉ hỗ trợ COD. BANK_TRANSFER và API xác nhận thanh toán chưa hoàn tất; test bankTransferRequiresPaymentBeforeShipping chỉ chuẩn bị đơn chuyển khoản bằng fixture DB để kiểm tra quy tắc xuất/giao hàng.
- CoreHttpIT kiểm tra Tomcat nhúng và đăng ký servlet/filter theo annotation; không thay thế kiểm thử WAR triển khai lên môi trường thật hoặc routing qua Next.js.
- Test schema/FK của FEATURE không chứng minh quyền API Review/Community/Builder. Test fixture frontend cũng không chứng minh quy tắc người mua thật.
- Hai test rollback FEATURE đang lỗi vì thiếu file SQL đã nêu ở phần 1. Không sửa migration đã merge hoặc tự bỏ qua test để làm báo cáo xanh.
- Mỗi lần thay code cần chạy lại các test liên quan; tổng ca trong tài liệu là ảnh chụp tại ngày cập nhật.

