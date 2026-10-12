import assert from "node:assert/strict";
import { test } from "node:test";
import * as cart from "./cart.ts";

test("selection totals only checked lines and tracks changed quantities", () => {
  assert.equal(typeof cart.summarizeSelection, "function");
  const lines = [
    { id: "1", cartItemId: 11, unitPrice: 100, quantity: 2 },
    { id: "2", cartItemId: 12, unitPrice: 50, quantity: 3 },
  ];
  assert.deepEqual(cart.summarizeSelection(lines, ["1"]), { subtotal: 200, cartItemIds: [11] });
  assert.deepEqual(cart.summarizeSelection(lines, ["1", "2"]), { subtotal: 350, cartItemIds: [11, 12] });
  assert.deepEqual(cart.summarizeSelection(lines, []), { subtotal: 0, cartItemIds: [] });
  assert.deepEqual(cart.summarizeSelection(lines, ["missing"]), { subtotal: 0, cartItemIds: [] });
  assert.equal(cart.summarizeSelection([{ ...lines[0], quantity: 3 }], ["1"]).subtotal, 300);
});
