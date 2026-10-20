import test from "node:test";
import assert from "node:assert/strict";
import { createAuthApi, authDestination } from "./auth-api.ts";

const customer = { userId: 7, fullName: "An", email: "an@example.test", phone: null, role: "CUSTOMER" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("password recovery sends each stage to Java and returns reset permission only after OTP", async () => {
  const calls = [];
  const api = createAuthApi(async (url, options) => {
    calls.push([url, JSON.parse(options.body)]);
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    return json(url.endsWith("verify-reset-otp") ? { resetToken: "a".repeat(43) } : { message: "OK" });
  });
  await api.forgotPassword("an@example.test");
  const result = await api.verifyResetOtp("an@example.test", "012345");
  assert.equal(result.resetToken, "a".repeat(43));
  await api.resetPassword("an@example.test", result.resetToken, "new-secret123");
  assert.deepEqual(calls, [
    ["/api/auth/forgot-password", { email: "an@example.test" }],
    ["/api/auth/verify-reset-otp", { email: "an@example.test", otp: "012345" }],
    ["/api/auth/reset-password", { email: "an@example.test", resetToken: "a".repeat(43), newPassword: "new-secret123" }],
  ]);
});

test("recovery rejects missing reset tokens and preserves rate-limit errors", async () => {
  await assert.rejects(createAuthApi(async () => json({})).verifyResetOtp("a@b.test", "123456"));
  await assert.rejects(createAuthApi(async () => json({ code: "RATE_LIMITED", message: "Wait" }, 429)).forgotPassword("a@b.test"),
    error => error.status === 429 && error.code === "RATE_LIMITED");
});

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
