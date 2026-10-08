import test from "node:test";
import assert from "node:assert/strict";
import { createAuthApi, authDestination } from "./auth-api.ts";

const customer = { userId: 7, fullName: "An", email: "an@example.test", phone: null, role: "CUSTOMER" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("login sends credentials to Java session endpoint and returns its user", async () => {
  const api = createAuthApi(async (url, options) => {
    assert.equal(url, "/api/auth/login");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(options.body), { email: "an@example.test", password: "secret123" });
    return json(customer);
  });
  assert.deepEqual(await api.login("an@example.test", "secret123"), customer);
});

test("registration sends fullName without accepting an injected admin role", async () => {
  const api = createAuthApi(async (url, options) => {
    assert.equal(url, "/api/auth/register");
    assert.deepEqual(JSON.parse(options.body), { fullName: "An", email: "an@example.test", password: "secret123" });
    return json(customer, 201);
  });
  assert.deepEqual(await api.register({ fullName: "An", email: "an@example.test", password: "secret123", role: "ADMIN" }), customer);
});

test("me treats only 401 as guest, not backend failures", async () => {
  assert.equal(await createAuthApi(async () => json({}, 401)).me(), null);
  await assert.rejects(createAuthApi(async () => json({ message: "Unavailable" }, 503)).me(), /Unavailable/);
});

test("login errors preserve backend message and status", async () => {
  await assert.rejects(createAuthApi(async () => json({ code: "UNAUTHORIZED", message: "Sai mật khẩu" }, 401)).login("a", "b"),
    (error) => error.status === 401 && error.message === "Sai mật khẩu");
});

test("logout supports empty 204 and already expired sessions", async () => {
  await createAuthApi(async (url, options) => {
    assert.equal(url, "/api/auth/logout"); assert.equal(options.method, "POST");
    return new Response(null, { status: 204 });
  }).logout();
  await createAuthApi(async () => json({}, 401)).logout();
});

test("HTML proxy error and network failure produce readable errors", async () => {
  await assert.rejects(createAuthApi(async () => new Response("<html>bad gateway</html>", { status: 502 })).me(), /502/);
  await assert.rejects(createAuthApi(async () => { throw new TypeError("fetch failed"); }).me(), /kết nối/);
});

test("redirects depend on backend role, never a user supplied URL", () => {
  assert.equal(authDestination(customer), "/");
  assert.equal(authDestination({ ...customer, role: "ADMIN" }), "/admin");
});

test("login never accepts empty or malformed successful responses as a session", async () => {
  await assert.rejects(createAuthApi(async () => new Response(null, { status: 204 })).login("a", "b"), /không hợp lệ/);
  await assert.rejects(createAuthApi(async () => json({ userId: 7, role: "ADMIN" })).login("a", "b"), /không hợp lệ/);
});
