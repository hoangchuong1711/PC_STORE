import test from "node:test";
import assert from "node:assert/strict";
import { setupDtoToCommunityPost } from "./community.ts";

test("preserves backend product identity without fabricated price or view count", () => {
  const post = setupDtoToCommunityPost({
    postId: 7,
    authorId: 2,
    title: "Setup thật",
    description: "Dùng catalog thật",
    status: "PUBLISHED",
    createdAt: "2026-10-12T10:00:00",
    updatedAt: "2026-10-12T10:00:00",
    mediaIds: [],
    products: [{ productId: 42, name: "PC Creator Pro X" }],
  });

  assert.equal(post.components[0].productId, 42);
  assert.equal(post.components[0].slug, "42");
  assert.equal(post.components[0].price, undefined);
  assert.equal("viewsCount" in post, false);
});
