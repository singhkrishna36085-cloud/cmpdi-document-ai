from playwright.sync_api import sync_playwright

def debug_nav():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[CONSOLE {msg.type.upper()}] {msg.text}"))
        page.on("request", lambda req: print(f"[REQ] {req.method} {req.url} Headers: {req.headers}"))
        page.on("response", lambda res: print(f"[RESP {res.status}] {res.url}"))

        print("--- STEP 1: Logging in on /login ---")
        page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
        hod_tab = page.locator("button:has-text('HOD Admin')")
        if hod_tab.is_visible():
            hod_tab.click()
        page.fill("#username", "cmpdi_admin")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")
        
        page.wait_for_timeout(4000)

        print(f"\n--- Post login URL: {page.url} ---")
        cookies = context.cookies()
        print(f"Cookies after login: {cookies}")
        
        # Evaluate localStorage
        storage = page.evaluate("() => ({ ...localStorage })")
        print(f"localStorage after login: {storage}")

        print("\n--- STEP 2: Navigating to /documents ---")
        page.goto("https://sih-26023-flame.vercel.app/documents", wait_until="networkidle")
        page.wait_for_timeout(3000)
        print(f"Final URL after /documents nav: {page.url}")

        browser.close()

if __name__ == "__main__":
    debug_nav()
