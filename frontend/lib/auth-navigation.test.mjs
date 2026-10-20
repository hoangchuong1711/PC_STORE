import assert from "node:assert/strict";
import test from "node:test";
import { getSafeRedirectPath } from "./auth-navigation.ts";

test("getSafeRedirectPath only accepts local application paths", () => {
  assert.equal(getSafeRedirectPath("/checkout"), "/checkout");
  assert.equal(getSafeRedirectPath("/orders?status=pending"), "/orders?status=pending");
  assert.equal(getSafeRedirectPath("https://attacker.example"), null);
  assert.equal(getSafeRedirectPath("//attacker.example"), null);
  assert.equal(getSafeRedirectPath(null), null);
});
