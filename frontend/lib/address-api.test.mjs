import test from "node:test";
import assert from "node:assert/strict";
import { createAddressApi } from "./address-api.ts";

const sampleAddress = {
  addressId: 1,
  addressDetail: "123 Đường ABC, Phường 1, Quận 1",
  recipientName: "Nguyễn Văn A",
  phone: "0987654321",
  label: "Nhà riêng",
  address: "123 Đường ABC, Phường 1, Quận 1",
  isDefault: true,
};

const response = (body, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), { status });

test("lists customer addresses via GET /api/customer/addresses", async () => {
  const api = createAddressApi(async (url, options) => {
    assert.equal(url, "/api/customer/addresses");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    return response([sampleAddress]);
  });
  const list = await api.list();
  assert.deepEqual(list, [sampleAddress]);
});

test("creates a new address via POST /api/customer/addresses", async () => {
  const payload = {
    recipientName: "Nguyễn Văn A",
    phone: "0987654321",
    label: "Nhà riêng",
    address: "123 Đường ABC, Phường 1, Quận 1",
    isDefault: true,
  };
  const api = createAddressApi(async (url, options) => {
    assert.equal(url, "/api/customer/addresses");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), payload);
    return response(sampleAddress, 201);
  });
  const created = await api.create(payload);
  assert.deepEqual(created, sampleAddress);
});

test("sets default address via PUT /api/customer/addresses/{id}/default", async () => {
  const api = createAddressApi(async (url, options) => {
    assert.equal(url, "/api/customer/addresses/1/default");
    assert.equal(options.method, "PUT");
    return response(sampleAddress);
  });
  const result = await api.setDefault(1);
  assert.deepEqual(result, sampleAddress);
});

test("deletes address via DELETE /api/customer/addresses/{id}", async () => {
  let called = false;
  const api = createAddressApi(async (url, options) => {
    assert.equal(url, "/api/customer/addresses/1");
    assert.equal(options.method, "DELETE");
    called = true;
    return response(null, 204);
  });
  await api.delete(1);
  assert.equal(called, true);
});

test("propagates backend error message and code", async () => {
  await assert.rejects(
    createAddressApi(async () =>
      response({ code: "INVALID_ADDRESS", message: "Địa chỉ chi tiết không được để trống." }, 400)
    ).create({ address: "" }),
    (error) =>
      error.status === 400 &&
      error.code === "INVALID_ADDRESS" &&
      error.message === "Địa chỉ chi tiết không được để trống."
  );

  await assert.rejects(
    createAddressApi(async () =>
      response({ code: "INVALID_PHONE", message: "Số điện thoại không đúng định dạng Việt Nam." }, 400)
    ).create({ address: "123 Đường ABC", phone: "invalid-phone" }),
    (error) =>
      error.status === 400 &&
      error.code === "INVALID_PHONE" &&
      error.message === "Số điện thoại không đúng định dạng Việt Nam."
  );
});
