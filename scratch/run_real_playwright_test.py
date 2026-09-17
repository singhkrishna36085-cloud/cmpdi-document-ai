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

def test_role(username, password, role_name):
    print(f"\n==================================================")
    print(f"REAL PLAYWRIGHT CHROMIUM AUDIT: {role_name} ({username})")
    print(f"==================================================")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_errors = []
        network_errors = []

        page.on("console", lambda msg: console_errors.append(f"[{msg.type.upper()}] {msg.text}") if msg.type in ["error"] else None)
        page.on("response", lambda res: network_errors.append(f"[{res.status}] {res.url}") if res.status >= 400 else None)

        print(f"1. Navigating to {BASE_URL}/login...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")

        if role_name == "HOD":
            hod_tab = page.locator("button:has-text('HOD Admin')")
            if hod_tab.is_visible():
                hod_tab.click()
        else:
            user_tab = page.locator("button:has-text('Normal User')")
            if user_tab.is_visible():
                user_tab.click()

        page.fill("#username", username)
        page.fill("#password", password)
        page.click("button[type='submit']")

        # Wait until dashboard / loads and sidebar is visible
        try:
            page.wait_for_selector("main", timeout=12000)
            print(f"✅ Logged in successfully! URL: {page.url}")
        except Exception as e:
            print(f"❌ Login timeout/failed! URL: {page.url}")
            browser.close()
            return {"login": "FAILED"}

        # Audit all 13 routes
        for route in ROUTES:
            console_errors.clear()
            network_errors.clear()

            target = f"{BASE_URL}{route}"
            try:
                page.goto(target, wait_until="networkidle", timeout=15000)
                page.wait_for_selector("main", timeout=5000)

                final_url = page.url
                status = "PASS" if "/login" not in final_url else "REDIRECTED_TO_LOGIN"

                buttons = page.locator("button").count()
                inputs = page.locator("input, select, textarea").count()
                cards = page.locator("[class*='rounded'], [class*='border']").count()

                results[route] = {
                    "status": status,
                    "final_url": final_url,
                    "buttons": buttons,
                    "inputs": inputs,
                    "cards": cards,
                    "console_errors": list(console_errors),
                    "network_errors": list(network_errors)
                }

                print(f"  Route {route} -> {status} (URL: {final_url}, Buttons: {buttons}, Cards: {cards})")
            except Exception as e:
                print(f"  Route {route} -> ERROR: {str(e)}")
                results[route] = {"status": "ERROR", "error": str(e), "url": page.url}

        browser.close()

    return results

if __name__ == "__main__":
    hod_res = test_role("cmpdi_admin", "CMPDI_Secure_Auth_2026!", "HOD")
    user_res = test_role("normal_user", "CMPDI_Secure_Auth_2026!", "NORMAL_USER")

    with open("scratch/final_playwright_audit.json", "w", encoding="utf-8") as f:
        json.dump({"HOD": hod_res, "NORMAL_USER": user_res}, f, indent=2)

    print("\nSaved final Playwright audit results to scratch/final_playwright_audit.json")
