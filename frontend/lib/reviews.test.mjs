import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductReviews,
  getReviewSummary,
  addReview,
  toggleLikeReview,
  hasUserReviewedProduct,
} from "./reviews.ts";

test("calculates review summary and distribution correctly", () => {
  const summary = getReviewSummary([{ rating: 5 }, { rating: 4 }, { rating: 5 }]);
  assert.equal(summary.totalReviews, 3);
  assert.equal(summary.averageRating, 4.7);
  assert.equal(summary.distribution.length, 5);
});

test("returns default summary when no reviews exist", () => {
  const summary = getReviewSummary("non-existent-product");
  assert.equal(summary.totalReviews, 0);
  assert.equal(summary.averageRating, 0);
});

test("adds review and updates verified buyer flag", () => {
  const newReview = addReview({
    productSlug: "rtx-4070-super-dual",
    orderId: "ord-test-99",
    userName: "Tester",
    rating: 5,
    content: "Đánh giá thử nghiệm hiệu năng rất mượt.",
  });

  assert.equal(newReview.productSlug, "rtx-4070-super-dual");
  assert.equal(newReview.verifiedBuyer, true);
  assert.equal(hasUserReviewedProduct("rtx-4070-super-dual", "ord-test-99"), true);
});

test("toggles like count properly", () => {
  const first = addReview({
    productSlug: "test-product",
    orderId: "test-order",
    userName: "Tester",
    rating: 4,
    content: "Test review",
  });
  const originalLikes = first.likesCount;
  const originallyLiked = Boolean(first.isLiked);

  toggleLikeReview(first.id);
  assert.equal(first.isLiked, !originallyLiked);
  assert.equal(first.likesCount, originalLikes + (first.isLiked ? 1 : -1));

  // Toggle back
  toggleLikeReview(first.id);
  assert.equal(first.likesCount, originalLikes);
});
