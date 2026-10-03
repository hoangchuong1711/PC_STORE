import assert from "node:assert/strict";
import { test } from "node:test";
import { addItem, changeQuantity } from "./cart.ts";

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
