"""Optional smoke test: requires the T09 and T22 demo seeds in the local database."""
import os
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("TEST_FRONTEND_URL", "http://localhost:3000")
names = [
    "AMD Ryzen 5 5600",
    "MSI B550M PRO-VDH",
    "Corsair VENGEANCE LPX CMK16GX4M1E3200C16",
    "MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC",
    "Samsung 970 EVO Plus 250GB",
    "MSI MAG A650BN",
    "Corsair 3000D AIRFLOW Black",
    "DeepCool AG400 ARGB",
]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_default_timeout(15000)
    with page.expect_response(lambda response: response.url.endswith("/api/builder/products")) as catalog_response:
        page.goto(BASE + "/builder", timeout=60000)
    if not catalog_response.value.ok:
        page.get_by_role("button", name="Tải lại linh kiện").click()
    slots = page.get_by_role("region", name="8 nhóm linh kiện PC").locator("article")
    expect(slots).to_have_count(8)
    for index, name in enumerate(names):
        slots.nth(index).get_by_role("button", name="Chọn", exact=False).click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_placeholder("Tìm theo tên hoặc thông số...").fill(name)
        heading = dialog.get_by_role("heading", name=name, exact=True)
        expect(heading).to_be_visible()
        heading.locator("xpath=../..").get_by_role("button", name="Chọn món này").click()
    expect(page.get_by_text("Các quy tắc cơ bản đều PASS")).to_be_visible()
    expect(page.get_by_role("button", name="Thêm cả bộ vào giỏ hàng")).to_be_enabled()
    browser.close()
    print("PASS: 8 real catalog parts selected and backend compatibility PASS")
