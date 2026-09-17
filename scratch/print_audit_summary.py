from playwright.sync_api import sync_playwright

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

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
        hod_tab = page.locator("button:has-text('HOD Admin')")
        if hod_tab.is_visible():
            hod_tab.click()
        page.fill("#username", "cmpdi_admin")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        for route in ROUTES:
            url = f"https://sih-26023-flame.vercel.app{route}"
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(1000)
            text = page.locator("body").inner_text()
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            print(f"=== ROUTE {route} ===")
            print("URL:", page.url)
            print("Lines snippet:", lines[:6])
            print("-" * 50)

        browser.close()

if __name__ == "__main__":
    run_audit()
