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
  { id: "o2", code: "PCS-002", customerName: "Lan Phương", customerEmail: "lan@example.com", createdAt: "2026-10-02T10:00:00+07:00", total: 25_000_000, status: "SHIPPING", paymentMethod: "VNPAY", paymentStatus: "PAID", itemCount: 1 },
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
  assert.deepEqual(
    filterAdminProducts(products, { query: "", category: "Linh kiện", brand: "ALL", status: "ALL", stock: "ALL" }).map((product) => product.id),
    ["p3"],
  );
  assert.deepEqual(
    filterAdminProducts(products, { query: "", category: "ALL", brand: "ASUS", status: "ALL", stock: "ALL" }).map((product) => product.id),
    ["p2"],
  );
});

test("filters admin orders by query, status and dateRange", () => {
  assert.deepEqual(
    filterAdminOrders(orders, { query: "lan", status: "SHIPPING", paymentStatus: "ALL" }).map((order) => order.id),
    ["o2"],
  );
  assert.deepEqual(
    filterAdminOrders(orders, { query: "", status: "ALL", paymentStatus: "PENDING" }).map((order) => order.id),
    ["o1"],
  );
  assert.deepEqual(
    filterAdminOrders(orders, { query: "", status: "ALL", paymentStatus: "ALL", dateRange: "7DAYS" }).map((order) => order.id),
    ["o1", "o2"],
  );
});

import { filterAdminReviews } from "./admin-reviews.ts";
import { filterAdminUsers } from "./admin-users.ts";

test("returns only valid next statuses for an admin order", () => {
  assert.deepEqual(getNextOrderStatuses("PENDING"), ["CONFIRMED", "CANCELLED"]);
  assert.deepEqual(getNextOrderStatuses("CONFIRMED"), ["SHIPPING", "CANCELLED"]);
  assert.deepEqual(getNextOrderStatuses("SHIPPING"), ["DELIVERED"]);
  assert.deepEqual(getNextOrderStatuses("DELIVERED"), []);
  assert.deepEqual(getNextOrderStatuses("CANCELLED"), []);
});

test("filters admin reviews by query, rating, status, and media", () => {
  const reviews = [
    { id: "r1", productName: "ROG Strix", userName: "Tuấn", content: "Máy chạy êm", rating: 5, status: "PUBLISHED", images: ["img1.jpg"] },
    { id: "r2", productName: "RTX 4070", userName: "Bình", content: "Card mạnh nhưng hơi nóng", rating: 3, status: "HIDDEN", images: [] },
  ];

  assert.deepEqual(
    filterAdminReviews(reviews, { query: "4070", rating: "ALL", status: "ALL", hasMedia: "ALL" }).map((r) => r.id),
    ["r2"],
  );
  assert.deepEqual(
    filterAdminReviews(reviews, { query: "", rating: 5, status: "ALL", hasMedia: "ALL" }).map((r) => r.id),
    ["r1"],
  );
  assert.deepEqual(
    filterAdminReviews(reviews, { query: "", rating: "ALL", status: "PUBLISHED", hasMedia: "YES" }).map((r) => r.id),
    ["r1"],
  );
  assert.deepEqual(
    filterAdminReviews(reviews, { query: "", rating: "ALL", status: "ALL", hasMedia: "NO" }).map((r) => r.id),
    ["r2"],
  );
});

test("filters admin users by query, role, and status", () => {
  const users = [
    { id: "u1", name: "Minh Anh", email: "admin@pcstore.vn", phone: "0903999888", role: "ADMIN", status: "ACTIVE" },
    { id: "u2", name: "Trần Đức", email: "duc@example.com", phone: "0909123456", role: "CUSTOMER", status: "ACTIVE" },
    { id: "u3", name: "Vũ Nam", email: "nam@gmail.com", phone: "0933112233", role: "CUSTOMER", status: "BANNED" },
  ];

  assert.deepEqual(
    filterAdminUsers(users, { query: "0909", role: "ALL", status: "ALL" }).map((u) => u.id),
    ["u2"],
  );
  assert.deepEqual(
    filterAdminUsers(users, { query: "", role: "ADMIN", status: "ALL" }).map((u) => u.id),
    ["u1"],
  );
  assert.deepEqual(
    filterAdminUsers(users, { query: "", role: "ALL", status: "BANNED" }).map((u) => u.id),
    ["u3"],
  );
});


