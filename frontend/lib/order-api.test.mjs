import test from "node:test";
import assert from "node:assert/strict";
import { createOrderApi, OrderApiError } from "./order-api.ts";

const order = {
  orderId: 9,
  orderDate: "2026-10-07T10:00:00",
  status: "PENDING",
  totalAmount: 2000000,
  shippingName: "An",
  shippingPhone: "0901234567",
  shippingAddressText: "Test address",
  deliveredAt: null,
  items: [{ orderItemId: 1, productId: 12, productName: "CPU", quantity: 2, baseUnitPrice: 1000000, unitPrice: 1000000, lineTotal: 2000000 }],
  payment: { paymentId: 2, method: "COD", status: "PENDING", amount: 2000000, paidAt: null },
};
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test("checkout sends server-owned cart request and idempotency key", async () => {
  const api = createOrderApi(async (url, options) => {
    assert.equal(url, "/api/orders");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.headers["Idempotency-Key"], "checkout-abc-123");
    assert.deepEqual(JSON.parse(options.body), { shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "COD" });
    return json(order, 201, { "Idempotent-Replayed": "false" });
  });
  const result = await api.checkout({ shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "COD" }, "checkout-abc-123");
  assert.deepEqual(result.order, order);
  assert.equal(result.replayed, false);
});

test("recognizes replayed checkout response", async () => {
  const result = await createOrderApi(async () => json(order, 200, { "Idempotent-Replayed": "true" }))
    .checkout({ shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "BANK_TRANSFER" }, "checkout-abc-124");
  assert.equal(result.replayed, true);
});

test("rejects an invalid idempotency key before network", async () => {
  let calls = 0;
  const api = createOrderApi(async () => { calls += 1; return json(order, 201); });
  await assert.rejects(api.checkout({ shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "COD" }, "short"), /Idempotency-Key/);
  assert.equal(calls, 0);
});

test("preserves checkout conflict code", async () => {
  await assert.rejects(createOrderApi(async () => json({ code: "OUT_OF_STOCK", message: "Hết hàng" }, 409))
    .checkout({ shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "COD" }, "checkout-abc-125"),
    (error) => error instanceof OrderApiError && error.status === 409 && error.code === "OUT_OF_STOCK");
});

test("loads order history and detail and cancels via the customer endpoints", async () => {
  const calls = [];
  const api = createOrderApi(async (url, options) => {
    calls.push([url, options.method, options.credentials, options.cache]);
    return json(url === "/api/orders" ? [order] : order);
  });
  assert.deepEqual(await api.list(), [order]);
  assert.deepEqual(await api.getById(9), order);
  assert.deepEqual(await api.cancel(9), order);
  assert.deepEqual(calls, [
    ["/api/orders", "GET", "same-origin", "no-store"],
    ["/api/orders/9", "GET", "same-origin", "no-store"],
    ["/api/orders/9/cancel", "POST", "same-origin", "no-store"],
  ]);
});

test("rejects invalid IDs before sending order queries or cancellations", async () => {
  let calls = 0;
  const api = createOrderApi(async () => { calls++; return json(order); });
  for (const id of [0, -1, 1.5, NaN, Infinity]) {
    for (const method of ["getById", "cancel"]) {
      await assert.rejects(api[method](id), e => e instanceof OrderApiError && e.code === "INVALID_ID");
    }
  }
  assert.equal(calls, 0);
});

test("rejects malformed nested checkout data", async () => {
  for (const invalid of [
    { ...order, payment: {} },
    { ...order, items: [{}] },
    { ...order, items: [{ ...order.items[0], quantity: -1 }] },
    { ...order, payment: { ...order.payment, amount: "2000000" } },
    { ...order, deliveredAt: 42 },
  ]) {
    await assert.rejects(createOrderApi(async () => json(invalid)).checkout({
      shippingName: "An", shippingPhone: "0901234567", shippingAddressText: "Test address", paymentMethod: "COD",
    }, "checkout-valid-123"), e => e instanceof OrderApiError && e.code === "INVALID_RESPONSE");
  }
});

test("order history validates every record and allows a missing legacy payment", async () => {
  const legacy = { ...order, payment: null };
  assert.deepEqual(await createOrderApi(async () => json([legacy])).list(), [legacy]);
  for (const body of [{ items: [order] }, [order, { ...order, items: [{}] }]]) {
    await assert.rejects(createOrderApi(async () => json(body)).list(), e => e.code === "INVALID_RESPONSE");
  }
});

test("does not turn authorization failures into an empty history", async () => {
  await assert.rejects(createOrderApi(async () => json({ code: "UNAUTHORIZED", message: "Đăng nhập lại" }, 401)).list(),
    e => e instanceof OrderApiError && e.status === 401 && e.code === "UNAUTHORIZED");
});
