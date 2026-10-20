"""Builder displays real catalog products and adds a saved build to the server cart."""
import os
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("TEST_FRONTEND_URL", "http://localhost:3000")
product = {
    "productId": 12, "name": "CPU thật từ catalog", "brand": "Intel", "componentType": "CPU",
    "price": 1000000, "availableQuantity": 3, "imageUrl": None,
    "spec": {"socketCode": "LGA1700", "tdpWatts": 65},
}
report = {"status": "PASS", "rules": [{"id": "build_completeness", "status": "PASS", "reason": "Đầy đủ"}]}
build = {"buildId": 7, "name": "Cấu hình của tôi", "sourceType": "MANUAL", "items": [],
         "totalAmount": 1000000, "compatibility": report}
cart = {"cartId": 2, "items": [{"cartItemId": 1, "productId": 12, "name": product["name"],
        "quantity": 1, "unitPrice": 1000000, "lineTotal": 1000000,
        "availableQuantity": 3, "available": True}], "totalAmount": 1000000}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    context.route("**/api/auth/me", lambda route: route.fulfill(json={
        "userId": 1, "fullName": "Customer", "email": "customer@example.test",
        "phone": None, "role": "CUSTOMER",
    }))
    context.route("**/api/customer/cart", lambda route: route.fulfill(json={"cartId": None, "items": [], "totalAmount": 0}))
    catalog_calls = {"count": 0}

    def products(route):
        catalog_calls["count"] += 1
        if catalog_calls["count"] == 1:
            route.fulfill(status=503, json={"code": "UNAVAILABLE", "message": "Catalog đang khởi động"})
        else:
            route.fulfill(json=[product])

    context.route("**/api/builder/products", products)
    context.route("**/api/builder/compatibility", lambda route: route.fulfill(json=report))
    calls = []
    failure = {"enabled": False}

    def builds(route):
        calls.append((route.request.method, route.request.url, route.request.post_data_json
                      if route.request.post_data else None))
        if route.request.method == "GET":
            route.fulfill(json=[])
        elif route.request.url.endswith("/cart") and failure["enabled"]:
            route.fulfill(status=409, json={"code": "OUT_OF_STOCK", "message": "Hết hàng thử nghiệm"})
        else:
            route.fulfill(json=cart if route.request.url.endswith("/cart") else build)

    context.route("**/api/customer/builds**", builds)
    page = context.new_page()
    page.goto(BASE + "/builder", timeout=60000)
    expect(page.get_by_text("Catalog đang khởi động")).to_be_visible()
    page.get_by_role("button", name="Tải lại linh kiện").click()
    page.get_by_role("button", name="Chọn Bộ vi xử lý (CPU)").click()
    expect(page.get_by_role("dialog").get_by_text(product["name"])).to_be_visible()
    page.get_by_role("dialog").get_by_role("button", name="Chọn món này").click()
    page.get_by_role("button", name="Thêm cả bộ vào giỏ hàng").click()
    page.wait_for_timeout(1000)
    posts = [call for call in calls if call[0] == "POST"]
    assert posts[0][1].endswith("/api/customer/builds"), calls
    assert posts[0][2]["items"] == [{"productId": 12, "quantity": 1}]
    assert posts[1][1].endswith("/api/customer/builds/7/cart"), calls

    failure["enabled"] = True
    failed_page = context.new_page()
    failed_page.goto(BASE + "/builder", timeout=60000)
    failed_page.get_by_role("button", name="Chọn Bộ vi xử lý (CPU)").click()
    failed_page.get_by_role("dialog").get_by_role("button", name="Chọn món này").click()
    failed_page.get_by_role("button", name="Thêm cả bộ vào giỏ hàng").click()
    expect(failed_page.get_by_text("Hết hàng thử nghiệm")).to_be_visible()
    browser.close()
    print("PASS: real Builder product saved and added to server cart")
