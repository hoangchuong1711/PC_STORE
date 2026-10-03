import assert from "node:assert/strict";
import test from "node:test";

import { filterOrders, getOrderProgress, orders } from "./orders.ts";

test("filters the order history by status", () => {
  assert.equal(filterOrders(orders, "ALL").length, orders.length);
  assert.ok(filterOrders(orders, "DELIVERED").length > 0);
  assert.ok(
    filterOrders(orders, "DELIVERED").every(
      (order) => order.status === "DELIVERED",
    ),
  );
});

test("marks each reached delivery step in order", () => {
  assert.deepEqual(getOrderProgress("SHIPPING"), [
    "PENDING",
    "CONFIRMED",
    "SHIPPING",
  ]);
});

test("cancelled orders do not report delivery progress", () => {
  assert.deepEqual(getOrderProgress("CANCELLED"), []);
});
