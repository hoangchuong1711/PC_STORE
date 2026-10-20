// Kiểm thử form thật với HTTP fixture ở localhost, không ghi vào backend/database thật.
// 1. Chạy Next: $env:BACKEND_ORIGIN="http://127.0.0.1:18085"; npm run dev -- --port 3105
// 2. Chạy file này với PLAYWRIGHT_MODULE trỏ tới package playwright nếu chưa cài trong frontend.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_FRONTEND_URL || "http://localhost:3105";
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQAAAAABJRU5ErkJggg==", "base64");
const mediaId = "11111111-1111-1111-1111-111111111111";
const product = { productId: 101, name: "Test RAM", description: "RAM test", price: 500000, status: "ACTIVE", category: { categoryId: 1, name: "RAM", componentType: "RAM" }, brand: null, imageUrls: [], availableQuantity: 5, inStock: true };
const order = { orderId: 9, orderDate: "2026-10-01T10:00:00Z", status: "DELIVERED", deliveredAt: "2026-10-02T10:00:00Z", totalAmount: 500000, shippingName: "Test Buyer", shippingPhone: "0901234567", shippingAddressText: "123 Test Street", payment: null, items: [{ orderItemId: 31, productId: 101, productName: "Test RAM", quantity: 1, baseUnitPrice: 500000, unitPrice: 500000, lineTotal: 500000 }] };
let post = { postId: 7, authorId: 1, title: "Góc máy kiểm thử", description: "Mô tả góc máy dùng kiểm thử giao diện", status: "PUBLISHED", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", mediaIds: [mediaId], products: [{ productId: 101, name: product.name }] };
let review = null;
let role = "CUSTOMER";
let rejectReview = true;
let liked = false;
const requests = [];
const unexpectedWrites = [];
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname.replace(/^\/pc-store-backend/, "");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const body = req.headers["content-type"]?.includes("application/json") && raw.length ? JSON.parse(raw.toString()) : undefined;
  requests.push({ path, method: req.method, body, headers: req.headers, bytes: raw.length });
  function json(value, status = 200) { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); }
  if (path === "/api/auth/me") return json({ userId: 1, fullName: "Test Buyer", email: "test@example.test", phone: "0901234567", role });
  if (path === "/api/customer/cart") return json({ cartId: 1, items: [], totalAmount: 0 });
  if (path === "/api/orders/9") return json(order);
  if (path === "/api/customer/reviews/order-items/31") return review ? json(review) : json({ code: "REVIEW_NOT_FOUND" }, 404);
  if (path === "/api/customer/media/images") return json({ mediaId, module: req.headers["x-media-module"], status: "TEMP" }, 201);
  if (path.startsWith("/api/media/")) { res.writeHead(200, { "Content-Type": "image/png" }); return res.end(image); }
  if (path === "/api/customer/reviews" && req.method === "POST") {
    if (rejectReview) return json({ code: "TEST_ERROR", message: "Lỗi kiểm thử gửi đánh giá" }, 500);
    review = { ...body, reviewId: 5, orderId: 9, userName: "Test Buyer", productName: product.name, status: "PUBLISHED", images: [], likesCount: 0, verifiedBuyer: true };
    return json(review, 201);
  }
  if (path === "/api/products") return json({ items: [product], page: 0, size: 50, totalItems: 1, totalPages: 1 });
  if (path === "/api/products/101") return json(product);
  if (path === "/api/customer/setups/eligibility") return json({ eligible: true, reason: null });
  if (path === "/api/customer/setups" && req.method === "POST") { post = { ...post, ...body }; return json(post, 201); }
  if (path === "/api/setups") return json([post]);
  if (path === "/api/setups/ranking") return json([{ post, likeCount: liked ? 1 : 0, liked }]);
  if (path === "/api/setups/7") return json(post);
  if (path === "/api/setup-likes/7") { if (req.method !== "GET") liked = req.method === "PUT"; return json({ postId: 7, likeCount: liked ? 1 : 0, liked }); }
  if (path === "/api/admin/reviews") return json([review]);
  if (path === "/api/admin/reviews/5/moderation") { review = { ...review, ...body }; return json({ reviewId: 5, ...body }); }
  if (path === "/api/admin/setups") return json([{ post, likeCount: 0, moderationReason: null, moderatedBy: null, moderatedAt: null }]);
  if (path === "/api/admin/setups/7/status") { post = { ...post, status: body.status }; return json({ post, likeCount: 0, moderationReason: body.reason, moderatedBy: 1, moderatedAt: new Date().toISOString() }); }
  if (req.method !== "GET") unexpectedWrites.push({ path, method: req.method });
  return json([]);
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(18085, "127.0.0.1", resolve); });
let browser;
let page;
try {
  // Xác nhận rewrite đang trỏ đúng fixture trước khi bấm bất kỳ nút gửi dữ liệu nào.
  const probe = await fetch(`${base}/api/auth/me`);
  assert.equal((await probe.json()).email, "test@example.test");
  assert(requests.some(request => request.path === "/api/auth/me"), "Next phải dùng BACKEND_ORIGIN=http://127.0.0.1:18085");
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined) });
  page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/orders/9`);
  await page.getByRole("button", { name: "Viết đánh giá linh kiện", exact: true }).click();
  const reviewForm = page.locator("#write-review-form");
  await reviewForm.locator("#reviewText").fill("RAM hoạt động tốt và đóng gói cẩn thận.");
  await reviewForm.getByRole("button", { name: "4 sao", exact: true }).click();
  await reviewForm.locator('input[type="file"]').setInputFiles({ name: "review.png", mimeType: "image/png", buffer: image });
  await page.getByText("Đã tải lên 1 tệp đính kèm thành công!", { exact: true }).waitFor();
  await reviewForm.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  await page.getByText("Lỗi kiểm thử gửi đánh giá", { exact: true }).waitFor();
  assert.equal(await reviewForm.isVisible(), true);
  rejectReview = false;
  await reviewForm.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  await reviewForm.waitFor({ state: "hidden" });
  assert.deepEqual(requests.filter(r => r.path === "/api/customer/reviews").at(-1).body, { orderItemId: 31, productId: 101, rating: 4, content: "RAM hoạt động tốt và đóng gói cẩn thận.", mediaIds: [mediaId] });
  console.log("PASS Review: mở form, upload, JSON payload, giữ form khi lỗi, đóng khi thành công");

  await page.goto(`${base}/community`);
  await page.getByRole("button", { name: "Chia sẻ góc máy của bạn", exact: true }).click();
  const setupForm = page.locator("#create-setup-form");
  await setupForm.locator("#setupTitle").fill("Góc máy mới kiểm thử");
  await setupForm.locator("#setupDesc").fill("Góc máy dùng để học lập trình và làm đồ án.");
  await setupForm.getByRole("button", { name: /Test RAM/ }).waitFor();
  await setupForm.locator('input[type="file"]').setInputFiles({ name: "setup.png", mimeType: "image/png", buffer: image });
  await page.getByText("Đã tải lên 1 ảnh thực tế thành công!", { exact: true }).waitFor();
  await setupForm.getByRole("button", { name: "Đăng góc máy ngay", exact: true }).click();
  await page.waitForURL("**/community/7");
  await page.getByRole("heading", { name: "Góc máy mới kiểm thử", exact: true }).waitFor();
  assert.deepEqual(requests.find(r => r.path === "/api/customer/setups" && r.method === "POST").body, { title: "Góc máy mới kiểm thử", description: "Góc máy dùng để học lập trình và làm đồ án.", mediaIds: [mediaId], productIds: [101] });
  await page.getByRole("button", { name: "Thả tim góc máy này", exact: true }).click();
  await page.getByText("Thích (1)", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Thả tim góc máy này", exact: true }).click();
  await page.getByText("Thích (0)", { exact: true }).waitFor();
  const uploads = requests.filter(r => r.path === "/api/customer/media/images");
  assert.deepEqual(uploads.map(r => r.headers["x-media-module"]), ["REVIEW", "SETUP"]);
  assert(uploads.every(r => r.bytes === image.length && r.headers["content-type"] === "image/png"));
  console.log("PASS Setup: điều kiện, catalog, upload byte, JSON, điều hướng chi tiết, thích/bỏ thích");

  role = "ADMIN";
  await page.goto(`${base}/admin/reviews`);
  await page.getByRole("row").filter({ hasText: "Test Buyer" }).getByRole("button", { name: "Ẩn", exact: true }).click();
  await page.locator("#hide-review-dialog").getByRole("textbox").fill("Ẩn để kiểm thử");
  await page.getByRole("button", { name: "Xác nhận ẩn", exact: true }).click();
  await page.locator("#hide-review-dialog").waitFor({ state: "hidden" });
  assert.equal(review.status, "HIDDEN");
  // Sau khi ẩn, view giữ bảng chi tiết đang mở; khôi phục từ nút trong bảng chi tiết.
  await page.getByRole("button", { name: "Khôi phục hiển thị", exact: true }).click();
  await page.locator("#restore-review-dialog").getByRole("button", { name: /Xác nhận/ }).click();
  await page.locator("#restore-review-dialog").waitFor({ state: "hidden" });
  assert.equal(review.status, "PUBLISHED");
  console.log("PASS Admin Review: mở đúng hộp thoại, PATCH ẩn/khôi phục và cập nhật bảng");

  await page.goto(`${base}/admin/community`);
  await page.getByRole("button", { name: "Xem", exact: true }).first().click();
  await page.getByRole("button", { name: "Ẩn bài setup", exact: true }).click();
  await page.locator("#hide-setup-form").getByRole("textbox").fill("Ẩn Setup để kiểm thử");
  await page.locator("#hide-setup-form").getByRole("button", { name: /Xác nhận/ }).click();
  await page.locator("#hide-setup-form").waitFor({ state: "hidden" });
  assert.equal(post.status, "HIDDEN");
  await page.getByRole("button", { name: "Khôi phục hiển thị", exact: true }).click();
  await page.getByRole("button", { name: "Ẩn bài setup", exact: true }).waitFor();
  assert.equal(post.status, "PUBLISHED");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedWrites, []);
  console.log("PASS Admin Setup: form lý do, PUT ẩn/khôi phục, không có lỗi JavaScript");
} catch (error) {
  console.error("Requests:", requests.map(({ method, path }) => `${method} ${path}`));
  console.error("Page:", await page?.locator("body").innerText().catch(() => "unavailable"));
  throw error;
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
