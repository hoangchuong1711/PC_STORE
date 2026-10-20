"""Browser checks with mocked mail API; never sends real emails. See docs/auth-email-recovery.md."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("AUTH_UI_BASE_URL", "http://localhost:3000")
OUTPUT = Path(__file__).resolve().parents[2] / "backend" / "target" / "auth-ui"
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    calls = []
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def api(route):
        path = route.request.url.split("/api/")[-1]
        body = route.request.post_data_json if route.request.method == "POST" else None
        calls.append((path, body))
        status, data = 200, []
        if path == "auth/me":
            status, data = 401, {"message": "Guest"}
        elif path == "auth/forgot-password":
            data = {"message": "Nếu email đã được đăng ký, bạn sẽ nhận được mã OTP."}
        elif path == "auth/verify-reset-otp":
            if body["otp"] != "012345":
                status, data = 400, {"code": "INVALID_OTP", "message": "Mã OTP không đúng hoặc đã hết hạn."}
            else:
                data = {"resetToken": "a" * 43}
        elif path == "auth/reset-password":
            assert body == {"email": "an@example.test", "resetToken": "a" * 43, "newPassword": "new-password123"}
            data = {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."}
        route.fulfill(status=status, content_type="application/json", body=json.dumps(data))

    page.route("**/api/**", api)
    page.goto(BASE + "/auth/login")
    page.wait_for_load_state("networkidle")
    page.get_by_role("link", name="Quên mật khẩu của bạn?").click()
    expect(page.get_by_role("heading", name="Quên mật khẩu")).to_be_visible()
    assert page.locator("#auth-title").evaluate("element => parseFloat(getComputedStyle(element).fontSize)") <= 30, "Auth heading must fit the form card"
    page.get_by_label("Email tài khoản").fill("an@example.test")
    page.get_by_role("button", name="Gửi mã OTP", exact=True).click()
    expect(page.get_by_label("Mã OTP", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Gửi lại mã sau")).to_be_disabled()
    page.screenshot(path=str(OUTPUT / "otp-desktop.png"))
    page.get_by_label("Mã OTP", exact=True).fill("000000")
    page.get_by_role("button", name="Xác nhận OTP").click()
    expect(page.get_by_role("main").get_by_role("alert")).to_contain_text("Mã OTP không đúng")
    expect(page.get_by_label("Mật khẩu mới", exact=True)).to_have_count(0)
    page.get_by_label("Mã OTP", exact=True).fill("012345")
    page.get_by_role("button", name="Xác nhận OTP").click()
    expect(page.get_by_label("Mật khẩu mới", exact=True)).to_be_visible()
    page.get_by_label("Mật khẩu mới", exact=True).fill("new-password123")
    page.get_by_label("Xác nhận mật khẩu mới").fill("mismatch123")
    page.get_by_role("button", name="Đặt mật khẩu mới", exact=True).click()
    expect(page.get_by_role("main").get_by_role("alert")).to_contain_text("không khớp")
    assert not any(path == "auth/reset-password" for path, _ in calls)
    page.get_by_label("Xác nhận mật khẩu mới").fill("new-password123")
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(OUTPUT / "password-mobile.png"))
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.get_by_role("button", name="Đặt mật khẩu mới", exact=True).click()
    expect(page.get_by_role("status")).to_contain_text("Đặt lại mật khẩu thành công")
    expect(page.get_by_label("Mật khẩu mới", exact=True)).to_have_count(0)
    assert page.evaluate("!JSON.stringify(localStorage).includes('" + "a" * 43 + "')")
    page.get_by_role("link", name="Quay lại đăng nhập").click()
    expect(page.get_by_role("heading", name="Đăng nhập Tài khoản")).to_be_visible()
    assert not errors, errors
    browser.close()
    print("PASS: navigation, OTP error, password confirmation, reset payload, mobile layout and success state")
