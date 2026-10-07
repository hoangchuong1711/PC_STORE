"""UI contract test with controlled HTTP data; persistence in PostgreSQL is tested by CoreHttpIT."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("TEST_FRONTEND_URL", "http://localhost:3100")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    context.route("**/api/auth/me", lambda route: route.fulfill(json={
        "userId": 1, "fullName": "Admin", "email": "admin@example.test", "phone": None, "role": "ADMIN"}))
    data = {"categories": [], "brands": []}
    fail_save = {"enabled": False}

    def taxonomy(route):
        parts = route.request.url.split("/api/admin/")[1].split("/")
        kind = parts[0]
        if route.request.method == "GET":
            route.fulfill(json=data[kind])
            return
        if fail_save["enabled"]:
            route.fulfill(status=500, json={"code": "INTERNAL_ERROR", "message": "Lưu thất bại thử nghiệm"})
            return
        payload = route.request.post_data_json
        if route.request.method == "POST":
            entry = {"id": 1, "productCount": 0, "componentType": None, "logoUrl": None, **payload}
            data[kind].append(entry)
        else:
            entry = next(row for row in data[kind] if row["id"] == int(parts[1]))
            entry.update(payload)
        route.fulfill(status=201 if route.request.method == "POST" else 200, json=entry)

    context.route("**/api/admin/categories**", taxonomy)
    context.route("**/api/admin/brands**", taxonomy)
    page = context.new_page()
    page.set_default_timeout(15000)
    page.goto(BASE + "/admin/categories", timeout=60000)
    page.wait_for_load_state("networkidle")
    expect(page.get_by_text("Chưa có dữ liệu phù hợp.", exact=True)).to_be_visible()
    for kind, tab, add, name in [
        ("categories", "Danh mục", "Thêm danh mục", "Test RAM"),
        ("brands", "Thương hiệu", "Thêm thương hiệu", "Test Brand"),
    ]:
        page.get_by_role("tab", name=tab, exact=True).click()
        page.get_by_role("button", name=add, exact=True).click()
        form = page.get_by_role("dialog")
        form.get_by_label("Tên", exact=True).fill(name)
        form.get_by_label("Mô tả", exact=True).fill("Persistent description")
        if kind == "categories":
            form.get_by_label("Loại linh kiện").select_option("RAM")
        else:
            form.get_by_label("URL logo").fill("https://example.test/logo.png")
        form.get_by_role("button", name="Lưu", exact=True).click()
        expect(form).not_to_be_visible()
        page.get_by_role("navigation", name="Điều hướng Admin").get_by_role("link", name="Tổng quan", exact=True).click()
        page.get_by_role("navigation", name="Điều hướng Admin").get_by_role("link", name="Danh mục & Hãng", exact=True).click()
        page.get_by_role("tab", name=tab, exact=True).click()
        row = page.get_by_role("row").filter(has_text=name)
        expect(row).to_be_visible()
        row.get_by_role("button", name="Sửa", exact=True).click()
        form.get_by_label("Tên", exact=True).fill(name + " edited")
        form.get_by_role("button", name="Lưu", exact=True).click()
        expect(form).not_to_be_visible()
        page.reload()
        page.get_by_role("tab", name=tab, exact=True).click()
        row = page.get_by_role("row").filter(has_text=name + " edited")
        expect(row).to_be_visible()
        row.get_by_role("button", name="Ẩn", exact=True).click()
        expect(row.get_by_text("Đã ẩn", exact=True)).to_be_visible()
        page.reload()
        page.get_by_role("tab", name=tab, exact=True).click()
        expect(row.get_by_text("Đã ẩn", exact=True)).to_be_visible()
        row.get_by_role("button", name="Hiện", exact=True).click()
        expect(row.get_by_text("Hoạt động", exact=True)).to_be_visible()
        row.get_by_role("button", name="Sửa", exact=True).click()
        fail_save["enabled"] = True
        form.get_by_label("Tên", exact=True).fill("Must not save")
        form.get_by_role("button", name="Lưu", exact=True).click()
        expect(form.get_by_role("alert")).to_contain_text("Lưu thất bại")
        expect(form.get_by_label("Tên", exact=True)).to_have_value("Must not save")
        form.get_by_role("button", name="Hủy bỏ").click()
        fail_save["enabled"] = False
        expect(row).to_be_visible()
    browser.close()
    print("PASS: create/edit categories and brands, navigation/reload, hide/restore, failed save keeps form")
