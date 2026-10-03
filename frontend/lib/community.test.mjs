import test from "node:test";
import assert from "node:assert/strict";
import {
  getCommunityPosts,
  getFeaturedPost,
  getCommunityPost,
  toggleLikePost,
  addCommentToPost,
  createCommunityPost,
} from "./community.ts";

test("returns featured setup post", () => {
  const featured = getFeaturedPost();
  assert.ok(featured);
  assert.equal(featured.featured, true);
  assert.equal(featured.id, "setup-01");
});

test("filters community posts by style", () => {
  const minimalistPosts = getCommunityPosts("minimalist");
  assert.ok(minimalistPosts.length > 0);
  assert.ok(minimalistPosts.every((p) => p.style === "minimalist"));

  const allPosts = getCommunityPosts("all");
  assert.ok(allPosts.length >= minimalistPosts.length);
});

test("filters community posts by search query", () => {
  const results = getCommunityPosts("all", "newest", "Lian Li");
  assert.ok(results.length > 0);
  assert.ok(results.some((p) => p.title.includes("Lian Li")));
});

test("toggles like count properly", () => {
  const post = getCommunityPost("setup-02");
  assert.ok(post);
  const initialLikes = post.likesCount;
  const initialLiked = post.isLiked;

  toggleLikePost("setup-02");
  assert.equal(post.isLiked, !initialLiked);
  assert.equal(post.likesCount, initialLikes + (post.isLiked ? 1 : -1));

  // toggle back
  toggleLikePost("setup-02");
  assert.equal(post.likesCount, initialLikes);
});

test("adds comment to post", () => {
  const comment = addCommentToPost("setup-01", {
    author: "Test Reviewer",
    content: "Setup quá đỉnh!",
  });
  assert.ok(comment);
  assert.equal(comment.author, "Test Reviewer");

  const post = getCommunityPost("setup-01");
  assert.ok(post.comments.some((c) => c.id === comment.id));
});

test("creates new community post with components", () => {
  const newPost = createCommunityPost({
    title: "Góc làm việc thử nghiệm",
    authorName: "Tuấn Anh",
    style: "workstation",
    description: "Mô tả góc máy kiểm thử",
    componentSlugs: ["rog-strix-g16-2025"],
  });

  assert.ok(newPost.id);
  assert.equal(newPost.title, "Góc làm việc thử nghiệm");
  assert.equal(newPost.components.length, 1);
  assert.equal(newPost.components[0].slug, "rog-strix-g16-2025");
});
