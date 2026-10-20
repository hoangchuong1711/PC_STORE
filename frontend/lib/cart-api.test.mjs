import test from "node:test";
import assert from "node:assert/strict";
import { createCartApi } from "./cart-api.ts";

const cart = {
  cartId: 3,
  items: [{ cartItemId: 8, productId: 12, name: "CPU", quantity: 2, unitPrice: 1000000, lineTotal: 2000000, availableQuantity: 4, available: true }],
  totalAmount: 2000000,
};

const response = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status });

test("gets the server cart without inventing a local total", async () => {
  const api = createCartApi(async (url, options) => {
    assert.equal(url, "/api/customer/cart");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    return response(cart);
  });
  assert.deepEqual(await api.get(), cart);
});

test("adds a product with an integer quantity", async () => {
  const api = createCartApi(async (url, options) => {
    assert.equal(url, "/api/customer/cart/items");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { productId: 12, quantity: 2 });
    return response(cart);
  });
  assert.deepEqual(await api.add(12, 2), cart);
});

test("updates and deletes by cartItemId rather than productId", async () => {
  const calls = [];
  const api = createCartApi(async (url, options) => {
    calls.push([url, options.method, options.body]);
    return options.method === "PATCH" ? response(cart) : response(null, 204);
  });
  await api.update(8, 3);
  await api.remove(8);
  assert.deepEqual(calls, [
    ["/api/customer/cart/items/8", "PATCH", JSON.stringify({ quantity: 3 })],
    ["/api/customer/cart/items/8", "DELETE", undefined],
  ]);
});

test("keeps backend error code and message", async () => {
  await assert.rejects(
    createCartApi(async () => response({ code: "OUT_OF_STOCK", message: "Hết hàng" }, 409)).add(12, 1),
    (error) => error.status === 409 && error.code === "OUT_OF_STOCK" && error.message === "Hết hàng",
  );
});

test("rejects malformed successful cart responses", async () => {
  await assert.rejects(createCartApi(async () => response({ cartId: 3 })).get(), /không hợp lệ/);
});
