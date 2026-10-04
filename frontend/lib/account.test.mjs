import test from "node:test";
import assert from "node:assert/strict";
import {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultAddress,
  getSavedBuilds,
  deleteSavedBuild,
} from "./account.ts";

test("gets and updates user profile", () => {
  const profile = getUserProfile();
  assert.equal(profile.name, "Nguyễn Minh Anh");

  const updated = updateUserProfile({ phone: "0999888777" });
  assert.equal(updated.phone, "0999888777");

  // Restore
  updateUserProfile({ phone: "0901234567" });
});

test("manages saved addresses: add, set default, and delete", () => {
  const initialCount = getUserAddresses().length;
  assert.ok(initialCount >= 2);

  const newAddr = addSavedAddress({
    label: "Kho phụ",
    recipientName: "Minh Anh",
    phone: "0901234567",
    address: "123 Đường số 5, Q. Bình Tân",
    isDefault: false,
  });

  assert.ok(newAddr.id);
  assert.equal(getUserAddresses().length, initialCount + 1);

  // Set default
  setDefaultAddress(newAddr.id);
  const addresses = getUserAddresses();
  const currentDefault = addresses.find((a) => a.id === newAddr.id);
  assert.equal(currentDefault?.isDefault, true);

  // Update
  updateSavedAddress(newAddr.id, { label: "Kho tổng" });
  assert.equal(getUserAddresses().find((a) => a.id === newAddr.id)?.label, "Kho tổng");

  // Delete
  const deleted = deleteSavedAddress(newAddr.id);
  assert.equal(deleted, true);
  assert.equal(getUserAddresses().length, initialCount);
});

test("gets and deletes saved builds", () => {
  const builds = getSavedBuilds();
  assert.ok(builds.length >= 2);

  const firstBuild = builds[0];
  assert.ok(firstBuild.components.length > 0);
  assert.equal(firstBuild.compatibilityPassed, true);

  const deleted = deleteSavedBuild(firstBuild.id);
  assert.equal(deleted, true);
  assert.equal(getSavedBuilds().length, builds.length - 1);
});
