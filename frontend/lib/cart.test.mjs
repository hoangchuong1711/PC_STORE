import assert from "node:assert/strict";
import { test } from "node:test";
import { addItem, changeQuantity, parseServerProductId } from "./cart.ts";

test("accepts only canonical backend product ids", () => {
  assert.equal(parseServerProductId(42), 42);
  assert.equal(parseServerProductId("42"), 42);
  assert.equal(parseServerProductId("p42"), null);
  assert.equal(parseServerProductId("product-42"), null);
  assert.equal(parseServerProductId("042"), null);
  assert.equal(parseServerProductId(0), null);
});

test("adding the same product merges quantities without exceeding demo stock", () => {
  const first = addItem([], "p1", 2, 5);
  assert.deepEqual(addItem(first, "p1", 4, 5), [{ id: "p1", quantity: 5 }]);
  assert.deepEqual(first, [{ id: "p1", quantity: 2 }]);
});

test("unavailable items cannot be added and removing a line leaves others intact", () => {
  assert.deepEqual(addItem([], "p1", 1, 0), []);
  assert.deepEqual(
    changeQuantity(
      [
        { id: "p1", quantity: 1 },
        { id: "p2", quantity: 2 },
      ],
      "p1",
      0,
      5,
    ),
    [{ id: "p2", quantity: 2 }],
  );
});
