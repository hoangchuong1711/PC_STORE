import test from "node:test";
import assert from "node:assert/strict";
import { formatAccountDate } from "./account.ts";

test("formats dates from the account API and preserves invalid values", () => {
  assert.equal(formatAccountDate("2026-10-13T10:00:00+07:00"), "13/10/2026");
  assert.equal(formatAccountDate("invalid"), "invalid");
});
