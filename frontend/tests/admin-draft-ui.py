"""Drafts in admin forms survive navigation and reload within the same browser tab."""
import os
from playwright.sync_api import expect, sync_playwright


BASE = os.environ.get("TEST_FRONTEND_URL", "http://localhost:3000")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    context.route("**/api/auth/me", lambda route: route.fulfill(json={
        "userId": 1, "fullName": "Admin", "email": "admin@example.test",
        "phone": None, "role": "ADMIN",
    }))
    context.route("**/api/admin/categories**", lambda route: route.fulfill(json=[]))
    context.route("**/api/admin/brands**", lambda route: route.fulfill(json=[]))
    page = context.new_page()
    page.set_default_timeout(15000)

    page.goto(BASE + "/admin/products", timeout=60000)
    page.get_by_role("button", name="Thêm sản phẩm", exact=True).click()
    product_form = page.get_by_label("Form sản phẩm")
    product_form.get_by_label("Tên sản phẩm").fill("CPU bản nháp")
    page.wait_for_function("sessionStorage.getItem('pcstore_admin_product_draft_v2')?.includes('CPU bản nháp')")
    page.goto(BASE + "/admin/categories", timeout=60000)
    page.goto(BASE + "/admin/products", timeout=60000)
    expect(product_form.get_by_label("Tên sản phẩm")).to_have_value("CPU bản nháp")
    page.reload()
    expect(product_form.get_by_label("Tên sản phẩm")).to_have_value("CPU bản nháp")
    product_form.get_by_role("button", name="Đóng form", exact=True).click()
    assert page.evaluate("sessionStorage.getItem('pcstore_admin_product_draft_v2')") is None

    page.goto(BASE + "/admin/categories", timeout=60000)
    page.get_by_role("button", name="Thêm danh mục", exact=True).click()
    category_form = page.get_by_role("dialog")
    category_form.get_by_label("Tên", exact=True).fill("Danh mục bản nháp")
    page.wait_for_function("sessionStorage.getItem('pcstore_admin_taxonomy_draft')?.includes('Danh mục bản nháp')")
    page.goto(BASE + "/admin/products", timeout=60000)
    page.goto(BASE + "/admin/categories", timeout=60000)
    expect(category_form.get_by_label("Tên", exact=True)).to_have_value("Danh mục bản nháp")
    category_form.get_by_role("button", name="Hủy bỏ").click()
    assert page.evaluate("sessionStorage.getItem('pcstore_admin_taxonomy_draft')") is None

    browser.close()
    print("PASS: admin product and category drafts survive page navigation")
