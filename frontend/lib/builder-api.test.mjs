import test from "node:test";
import assert from "node:assert/strict";
import { createBuilderApi } from "./builder-api.ts";

const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const product = {
  productId: 12, name: "CPU", brand: "Intel", componentType: "CPU",
  price: 1000000, availableQuantity: 3, imageUrl: null, spec: { socketCode: "LGA1700" },
};
const report = { status: "UNKNOWN", rules: [{ id: "build_completeness", status: "UNKNOWN", reason: "Thiếu linh kiện" }] };
const build = { buildId: 7, name: "Máy của tôi", sourceType: "MANUAL", items: [], totalAmount: 0, compatibility: report };
const cart = { cartId: 2, items: [], totalAmount: 0 };

test("loads real catalog products and previews unsaved selections", async () => {
  const calls = [];
  const api = createBuilderApi(async (url, options) => {
    calls.push([url, options.method, options.body]);
    return response(url.endsWith("products") ? [product] : report);
  });
  assert.deepEqual(await api.products(), [product]);
  assert.deepEqual(await api.compatibility([{ productId: 12, quantity: 1 }]), report);
  assert.deepEqual(calls, [
    ["/api/builder/products", "GET", undefined],
    ["/api/builder/compatibility", "POST", JSON.stringify({ items: [{ productId: 12, quantity: 1 }] })],
  ]);
});

test("saves a build and adds it to cart through T24", async () => {
  const calls = [];
  const api = createBuilderApi(async (url, options) => {
    calls.push([url, options.method, options.body]);
    return response(url.endsWith("/cart") ? cart : build);
  });
  assert.deepEqual(await api.create({ name: "Máy của tôi", items: [] }), build);
  assert.deepEqual(await api.addToCart(7), cart);
  assert.deepEqual(calls, [
    ["/api/customer/builds", "POST", JSON.stringify({ name: "Máy của tôi", items: [] })],
    ["/api/customer/builds/7/cart", "POST", undefined],
  ]);
});

test("does not turn a backend rejection into success", async () => {
  const api = createBuilderApi(async () => response({ code: "BUILD_NOT_READY", message: "Thiếu spec" }, 409));
  await assert.rejects(api.addToCart(7), (error) => error.status === 409 && error.code === "BUILD_NOT_READY");
});
