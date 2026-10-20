"""Product photos use catalog URLs; missing photos keep the existing visual.

Run against a running frontend with Python Playwright:
  TEST_FRONTEND_URL=http://localhost:3001 python tests/product-visual-ui.py
Catalog and image HTTP responses are controlled so CDN availability cannot mask a UI bug.
"""
import os
import unittest
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("TEST_FRONTEND_URL", "http://localhost:3001")
FRONT = "https://images.example.test/front.svg"
BACK = "https://images.example.test/back.svg"


def product(product_id, name, images):
    return {
        "productId": product_id, "name": name, "description": "Catalog product",
        "price": 4990000, "status": "ACTIVE",
        "category": {"categoryId": 1, "name": "CPU", "componentType": "CPU"},
        "brand": {"brandId": 1, "name": "AMD", "logoUrl": None},
        "imageUrls": images, "availableQuantity": 10, "inStock": True,
    }


PRODUCTS = [
    product(71001, "CPU with photos", [FRONT, BACK]),
    product(71002, "CPU without photo", []),
    product(71003, "CPU with unavailable photo", ["https://images.example.test/missing.svg"]),
]


class ProductVisualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 1000})

        def catalog(route):
            path = urlparse(route.request.url).path
            if path == "/api/products":
                route.fulfill(json={"items": PRODUCTS, "page": 0, "size": 8,
                                    "totalItems": 3, "totalPages": 1})
            elif path == "/api/products/71001":
                route.fulfill(json=PRODUCTS[0])
            else:
                route.continue_()

        def image(route):
            if route.request.url.endswith("missing.svg"):
                route.fulfill(status=404, body="Not found")
            else:
                route.fulfill(content_type="image/svg+xml", body=
                              '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">'
                              '<rect width="800" height="600" fill="#006ce1"/></svg>')

        self.context.route("**/api/auth/me", lambda route: route.fulfill(
            status=401, json={"code": "UNAUTHORIZED", "message": "Sign in required"}))
        self.context.route("**/api/categories", lambda route: route.fulfill(json=[]))
        self.context.route("**/api/brands", lambda route: route.fulfill(json=[]))
        self.context.route("**/api/products**", catalog)
        self.context.route("https://images.example.test/**", image)
        self.page = self.context.new_page()

    def tearDown(self):
        self.context.close()

    def visual(self, product_id):
        return self.page.locator(f'.product-card-link[href="/products/{product_id}"] .product-visual')

    def test_catalog_card_displays_primary_image(self):
        self.page.goto(BASE + "/products", wait_until="networkidle", timeout=60000)
        image = self.visual(71001).get_by_role("img", name="CPU with photos", exact=True)
        expect(image).to_be_visible()
        expect(image).to_have_attribute("src", FRONT)
        image.scroll_into_view_if_needed()
        self.page.wait_for_function(
            "img => img.complete && img.naturalWidth > 0", arg=image.element_handle())
        self.assertTrue(image.evaluate("img => img.complete && img.naturalWidth > 0"))

    def test_missing_image_keeps_placeholder(self):
        self.page.goto(BASE + "/products", wait_until="networkidle", timeout=60000)
        visual = self.visual(71002)
        expect(visual.locator(".visual-letter")).to_be_visible()
        expect(visual.get_by_role("img")).to_have_count(0)

    def test_failed_image_returns_to_placeholder(self):
        self.page.goto(BASE + "/products", wait_until="networkidle", timeout=60000)
        visual = self.visual(71003)
        expect(visual.locator(".visual-letter")).to_be_visible()
        expect(visual.get_by_role("img")).to_have_count(0)

    def test_detail_gallery_displays_selected_image(self):
        self.page.goto(BASE + "/products/71001", wait_until="networkidle", timeout=60000)
        image = self.page.locator(".detail-main-visual").get_by_role("img", name="CPU with photos", exact=True)
        expect(image).to_have_attribute("src", FRONT)
        self.page.get_by_role("group", name="Danh sách ảnh").get_by_role("button").nth(1).click()
        expect(image).to_have_attribute("src", BACK)
        expect(self.page.locator(".detail-gallery-caption")).not_to_contain_text("https://")

    def test_legacy_image_labels_remain_placeholders(self):
        self.page.goto(BASE + "/products/rog-strix-g16-2025", wait_until="networkidle", timeout=60000)
        visual = self.page.locator(".detail-main-visual .product-visual")
        expect(visual.locator(".visual-letter")).to_be_visible()
        expect(visual.get_by_role("img")).to_have_count(0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
