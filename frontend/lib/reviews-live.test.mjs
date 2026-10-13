import assert from "node:assert/strict";
import test from "node:test";

import { getProductReviews, getReviewSummary } from "./reviews.ts";

test("empty catalog review state has no fabricated reviews or five-star rating", () => {
  assert.deepEqual(getProductReviews("rog-strix-g16-2025"), []);
  assert.equal(getReviewSummary([]).averageRating, 0);
  assert.equal(getReviewSummary([]).totalReviews, 0);
});
