from playwright.sync_api import sync_playwright
import time
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

def audit():
    print("=== STARTING COMPREHENSIVE 13-ROUTE AUDIT ===")
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_errors = []
        network_errors = []

        page.on("console", lambda msg: console_errors.append(f"[{msg.type.upper()}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("response", lambda res: network_errors.append(f"[{res.status}] {res.url}") if res.status >= 400 else None)

        # 1. Login first
        print("\n--- Logging in as HOD ('cmpdi_admin') ---")
        page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
        hod_tab = page.locator("button:has-text('HOD Admin')")
        if hod_tab.is_visible():
            hod_tab.click()
        page.fill("#username", "cmpdi_admin")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")
        try:
            page.wait_for_url("https://sih-26023-flame.vercel.app/", timeout=10000)
        except Exception:
            page.wait_for_timeout(3000)
        
        print(f"Logged in. URL: {page.url}")

        # 2. Audit each route
        for route in ROUTES:
            console_errors.clear()
            network_errors.clear()
            full_url = f"https://sih-26023-flame.vercel.app{route}"
            print(f"\n--- AUDITING ROUTE: {route} ---")
            
            try:
                page.goto(full_url, wait_until="networkidle")
                page.wait_for_timeout(2000)
                
                title = page.title()
                header_text = ""
                headers = page.locator("h1, h2, h3").all_inner_texts()
                if headers:
                    header_text = headers[:3]

                # Find buttons on the page
                buttons = page.locator("button").all_inner_texts()
                clickable_buttons = [b.strip() for b in buttons if b.strip()]

                # Test clicking tabs / buttons if available
                button_click_errors = []
                for b_text in clickable_buttons[:5]:
                    if b_text in ["Logout", "Sign Out", "HOD Admin", "Normal User"]:
                        continue
                    try:
                        btn = page.locator(f"button:has-text('{b_text}')").first
                        if btn.is_visible():
                            btn.click(timeout=2000)
                            page.wait_for_timeout(500)
                    except Exception as e:
                        button_click_errors.append(f"Button '{b_text}': {e}")

                results[route] = {
                    "status": "LOADED",
                    "current_url": page.url,
                    "headers": header_text,
                    "buttons_found": len(clickable_buttons),
                    "console_errors": list(console_errors),
                    "network_errors": list(network_errors),
                    "click_issues": button_click_errors
                }
                print(f"  URL: {page.url} | Buttons: {len(clickable_buttons)} | NetErrors: {len(network_errors)} | ConsoleErrors: {len(console_errors)}")
                if network_errors:
                    print(f"  Network Failures: {network_errors[:3]}")
                if console_errors:
                    print(f"  Console Errors: {console_errors[:3]}")

            except Exception as exc:
                results[route] = {
                    "status": "FAILED",
                    "error": str(exc),
                    "console_errors": list(console_errors),
                    "network_errors": list(network_errors)
                }
                print(f"  FAILED to load {route}: {exc}")

        browser.close()

    print("\n=== AUDIT SUMMARY RESULTS ===")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    audit()
