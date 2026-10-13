import assert from "node:assert/strict";
import test from "node:test";

import { getOrFetchCommunityPost } from "./community.ts";

test("community has no browser-only showcase posts when the API has no posts", async () => {
  assert.equal(await getOrFetchCommunityPost("setup-01"), null);
});
