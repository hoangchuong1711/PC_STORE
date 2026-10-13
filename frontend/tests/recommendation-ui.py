"""Fixture UI checks; run with a local Next server and Playwright installed."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1365, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    state = {"submitted": False, "fail": False}
    answers = {"pcBudget": 20000000, "purposes": ["GAMING"], "purposeNotes": "", "softwareText": "Browser", "gamesText": "", "targetResolution": None, "targetFps": None, "minStorageGb": 500}
    product = {"productId": 1, "name": "CPU thử nghiệm", "brand": "Demo", "componentType": "CPU", "price": 19000000, "availableQuantity": 2, "imageUrl": None, "spec": {"cores": 6}}
    build = {"buildId": 1, "name": "PC gợi ý", "sourceType": "RECOMMENDATION", "items": [{"productId": 1, "productName": product["name"], "quantity": 1, "unitPrice": 19000000, "lineTotal": 19000000}], "totalAmount": 19000000, "compatibility": {"status": "PASS", "rules": []}}
    def route(request):
        path = request.request.url.split("/api/")[-1]
        status = 200
        if path == "auth/me":
            data = {"userId": 1, "fullName": "Khách thử nghiệm", "email": "qa@example.test", "phone": None, "role": "CUSTOMER"}
        elif path == "customer/recommendations" and request.request.method == "POST":
            state["submitted"] = True
            if state["fail"]:
                status, data = 503, {"code": "AI_NOT_CONFIGURED", "message": "Tư vấn AI chưa được bật."}
            else:
                status, data = 202, {"requestId": 7, "status": "QUEUED"}
        elif path == "customer/recommendations/7":
            data = {"requestId": 7, "status": "SUCCEEDED", "answers": answers, "criteria": {"thresholds": [], "assumptions": []}, "failureCode": None, "failureReason": None, "result": {"build": build, "products": [product], "estimatedTotal": 19000000, "level": "PREFERRED", "searchLimited": False, "visitedNodes": 20, "reason": "Đạt mức mong muốn."}}
            if state.get("no_match"):
                data.update(status="FAILED", failureCode="NO_MATCH", failureReason="Không có bộ đạt tiêu chí cũ.", result=None)
        else:
            data = {"cartId": 1, "items": [], "totalAmount": 0}
        request.fulfill(status=status, content_type="application/json", body=json.dumps(data))
    page.route("**/api/**", route)
    page.goto(os.environ.get("QA_BASE_URL", "http://localhost:3011") + "/recommendation")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name="Tìm PC theo nhu cầu của bạn")).to_be_visible()
    page.get_by_label("Ngân sách tối đa (đ)").fill("20000000")
    page.get_by_label("Chơi game", exact=True).check()
    page.get_by_label("Ứng dụng và website thường dùng").fill("Browser")
    page.get_by_role("button", name="Tìm cấu hình phù hợp", exact=True).click()
    expect(page.get_by_role("heading", name="Cấu hình đề xuất")).to_be_visible(timeout=15000)
    expect(page.get_by_text("CPU thử nghiệm", exact=True)).to_be_visible()
    assert state["submitted"]
    output = Path(__file__).resolve().parents[2] / "backend/target/recommendation-desktop.png"
    page.evaluate("window.scrollTo(0, 0)")
    page.screenshot(path=str(output), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(output.with_name("recommendation-mobile.png")), full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.get_by_role("button", name="Điều chỉnh nhu cầu", exact=True).click()
    state["no_match"] = True
    page.get_by_role("button", name="Tìm cấu hình phù hợp", exact=True).click()
    expect(page.get_by_text("Không có bộ đạt tiêu chí cũ.", exact=True)).to_be_visible()
    state["fail"] = True
    page.get_by_role("button", name="Tìm cấu hình phù hợp", exact=True).click()
    expect(page.get_by_text("Tư vấn AI chưa được bật.", exact=True)).to_be_visible()
    expect(page.get_by_text("Không có bộ đạt tiêu chí cũ.", exact=True)).not_to_be_visible()
    assert not errors, errors
    browser.close()
print("Recommendation UI: submit, result, error and mobile layout passed (fixture API).")
