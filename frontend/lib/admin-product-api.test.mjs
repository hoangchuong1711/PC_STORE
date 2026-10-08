import test from "node:test";
import assert from "node:assert/strict";
import { createAdminProductApi } from "./admin-product-api.ts";
import { collectProductSpec, productSpecFields } from "./product-spec-fields.ts";

const sampleProduct = {
  productId: 101,
  name: "Intel Core i9-14900K",
  description: "24 cores 32 threads",
  price: 15490000,
  status: "ACTIVE",
  categoryId: 1,
  categoryName: "CPU",
  brandId: 2,
  brandName: "Intel",
  quantityOnHand: 20,
  reservedQuantity: 2,
  availableQuantity: 18,
};

const json = (val, status = 200) => new Response(JSON.stringify(val), { status });

test("exposes the documented fields for every Builder component", () => {
  assert.deepEqual(Object.keys(productSpecFields).sort(),
    ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER"].sort());
  assert.deepEqual(collectProductSpec("CASE", {
    maxGpuLengthMm: "350", maxCoolerHeightMm: "170", maxRadiatorSizeMm: "0",
    supportedFormFactors: "ATX, Micro-ATX",
  }), {
    maxGpuLengthMm: 350, maxCoolerHeightMm: 170, maxRadiatorSizeMm: 0,
    supportedFormFactors: ["ATX", "Micro-ATX"],
  });
  assert.throws(() => collectProductSpec("CPU", { socketCode: "AM5" }), /Số nhân/);
});

test("sends spec and reads it back from product detail", async () => {
  const calls = [];
  const spec = { socketCode: "AM5", cores: 6, threads: 12,
    baseClockGhz: 3.5, boostClockGhz: 4.4, tdpWatts: 65 };
  const api = createAdminProductApi(async (url, options) => {
    calls.push([url, options.method, options.body && JSON.parse(options.body)]);
    return json({ ...sampleProduct, spec }, options.method === "POST" ? 201 : 200);
  });
  await api.create({ name: "CPU", price: 100, categoryId: 1, brandId: 2,
    quantityOnHand: 1, spec });
  const detail = await api.get(101);
  assert.deepEqual(calls[0][2].spec, spec);
  assert.deepEqual(calls[1], ["/api/admin/products/101", "GET", undefined]);
  assert.deepEqual(detail.spec, spec);
});

test("creates product sending json payload and returns mapped item", async () => {
  const calls = [];
  const api = createAdminProductApi(async (url, options) => {
    calls.push([url, options.method, JSON.parse(options.body), options.credentials, options.cache]);
    return json(sampleProduct, 201);
  });

  const res = await api.create({
    name: "Intel Core i9-14900K",
    description: "24 cores 32 threads",
    price: 15490000,
    categoryId: 1,
    brandId: 2,
    status: "ACTIVE",
    quantityOnHand: 20,
  });

  assert.equal(res.productId, 101);
  assert.equal(res.name, "Intel Core i9-14900K");
  assert.deepEqual(calls[0], [
    "/api/admin/products",
    "POST",
    {
      name: "Intel Core i9-14900K",
      description: "24 cores 32 threads",
      price: 15490000,
      categoryId: 1,
      brandId: 2,
      status: "ACTIVE",
      quantityOnHand: 20,
    },
    "same-origin",
    "no-store",
  ]);
});

test("updates product via PATCH", async () => {
  const calls = [];
  const api = createAdminProductApi(async (url, options) => {
    calls.push([url, options.method, JSON.parse(options.body)]);
    return json({ ...sampleProduct, price: 14990000 });
  });

  const res = await api.update(101, { price: 14990000 });
  assert.equal(res.price, 14990000);
  assert.deepEqual(calls[0], ["/api/admin/products/101", "PATCH", { price: 14990000 }]);
});

test("updates inventory via PATCH to inventory subpath", async () => {
  const calls = [];
  const api = createAdminProductApi(async (url, options) => {
    calls.push([url, options.method, JSON.parse(options.body)]);
    return json({
      productId: 101,
      quantityOnHand: 50,
      reservedQuantity: 2,
      availableQuantity: 48,
    });
  });

  const res = await api.updateInventory(101, { quantityOnHand: 50 });
  assert.equal(res.quantityOnHand, 50);
  assert.deepEqual(calls[0], ["/api/admin/products/101/inventory", "PATCH", { quantityOnHand: 50 }]);
});

test("rejects invalid inputs before sending request", async () => {
  const api = createAdminProductApi(async () => json({}));
  await assert.rejects(
    api.create({ name: "", price: 100, categoryId: 1, brandId: 1, quantityOnHand: 1 }),
    (e) => e.code === "INVALID_INPUT",
  );
  await assert.rejects(
    api.update(-5, { price: 100 }),
    (e) => e.code === "INVALID_ID",
  );
});

test("preserves backend errors and handles network failure", async () => {
  const api403 = createAdminProductApi(async () =>
    json({ code: "FORBIDDEN", message: "Không có quyền quản trị" }, 403),
  );
  await assert.rejects(
    api403.update(101, { price: 1000 }),
    (e) => e.status === 403 && e.code === "FORBIDDEN",
  );

  const apiOffline = createAdminProductApi(async () => {
    throw new Error("offline");
  });
  await assert.rejects(
    apiOffline.update(101, { price: 1000 }),
    (e) => e.code === "NETWORK_ERROR",
  );
});

test("lists products via GET /api/admin/products", async () => {
  const calls = [];
  const api = createAdminProductApi(async (url, options) => {
    calls.push([url, options.method]);
    return json([sampleProduct], 200);
  });

  const res = await api.list();
  assert.equal(res.length, 1);
  assert.equal(res[0].productId, 101);
  assert.deepEqual(calls[0], ["/api/admin/products", "GET"]);
});
