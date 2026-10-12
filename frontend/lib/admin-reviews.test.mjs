import assert from "node:assert/strict";
import { test } from "node:test";
import * as reviews from "./admin-reviews.ts";

test("average changes from 3 to 5 when one-star review is hidden and back on restore", () => {
  assert.equal(typeof reviews.publishedAverage, "function");
  const five = { rating: 5, status: "PUBLISHED" };
  const one = { rating: 1, status: "PUBLISHED" };
  assert.equal(reviews.publishedAverage([five, one]), 3);
  assert.equal(reviews.publishedAverage([five, { ...one, status: "HIDDEN" }]), 5);
  assert.equal(reviews.publishedAverage([five, one]), 3);
  assert.equal(reviews.publishedAverage([{ ...one, status: "HIDDEN" }]), 0);
  assert.equal(reviews.publishedAverage([]), 0);
});
