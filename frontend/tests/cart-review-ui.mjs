// Controlled HTTP fixtures: checks real React interactions without writing shared data.
// PLAYWRIGHT_MODULE may point to a temporary installation of playwright.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const importPackage = createRequire(import.meta.url);
const { chromium } = importPackage(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });
  try {
    const context = await browser.newContext();
    let role = 'CUSTOMER';
    let cartItems = [
      { cartItemId: 11, productId: 101, name: 'Test CPU', quantity: 2, unitPrice: 100000, lineTotal: 200000, availableQuantity: 10, available: true },
      { cartItemId: 12, productId: 102, name: 'Test RAM', quantity: 1, unitPrice: 50000, lineTotal: 50000, availableQuantity: 10, available: true },
    ];
    let checkoutPayload;
    let rejectModeration = false;
    const reviews = [5, 1].map((rating, index) => ({ reviewId: index + 1, productId: 101, productName: 'Test CPU', orderId: index + 1, orderItemId: index + 1,
      userName: `Reviewer ${rating}`, rating, content: `Review ${rating}`, status: 'PUBLISHED', likesCount: 0, images: [], verifiedBuyer: true }));
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { userId: 1, fullName: 'Test Buyer', email: 'test@example.test', phone: '0901234567', role } });
      if (path === '/api/customer/cart') return route.fulfill({ json: { cartId: 1, items: cartItems, totalAmount: cartItems.reduce((sum, item) => sum + item.lineTotal, 0) } });
      if (path === '/api/customer/addresses') return route.fulfill({ json: [] });
      if (path === '/api/orders' && route.request().method() === 'POST') {
        checkoutPayload = route.request().postDataJSON();
        cartItems = cartItems.filter(item => !checkoutPayload.cartItemIds.includes(item.cartItemId));
        return route.fulfill({ status: 201, json: { orderId: 9, orderDate: '2026-10-12T10:00:00', status: 'PENDING', totalAmount: 200000, ...checkoutPayload, deliveredAt: null,
          items: [{ orderItemId: 1, productId: 101, productName: 'Test CPU', quantity: 2, baseUnitPrice: 100000, unitPrice: 100000, lineTotal: 200000 }],
          payment: { paymentId: 1, method: 'COD', status: 'PENDING', amount: 200000, paidAt: null } } });
      }
      if (path === '/api/admin/reviews') return route.fulfill({ json: reviews });
      if (path.endsWith('/moderation')) {
        if (rejectModeration) return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR', message: 'Test moderation failed' } });
        const row = reviews.find(item => item.reviewId === Number(path.split('/')[4]));
        Object.assign(row, route.request().postDataJSON());
        return route.fulfill({ json: row });
      }
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${BASE}/cart`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Giỏ hàng/ }).first().click();
    const drawer = page.getByRole('dialog', { name: 'Giỏ hàng xem nhanh' });
    await drawer.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).uncheck();
    assert.match(await drawer.locator('.cart-drawer-subtotal').innerText(), /200\.000/);
    await drawer.getByRole('checkbox', { name: /Chọn tất cả/ }).check();
    await drawer.getByRole('checkbox', { name: /Chọn tất cả/ }).uncheck();
    assert.equal(await drawer.getByRole('button', { name: /Thanh toán ngay/ }).isDisabled(), true);
    await drawer.getByRole('checkbox', { name: 'Chọn Test CPU', exact: true }).check();
    await drawer.getByRole('button', { name: /Thanh toán ngay/ }).click();
    await page.waitForURL('**/checkout');
    assert.equal(await page.getByRole('complementary', { name: 'Tóm tắt đơn hàng' }).getByText('Test RAM', { exact: false }).count(), 0);
    await page.getByRole('link', { name: /1. Giỏ hàng/ }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).isChecked(), false);
    console.log('PASS drawer selection, total, empty guard and checkout selection');
    await page.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).uncheck();
    const summary = page.getByRole('complementary', { name: 'Tóm tắt đơn hàng' });
    await summary.getByText('Tạm tính hàng (1 món đã chọn)', { exact: true }).waitFor();
    assert.match(await summary.innerText(), /200\.000/);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).isChecked(), false);
    await page.getByRole('checkbox', { name: /Chọn tất cả/ }).check();
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).isChecked(), true);
    await page.getByRole('checkbox', { name: /Chọn tất cả/ }).uncheck();
    assert.equal(await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).isDisabled(), true);
    await page.getByRole('checkbox', { name: 'Chọn Test CPU', exact: true }).check();
    await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).click();
    await page.waitForURL('**/checkout');
    assert.equal(await summary.getByText('Test RAM', { exact: false }).count(), 0);
    await page.getByLabel('Họ và tên người nhận').fill('Test Buyer');
    await page.getByLabel('Số điện thoại liên hệ').fill('0901234567');
    await page.getByLabel('Địa chỉ chi tiết').fill('123 Test Street');
    await page.getByRole('button', { name: 'Xác nhận đặt đơn' }).click();
    await page.getByText('Đơn hàng đã được ghi nhận!', { exact: true }).waitFor();
    assert.deepEqual(checkoutPayload.cartItemIds, [11]);
    await page.getByRole('link', { name: /1. Giỏ hàng/ }).click();
    await page.getByRole('checkbox', { name: 'Chọn Test RAM', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Chọn Test CPU', exact: true }).count(), 0);
    console.log('PASS cart selection, select all, empty guard, focus persistence, payload, remaining cart');

    role = 'ADMIN';
    await page.goto(`${BASE}/admin/reviews`);
    await page.waitForLoadState('networkidle');
    await page.getByText('3.0 ★', { exact: true }).waitFor();
    const row = page.getByRole('row').filter({ hasText: 'Reviewer 1' });
    await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('Test moderation');
    await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
    await page.getByText('5.0 ★', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
    await row.getByRole('button', { name: 'Hiện', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Xác nhận|Khôi phục/ }).click();
    await page.getByText('3.0 ★', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
    rejectModeration = true;
    await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('Test failure');
    await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
    await page.getByText('Test moderation failed', { exact: true }).waitFor();
    assert.equal(await page.getByText('3.0 ★', { exact: true }).count(), 1);
    assert.equal(reviews[1].status, 'PUBLISHED');
    console.log('PASS review hide/restore average and failure keeps published state');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
