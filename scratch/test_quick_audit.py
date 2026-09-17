from playwright.sync_api import sync_playwright
import json

ROUTES = [
    "/",
    "/documents",
    "/assistant",
    "/cross-document",
    "/validation",
    "/reports",
    "/search",
    "/topics",
    "/knowledge-base",
    "/upload",
    "/documents/viewer",
    "/audit",
    "/processing"
]

BASE_URL = "https://sih-26023-flame.vercel.app"

def run_quick_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Login HOD
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        hod_tab = page.locator("button:has-text('HOD Admin')")
        if hod_tab.is_visible():
            hod_tab.click()
        page.fill("#username", "cmpdi_admin")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3500)

        print(f"=== HOD LOGGED IN: {page.url} ===")
        hod_results = {}

        for route in ROUTES:
            page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            page.wait_for_timeout(1000)
            buttons = page.locator("button").count()
            inputs = page.locator("input, select, textarea").count()
            cards = page.locator("[class*='rounded'], [class*='border']").count()
            url = page.url
            status = "PASS" if "/login" not in url else "REDIRECTED"
            hod_results[route] = {
                "status": status,
                "url": url,
                "buttons": buttons,
                "inputs": inputs,
                "cards": cards
            }
            print(f"HOD {route} -> {status} (URL: {url}, Buttons: {buttons})")

        browser.close()

    print("\n" + json.dumps(hod_results, indent=2))

if __name__ == "__main__":
    run_quick_audit()
