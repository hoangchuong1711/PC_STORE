import test from "node:test";
import assert from "node:assert/strict";
import { createAdminOrderApi } from "./admin-order-api.ts";

const sampleOrder = {
  orderId: 55,
  orderDate: "2026-10-07T10:00:00Z",
  status: "PENDING",
  totalAmount: 15490000,
  shippingName: "Nguyen Van A",
  shippingPhone: "0901234567",
  shippingAddressText: "123 Tran Hung Dao",
  deliveredAt: null,
  items: [
    {
      orderItemId: 1,
      productId: 101,
      productName: "Intel Core i9-14900K",
      quantity: 1,
      baseUnitPrice: 15490000,
      unitPrice: 15490000,
      lineTotal: 15490000,
    },
  ],
  payment: {
    paymentId: 10,
    method: "COD",
    status: "PENDING",
    amount: 15490000,
    paidAt: null,
  },
};

const json = (val, status = 200) => new Response(JSON.stringify(val), { status });

test("lists admin orders using GET /api/admin/orders", async () => {
  const calls = [];
  const api = createAdminOrderApi(async (url, options) => {
    calls.push([url, options.method, options.credentials, options.cache]);
    return json([sampleOrder]);
  });

  const orders = await api.list();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].orderId, 55);
  assert.deepEqual(calls[0], ["/api/admin/orders", "GET", "same-origin", "no-store"]);
});

test("gets single order by id using GET /api/admin/orders/{id}", async () => {
  const calls = [];
  const api = createAdminOrderApi(async (url, options) => {
    calls.push([url, options.method]);
    return json(sampleOrder);
  });

  const order = await api.getById(55);
  assert.equal(order.orderId, 55);
  assert.deepEqual(calls[0], ["/api/admin/orders/55", "GET"]);
});

test("updates order status using PUT /api/admin/orders/{id}/status", async () => {
  const calls = [];
  const api = createAdminOrderApi(async (url, options) => {
    calls.push([url, options.method, JSON.parse(options.body)]);
    return json({ ...sampleOrder, status: "CONFIRMED" });
  });

  const updated = await api.updateStatus(55, "CONFIRMED");
  assert.equal(updated.status, "CONFIRMED");
  assert.deepEqual(calls[0], ["/api/admin/orders/55/status", "PUT", { status: "CONFIRMED" }]);
});

test("rejects invalid ids and preserves backend error", async () => {
  const api = createAdminOrderApi(async () => json({}));
  await assert.rejects(api.getById(-1), (e) => e.code === "INVALID_ID");
  await assert.rejects(api.updateStatus(0, "CONFIRMED"), (e) => e.code === "INVALID_ID");

  const api404 = createAdminOrderApi(async () =>
    json({ code: "RESOURCE_NOT_FOUND", message: "Đơn hàng không tồn tại" }, 404),
  );
  await assert.rejects(api404.getById(999), (e) => e.status === 404 && e.code === "RESOURCE_NOT_FOUND");
});
