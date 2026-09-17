from playwright.sync_api import sync_playwright
import json
import time

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

def audit_role(username, password, role_name):
    print(f"\n==================================================")
    print(f"STARTING COMPREHENSIVE ROUTE AUDIT FOR ROLE: {role_name} ({username})")
    print(f"==================================================")

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        network_failures = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type.upper()}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("response", lambda res: network_failures.append(f"[{res.status}] {res.url}") if res.status >= 400 else None)

        # 1. Login
        print(f"Logging in as {role_name} ({username})...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        
        # Select role tab if visible
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

        # Wait for redirect to /
        page.wait_for_timeout(4000)

        if "/login" in page.url:
            print(f"[FAIL] LOGIN FAILED FOR {username}!")
            browser.close()
            return {"login": "FAILED"}

        print(f"[PASS] Login successful! Current URL: {page.url}")

        # 2. Iterate through all 13 routes
        for route in ROUTES:
            console_logs.clear()
            network_failures.clear()

            target_url = f"{BASE_URL}{route}"
            print(f"\n--- Testing Route: {route} ({target_url}) ---")

            try:
                page.goto(target_url, wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)

                current_url = page.url
                page_title = page.title()

                # Text content snippet
                text_content = page.inner_text("body")[:300].replace("\n", " | ")

                # Find buttons, inputs, links, tables, cards
                buttons = page.locator("button").count()
                inputs = page.locator("input, select, textarea").count()
                cards = page.locator(".card, [class*='rounded'], [class*='border']").count()
                tables = page.locator("table").count()

                # Check if redirected back to /login unexpectedly
                if "/login" in current_url:
                    status = "REDIRECTED_TO_LOGIN"
                else:
                    status = "PASS"

                route_info = {
                    "status": status,
                    "final_url": current_url,
                    "title": page_title,
                    "buttons_count": buttons,
                    "inputs_count": inputs,
                    "tables_count": tables,
                    "cards_count": cards,
                    "text_snippet": text_content,
                    "console_errors": list(console_logs),
                    "network_failures": list(network_failures)
                }

                results[route] = route_info
                print(f"Result for {route}: {status} | Buttons: {buttons} | Inputs: {inputs} | NetErrors: {len(network_failures)} | ConsoleErrors: {len(console_logs)}")

            except Exception as e:
                print(f"[ERROR] testing route {route}: {str(e)}")
                results[route] = {
                    "status": "ERROR",
                    "error": str(e),
                    "console_errors": list(console_logs),
                    "network_failures": list(network_failures)
                }

        browser.close()

    return results

if __name__ == "__main__":
    hod_results = audit_role("cmpdi_admin", "CMPDI_Secure_Auth_2026!", "HOD")
    user_results = audit_role("normal_user", "CMPDI_Secure_Auth_2026!", "NORMAL_USER")

    with open("scratch/audit_report_full.json", "w", encoding="utf-8") as f:
        json.dump({"HOD": hod_results, "NORMAL_USER": user_results}, f, indent=2)

    print("\nSaved complete audit report to scratch/audit_report_full.json")
