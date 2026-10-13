import assert from "node:assert/strict";
import test from "node:test";

import {
  addAvailableCommunityComponents,
  prepareCommunityComponents,
  resolveCommunityComponents,
} from "./community-catalog.ts";

const catalogProduct = {
  productId: 42,
  name: "PC Creator Pro X",
  description: "Workstation",
  price: 52_990_000,
  status: "ACTIVE",
  category: { categoryId: 2, name: "PC Gaming", componentType: null },
  brand: { brandId: 3, name: "PC Store", logoUrl: null },
  imageUrls: [],
  availableQuantity: 3,
  inStock: true,
};

test("uses the setup productId and refreshes price from the catalog", async () => {
  const calls = [];
  const [component] = await resolveCommunityComponents(
    [{ productId: 42, name: "Stale name", category: "Old", price: 1 }],
    {
      async getById(id) {
        calls.push(["id", id]);
        return catalogProduct;
      },
      async findExactByName(name) {
        calls.push(["name", name]);
        return null;
      },
    },
  );

  assert.deepEqual(calls, [["id", 42]]);
  assert.equal(component.productId, 42);
  assert.equal(component.slug, "42");
  assert.equal(component.name, catalogProduct.name);
  assert.equal(component.price, catalogProduct.price);
  assert.equal(component.catalogState, "available");
});

test("never turns a legacy mock id into a backend product id", async () => {
  const prepared = prepareCommunityComponents([
    { slug: "pc-creator-pro-x", name: "PC Creator Pro X", category: "PC", price: 1 },
  ]);
  assert.equal(prepared[0].productId, undefined);
  assert.equal(prepared[0].slug, undefined);
  assert.equal(prepared[0].price, undefined);

  const [missing] = await resolveCommunityComponents(prepared, {
    async getById() {
      assert.fail("a mock component must not be looked up by a guessed id");
    },
    async findExactByName() {
      return null;
    },
  });
  assert.equal(missing.catalogState, "unavailable");
  assert.equal(missing.productId, undefined);
});

test("looks up a legacy setup by its own name without a hardcoded catalog map", async () => {
  const lookedUp = [];
  const resolved = await resolveCommunityComponents(
    [
      { slug: "keychron-q1-pro", name: "Keychron Q1 Pro Custom", category: "Phụ kiện" },
      { slug: "rtx-4070-super-dual", name: "RTX 4070 Super Dual", category: "Linh kiện" },
    ],
    {
      async getById() {
        assert.fail("legacy components must use canonical catalog names");
      },
      async findExactByName(name) {
        lookedUp.push(name);
        return {
          ...catalogProduct,
          productId: name.startsWith("Keychron") ? 52 : 53,
          name,
          availableQuantity: 5,
        };
      },
    },
  );

  assert.deepEqual(lookedUp, ["Keychron Q1 Pro Custom", "RTX 4070 Super Dual"]);
  assert.deepEqual(resolved.map((item) => item.catalogState), ["available", "available"]);
  assert.deepEqual(resolved.map((item) => item.availableQuantity), [5, 5]);
});

test("adds a setup sequentially and skips unavailable catalog items", async () => {
  const calls = [];
  let active = 0;
  let maxActive = 0;
  const result = await addAvailableCommunityComponents(
    [
      { ...catalogProduct, category: "PC", catalogState: "available", slug: "42" },
      { name: "Legacy mock", category: "PC", catalogState: "unavailable" },
      { name: "Out", category: "GPU", productId: 43, catalogState: "out-of-stock" },
      { name: "Second", category: "GPU", productId: 44, catalogState: "available" },
    ],
    async (productId, quantity) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push([productId, quantity]);
      await Promise.resolve();
      active -= 1;
    },
  );

  assert.deepEqual(calls, [[42, 1], [44, 1]]);
  assert.equal(maxActive, 1);
  assert.deepEqual(result, { added: 2, failed: 0, skipped: 2 });
});
