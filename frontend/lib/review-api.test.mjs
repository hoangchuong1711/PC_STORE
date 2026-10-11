import test from "node:test";
import assert from "node:assert/strict";
import { createReviewApi, ReviewApiError } from "./review-api.ts";

const sampleReview = {
  reviewId: 1,
  orderItemId: 10,
  orderId: 5,
  productId: 1,
  productName: "AMD Ryzen 5 7600",
  author: { userId: 2, fullName: "Test User" },
  rating: 5,
  content: "Hiệu năng rất tốt, mát mẻ.",
  status: "PUBLISHED",
  media: [],
  likeCount: 3,
  likedByCurrentUser: false,
  verifiedPurchase: true,
};

const sampleSummary = {
  productId: 1,
  averageRating: 4.8,
  totalReviews: 12,
  distribution: [
    { rating: 5, count: 10, percentage: 83.33 },
    { rating: 4, count: 2, percentage: 16.67 },
    { rating: 3, count: 0, percentage: 0 },
    { rating: 2, count: 0, percentage: 0 },
    { rating: 1, count: 0, percentage: 0 },
  ],
};

const samplePage = {
  items: [sampleReview],
  page: 0,
  size: 20,
  totalItems: 1,
  totalPages: 1,
  summary: sampleSummary,
};

const response = (body, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status });

test("lists reviews via GET /api/reviews", async () => {
  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/reviews?productId=1&page=0&size=20&rating=5&hasMedia=true&sort=helpful");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    return response(samplePage);
  });

  const res = await api.list({
    productId: 1,
    page: 0,
    size: 20,
    rating: 5,
    hasMedia: true,
    sort: "HELPFUL",
  });
  assert.deepEqual(res, samplePage);
});

test("gets review summary via GET /api/reviews/summary", async () => {
  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/reviews/summary?productId=1");
    assert.equal(options.method, "GET");
    return response(sampleSummary);
  });

  const summary = await api.summary(1);
  assert.deepEqual(summary, sampleSummary);
});

test("creates review via POST /api/customer/reviews", async () => {
  const payload = {
    orderItemId: 10,
    productId: 1,
    rating: 5,
    content: "Hiệu năng rất tốt, mát mẻ.",
    mediaIds: ["27000000-0000-0000-0000-000000000001"],
  };

  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/customer/reviews");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), payload);
    return response(sampleReview, 201);
  });

  const created = await api.create(payload);
  assert.deepEqual(created, sampleReview);
});

test("gets review by order item via GET /api/customer/reviews/order-items/{id}", async () => {
  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/customer/reviews/order-items/10");
    assert.equal(options.method, "GET");
    return response(sampleReview);
  });

  const result = await api.getByOrderItem(10);
  assert.deepEqual(result, sampleReview);
});

test("returns null when review for order item does not exist (404)", async () => {
  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/customer/reviews/order-items/999");
    return response({ code: "REVIEW_NOT_FOUND", message: "Chưa có review" }, 404);
  });

  const result = await api.getByOrderItem(999);
  assert.equal(result, null);
});

test("likes and unlikes review via PUT/DELETE /api/customer/reviews/{id}/like", async () => {
  const likeApi = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/customer/reviews/1/like");
    assert.equal(options.method, "PUT");
    return response({ reviewId: 1, likesCount: 4, isLiked: true });
  });

  const liked = await likeApi.like(1);
  assert.deepEqual(liked, { reviewId: 1, likesCount: 4, isLiked: true });

  const unlikeApi = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/customer/reviews/1/like");
    assert.equal(options.method, "DELETE");
    return response({ reviewId: 1, likesCount: 3, isLiked: false });
  });

  const unliked = await unlikeApi.unlike(1);
  assert.deepEqual(unliked, { reviewId: 1, likesCount: 3, isLiked: false });
});

test("moderates review via PATCH /api/admin/reviews/{id}/moderation", async () => {
  const moderationPayload = {
    status: "HIDDEN",
    moderationReason: "Nội dung vi phạm quy chuẩn",
  };

  const expectedResult = {
    reviewId: 1,
    status: "HIDDEN",
    moderationReason: "Nội dung vi phạm quy chuẩn",
    moderatedBy: 1,
    moderatedAt: "2026-10-11T12:00:00",
  };

  const api = createReviewApi(async (url, options) => {
    assert.equal(url, "/api/admin/reviews/1/moderation");
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), moderationPayload);
    return response(expectedResult);
  });

  const moderated = await api.moderate(1, moderationPayload);
  assert.deepEqual(moderated, expectedResult);
});
