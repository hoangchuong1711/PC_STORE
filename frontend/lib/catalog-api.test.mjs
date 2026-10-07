import assert from "node:assert/strict";
import test from "node:test";

import {
  CatalogApiError,
  createCatalogApi,
} from "./catalog-api.ts";

const product = {
  productId: 42,
  name: "ROG Strix G16 2025",
  description: "Laptop gaming",
  price: 38990000,
  status: "ACTIVE",
  category: { categoryId: 2, name: "Laptop", componentType: "LAPTOP" },
  brand: { brandId: 3, name: "ASUS", logoUrl: null },
  imageUrls: ["/images/rog-g16.jpg"],
  availableQuantity: 8,
  inStock: true,
};

const page = {
  items: [product],
  page: 1,
  size: 12,
  totalItems: 25,
  totalPages: 3,
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("lists catalog products with backend-supported filters", async () => {
  const api = createCatalogApi(async (url, options) => {
    assert.equal(
      url,
      "/api/products?q=rog+strix&categoryId=2&brandId=3&minPrice=1000000&maxPrice=50000000&page=1&size=12",
    );
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    return json(page);
  });

  const result = await api.list({
    q: "rog strix",
    categoryId: 2,
    brandId: 3,
    minPrice: 1_000_000,
    maxPrice: 50_000_000,
    page: 1,
    size: 12,
  });

  assert.equal(result.items[0].productId, 42);
  assert.equal(result.items[0].availableQuantity, 8);
  assert.equal(result.totalItems, 25);
});

test("gets one public product by numeric id", async () => {
  const api = createCatalogApi(async (url, options) => {
    assert.equal(url, "/api/products/42");
    assert.equal(options.method, "GET");
    return json(product);
  });

  const result = await api.getById(42);
  assert.equal(result.name, product.name);
  assert.deepEqual(result.category, product.category);
});

test("rejects invalid product ids before making a request", async () => {
  let calls = 0;
  const api = createCatalogApi(async () => {
    calls += 1;
    return json(product);
  });

  await assert.rejects(api.getById(0), CatalogApiError);
  await assert.rejects(api.getById(1.2), /Product id không hợp lệ/);
  assert.equal(calls, 0);
});

test("preserves backend errors and status codes", async () => {
  const api = createCatalogApi(async () =>
    json({ code: "INVALID_QUERY", message: "maxPrice phải >= minPrice" }, 400),
  );

  await assert.rejects(
    api.list({ minPrice: 50, maxPrice: 10 }),
    (error) => error instanceof CatalogApiError
      && error.status === 400
      && error.code === "INVALID_QUERY"
      && error.message === "maxPrice phải >= minPrice",
  );
});

test("rejects malformed catalog responses instead of exposing partial data", async () => {
  const api = createCatalogApi(async () =>
    json({ items: [{ ...product, price: "not-a-number" }], page: 0, size: 20, totalItems: 1, totalPages: 1 }),
  );

  await assert.rejects(api.list(), /Phản hồi catalog không hợp lệ/);
});

test("loads active categories and brands from their catalog endpoints", async () => {
  const calls = [];
  const api = createCatalogApi(async (url, options) => {
    calls.push([url, options.method]);
    if (url === "/api/categories") {
      return json([{ categoryId: 2, name: "Laptop", description: null, componentType: "LAPTOP" }]);
    }
    return json([{ brandId: 3, name: "ASUS", description: "ASUS Việt Nam", logoUrl: "/asus.svg" }]);
  });

  assert.deepEqual(await api.listCategories(), [
    { categoryId: 2, name: "Laptop", description: null, componentType: "LAPTOP" },
  ]);
  assert.deepEqual(await api.listBrands(), [
    { brandId: 3, name: "ASUS", description: "ASUS Việt Nam", logoUrl: "/asus.svg" },
  ]);
  assert.deepEqual(calls, [["/api/categories", "GET"], ["/api/brands", "GET"]]);
});
