import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardData } from "./dashboard.ts";

test("dashboard totals and trend come from current server records", () => {
  const products = [
    { productId: 1, name: "CPU", status: "ACTIVE", availableQuantity: 2 },
    { productId: 2, name: "GPU", status: "DRAFT", availableQuantity: 0 },
    { productId: 3, name: "RAM", status: "ACTIVE", availableQuantity: 9 },
  ];
  const orders = [
    { orderId: 1, orderDate: "2026-10-12T10:00:00", status: "DELIVERED", totalAmount: 1200000, payment: { status: "PAID" } },
    { orderId: 2, orderDate: "2026-10-13T08:00:00", status: "PENDING", totalAmount: 500000, payment: { status: "PENDING" } },
    { orderId: 3, orderDate: "2026-09-01T10:00:00", status: "DELIVERED", totalAmount: 2000000, payment: { status: "PAID" } },
  ];

  const result = buildDashboardData(products, orders, new Date("2026-10-13T12:00:00+07:00"));

  assert.equal(result.activeProducts.length, 2);
  assert.deepEqual(result.lowStockProducts.map((p) => p.productId), [1]);
  assert.equal(result.pendingOrders, 1);
  assert.equal(result.paidRevenue, 3200000);
  assert.deepEqual(result.recentOrders.map((o) => o.orderId), [2, 1, 3]);
  assert.equal(result.trend.length, 7);
  assert.equal(result.trend.at(-1).orders, 1);
  assert.equal(result.trend.at(-1).revenue, 0);
  assert.equal(result.trend.at(-2).revenue, 1200000);
});
