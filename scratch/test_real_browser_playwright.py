from playwright.sync_api import sync_playwright
import time
import sys

def run_real_browser_test():
    print("=== STARTING REAL CHROMIUM BROWSER LOGIN TEST VIA PLAYWRIGHT ===")
    print("Target URL: https://sih-26023-flame.vercel.app/login\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console messages
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE {msg.type.upper()}] {msg.text}"))
        
        # Capture network responses
        page.on("response", lambda res: print(f"[NETWORK RESP] {res.status} {res.url}") if "/api/" in res.url else None)

        try:
            # ──────────────────────────────────────────────────────────────────
            # 1. TEST HOD LOGIN
            # ──────────────────────────────────────────────────────────────────
            print("--- [STEP 1] Opening Production Login Page ---")
            page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
            print(f"Page loaded. URL: {page.url}")

            # Click HOD Admin Tab
            hod_tab = page.locator("button:has-text('HOD Admin')")
            if hod_tab.is_visible():
                hod_tab.click()
                print("Selected HOD Admin role tab.")

            # Enter HOD Credentials
            page.fill("#username", "cmpdi_admin")
            page.fill("#password", "CMPDI_Secure_Auth_2026!")
            print("Entered HOD credentials into form.")

            # Submit Form
            print("Submitting login form...")
            page.click("button[type='submit']")
            try:
                page.wait_for_url("https://sih-26023-flame.vercel.app/", timeout=10000)
            except Exception:
                page.wait_for_timeout(3000)

            post_hod_url = page.url
            print(f"Post-Submit URL: {post_hod_url}")

            # Check if error message is visible
            error_el = page.locator(".text-red-200, .bg-red-950")
            if error_el.is_visible():
                print(f"[UI ERROR DISPLAYED]: '{error_el.inner_text()}'")

            # Check token storage
            token_val = page.evaluate("() => localStorage.getItem('cmpdi_auth_token') || localStorage.getItem('access_token')")
            print(f"Stored Token in LocalStorage: {'YES (Valid Token)' if token_val else 'NO'}")

            hod_success = post_hod_url.endswith("/") or post_hod_url == "https://sih-26023-flame.vercel.app/"
            print(f"--> HOD Login Outcome: {'PASS' if hod_success else 'FAIL'}")

            # ──────────────────────────────────────────────────────────────────
            # 2. TEST DASHBOARD REFRESH & SESSION PERSISTENCE
            # ──────────────────────────────────────────────────────────────────
            if hod_success:
                print("\n--- [STEP 2] Refreshing Dashboard to Test Session Persistence ---")
                page.reload(wait_until="networkidle")
                page.wait_for_timeout(2000)
                refresh_url = page.url
                print(f"Post-Refresh URL: {refresh_url}")
                print(f"--> Session Persistence Outcome: {'PASS' if refresh_url.endswith('/') else 'FAIL'}")

                # Test Logout
                print("\n--- [STEP 3] Testing Logout Action ---")
                page.evaluate("() => { localStorage.removeItem('cmpdi_auth_token'); localStorage.removeItem('access_token'); document.cookie = 'cmpdi_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; }")
                page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
                page.wait_for_timeout(1000)
                print("Logged out and navigated back to login page. Current URL:", page.url)

            # ──────────────────────────────────────────────────────────────────
            # 3. TEST NORMAL USER LOGIN
            # ──────────────────────────────────────────────────────────────────
            print("\n--- [STEP 4] Testing NORMAL_USER Login ('normal_user') ---")
            page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")

            norm_tab = page.locator("button:has-text('Normal User')")
            if norm_tab.is_visible():
                norm_tab.click()
                print("Selected Normal User role tab.")

            page.fill("#username", "normal_user")
            page.fill("#password", "CMPDI_Secure_Auth_2026!")
            print("Entered NORMAL_USER credentials into form.")

            print("Submitting login form...")
            page.click("button[type='submit']")
            try:
                page.wait_for_url("https://sih-26023-flame.vercel.app/", timeout=10000)
            except Exception:
                page.wait_for_timeout(3000)

            post_norm_url = page.url
            print(f"Post-Submit URL for NORMAL_USER: {post_norm_url}")

            norm_success = post_norm_url.endswith("/") or post_norm_url == "https://sih-26023-flame.vercel.app/"
            print(f"--> NORMAL_USER Login Outcome: {'PASS' if norm_success else 'FAIL'}")

            print("\n=== ALL REAL CHROMIUM BROWSER TESTS COMPLETED ===")

        except Exception as exc:
            print(f"Playwright Execution Exception: {exc}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_real_browser_test()
