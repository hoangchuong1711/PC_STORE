import test from "node:test";
import assert from "node:assert/strict";
import { createCommunityApi, CommunityApiError } from "./community-api.ts";

const samplePost = {
  postId: 1,
  authorId: 10,
  title: "Góc làm việc RGB",
  description: "Setup tối giản phong cách cyberpunk",
  status: "PUBLISHED",
  createdAt: "2026-10-11T10:00:00",
  updatedAt: "2026-10-11T10:00:00",
  mediaIds: ["11111111-1111-1111-1111-111111111111"],
  products: [{ productId: 101, name: "Bàn phím cơ DareU EK87" }],
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("feed calls GET /api/setups with query parameters", async () => {
  const mockTransport = async (url, options) => {
    assert.equal(url, "/api/setups?offset=10&limit=5");
    assert.equal(options.method, "GET");
    return jsonResponse([samplePost]);
  };

  const api = createCommunityApi(mockTransport);
  const posts = await api.feed(10, 5);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].postId, 1);
});

test("ranking calls GET /api/setups/ranking", async () => {
  const mockRanked = [{ post: samplePost, likeCount: 42, liked: true }];
  const mockTransport = async (url, options) => {
    assert.equal(url, "/api/setups/ranking?offset=0&limit=10");
    assert.equal(options.method, "GET");
    return jsonResponse(mockRanked);
  };

  const api = createCommunityApi(mockTransport);
  const res = await api.ranking(0, 10);
  assert.equal(res.length, 1);
  assert.equal(res[0].likeCount, 42);
  assert.equal(res[0].liked, true);
});

test("getById returns post or null on 404", async () => {
  const mockTransport = async (url) => {
    if (url === "/api/setups/1") return jsonResponse(samplePost);
    return jsonResponse({ code: "SETUP_NOT_FOUND", message: "Not found" }, 404);
  };

  const api = createCommunityApi(mockTransport);
  const post = await api.getById(1);
  assert.equal(post?.title, "Góc làm việc RGB");

  const missing = await api.getById(999);
  assert.equal(missing, null);
});

test("create sends POST with JSON body and returns created post", async () => {
  const input = {
    title: "Setup mới",
    description: "Mô tả góc máy",
    mediaIds: ["11111111-1111-1111-1111-111111111111"],
    productIds: [101],
  };

  const mockTransport = async (url, options) => {
    assert.equal(url, "/api/customer/setups");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), input);
    return jsonResponse(samplePost, 201);
  };

  const api = createCommunityApi(mockTransport);
  const created = await api.create(input);
  assert.equal(created.postId, 1);
});

test("checkEligibility queries /api/customer/setups/eligibility", async () => {
  const mockTransport = async (url) => {
    assert.equal(url, "/api/customer/setups/eligibility");
    return jsonResponse({ eligible: true, reason: null });
  };

  const api = createCommunityApi(mockTransport);
  const eligibility = await api.checkEligibility();
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.reason, null);
});

test("like and unlike update like state", async () => {
  const mockTransport = async (url, options) => {
    if (options.method === "PUT") {
      assert.equal(url, "/api/setup-likes/1");
      return jsonResponse({ postId: 1, likeCount: 5, liked: true });
    }
    if (options.method === "DELETE") {
      assert.equal(url, "/api/setup-likes/1");
      return jsonResponse({ postId: 1, likeCount: 4, liked: false });
    }
    throw new Error("Unexpected method: " + options.method);
  };

  const api = createCommunityApi(mockTransport);
  const liked = await api.like(1);
  assert.equal(liked.liked, true);
  assert.equal(liked.likeCount, 5);

  const unliked = await api.unlike(1);
  assert.equal(unliked.liked, false);
  assert.equal(unliked.likeCount, 4);
});

test("adminList and adminModerate operate on moderation endpoints", async () => {
  const mockTransport = async (url, options) => {
    if (options.method === "GET") {
      assert.equal(url, "/api/admin/setups?status=HIDDEN&offset=0&limit=20");
      return jsonResponse([{ post: samplePost, likeCount: 1, moderationReason: "Spam", moderatedBy: 1, moderatedAt: "2026-10-11T12:00:00" }]);
    }
    if (options.method === "PUT") {
      assert.equal(url, "/api/admin/setups/1/status");
      assert.deepEqual(JSON.parse(options.body), { status: "HIDDEN", reason: "Vi phạm tiêu chuẩn" });
      return jsonResponse({ post: { ...samplePost, status: "HIDDEN" }, likeCount: 1, moderationReason: "Vi phạm tiêu chuẩn", moderatedBy: 1, moderatedAt: "2026-10-11T12:00:00" });
    }
    throw new Error("Unexpected route");
  };

  const api = createCommunityApi(mockTransport);
  const list = await api.adminList({ status: "HIDDEN", offset: 0, limit: 20 });
  assert.equal(list.length, 1);
  assert.equal(list[0].moderationReason, "Spam");

  const mod = await api.adminModerate(1, { status: "HIDDEN", reason: "Vi phạm tiêu chuẩn" });
  assert.equal(mod.post.status, "HIDDEN");
  assert.equal(mod.moderationReason, "Vi phạm tiêu chuẩn");
});

test("throws CommunityApiError on API failures", async () => {
  const mockTransport = async () =>
    jsonResponse({ code: "SETUP_PURCHASE_REQUIRED", message: "Cần mua ít nhất 1 sản phẩm để chia sẻ setup." }, 403);

  const api = createCommunityApi(mockTransport);
  await assert.rejects(
    () => api.create({ title: "T", description: "D", mediaIds: [], productIds: [] }),
    (err) => {
      assert.ok(err instanceof CommunityApiError);
      assert.equal(err.status, 403);
      assert.equal(err.code, "SETUP_PURCHASE_REQUIRED");
      assert.equal(err.message, "Cần mua ít nhất 1 sản phẩm để chia sẻ setup.");
      return true;
    }
  );
});
