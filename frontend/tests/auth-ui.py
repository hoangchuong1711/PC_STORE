"""UI contract tests with controlled HTTP responses, NOT live backend E2E.
Run with the webapp-testing with_server helper on port 3100.
Requires Python Playwright and its Chromium browser.
"""
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3100"
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    session = {"user": None}
    user = {"userId": 7, "fullName": "Test Admin", "email": "admin@example.test", "phone": None, "role": "ADMIN"}

    def auth(route):
        path = route.request.url.rsplit("/", 1)[-1]
        if path == "me":
            route.fulfill(status=200 if session["user"] else 401, json=session["user"] or {"message": "Guest"})
        elif path == "login":
            body = route.request.post_data_json
            if body["password"] == "wrong":
                route.fulfill(status=401, json={"message": "Sai mật khẩu"})
            else:
                session["user"] = user.copy()
                route.fulfill(json=session["user"])
        elif path == "logout":
            session["user"] = None
            route.fulfill(status=204)
        elif path == "register":
            body = route.request.post_data_json
            assert body == {"fullName": "New Customer", "email": "new@example.test", "password": "secret123"}
            route.fulfill(status=201, json={**user, "role": "CUSTOMER"})
        else:
            raise AssertionError(path)

    context.route("**/api/auth/*", auth)
    page = context.new_page()
    page.on("pageerror", lambda error: print("BROWSER ERROR:", str(error).encode("ascii", "backslashreplace").decode()))
    page.goto(BASE + "/admin")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_text("Bạn cần đăng nhập để vào Admin.")).to_be_visible()
    expect(page.get_by_role("navigation", name="Điều hướng Admin")).to_have_count(0)
    page.get_by_role("link", name="Đăng nhập", exact=True).click()
    page.wait_for_url(BASE + "/auth/login")
    page.wait_for_load_state("networkidle")
    page.locator('input[name="email"]').fill(user["email"])
    page.locator('input[name="password"]').fill("wrong")
    page.get_by_role("button", name="Đăng nhập").click()
    expect(page.locator(".form-message.error")).to_contain_text("Sai mật khẩu")
    page.locator('input[name="password"]').fill("secret123")
    page.get_by_role("button", name="Đăng nhập").click()
    page.wait_for_url(BASE + "/admin")
    expect(page.get_by_role("navigation", name="Điều hướng Admin")).to_be_visible()
    page.reload()
    expect(page.get_by_role("navigation", name="Điều hướng Admin")).to_be_visible()
    page.locator(".admin-profile-chip-button").click()
    page.get_by_role("button", name="Đăng xuất").click()
    page.wait_for_url(BASE + "/auth/login")
    page.goto(BASE + "/admin")
    expect(page.get_by_text("Bạn cần đăng nhập để vào Admin.")).to_be_visible()
    session["user"] = {**user, "role": "CUSTOMER"}
    page.reload()
    expect(page.get_by_role("heading", name="Không có quyền truy cập Admin")).to_be_visible()
    expect(page.get_by_role("navigation", name="Điều hướng Admin")).to_have_count(0)
    session["user"] = None
    page.goto(BASE + "/auth/register")
    page.locator('input[name="name"]').fill("New Customer")
    page.locator('input[name="email"]').fill("new@example.test")
    page.locator('input[name="password"]').fill("secret123")
    page.locator('input[name="terms"]').check()
    page.get_by_role("button", name="Tạo tài khoản").click()
    expect(page.get_by_role("status")).to_contain_text("Đã tạo tài khoản")
    assert session["user"] is None, "Registration must not imply a session"
    browser.close()
    print("PASS: guest guard, login failure/success, admin reload/logout, customer denial, registration")
