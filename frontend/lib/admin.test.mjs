import test from "node:test";
import assert from "node:assert/strict";

import {
  filterAdminOrders,
  filterAdminProducts,
  getNextOrderStatuses,
} from "./admin.ts";

const products = [
  { id: "p1", name: "Creator Pro X", brand: "PC Store", category: "PC Gaming", price: 52_990_000, stock: 3, status: "ACTIVE" },
  { id: "p2", name: "ROG Strix G16", brand: "ASUS", category: "Laptop", price: 38_990_000, stock: 0, status: "OUT_OF_STOCK" },
  { id: "p3", name: "Fury 32GB", brand: "Kingston", category: "Linh kiện", price: 2_190_000, stock: 18, status: "DRAFT" },
];

const orders = [
  { id: "o1", code: "PCS-001", customerName: "Minh Anh", customerEmail: "minh@example.com", createdAt: "2026-10-01T10:00:00+07:00", total: 12_000_000, status: "PENDING", paymentMethod: "COD", paymentStatus: "PENDING", itemCount: 2 },
  { id: "o2", code: "PCS-002", customerName: "Lan Phương", customerEmail: "lan@example.com", createdAt: "2026-10-02T10:00:00+07:00", total: 25_000_000, status: "SHIPPING", paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID", itemCount: 1 },
];

test("filters admin products by query, status and stock", () => {
  assert.deepEqual(
    filterAdminProducts(products, { query: "rog", status: "ALL", stock: "ALL" }).map((product) => product.id),
    ["p2"],
  );
  assert.deepEqual(
    filterAdminProducts(products, { query: "", status: "ACTIVE", stock: "LOW" }).map((product) => product.id),
    ["p1"],
  );
});

test("filters admin orders by query and status", () => {
  assert.deepEqual(
    filterAdminOrders(orders, { query: "lan", status: "SHIPPING", paymentStatus: "ALL" }).map((order) => order.id),
    ["o2"],
  );
  assert.deepEqual(
    filterAdminOrders(orders, { query: "", status: "ALL", paymentStatus: "PENDING" }).map((order) => order.id),
    ["o1"],
  );
});

test("returns only valid next statuses for an admin order", () => {
  assert.deepEqual(getNextOrderStatuses("PENDING"), ["CONFIRMED", "CANCELLED"]);
  assert.deepEqual(getNextOrderStatuses("CONFIRMED"), ["SHIPPING", "CANCELLED"]);
  assert.deepEqual(getNextOrderStatuses("SHIPPING"), ["DELIVERED"]);
  assert.deepEqual(getNextOrderStatuses("DELIVERED"), []);
  assert.deepEqual(getNextOrderStatuses("CANCELLED"), []);
});
