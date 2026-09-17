from playwright.sync_api import sync_playwright

def debug_redirect():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[CONSOLE {msg.type.upper()}] {msg.text}"))
        page.on("request", lambda req: print(f"[REQ] {req.method} {req.url} Auth: {req.headers.get('authorization')} Cookie: {req.headers.get('cookie')}"))
        page.on("response", lambda res: print(f"[RESP {res.status}] {res.url}"))

        print("--- 1. GOING TO /login ---")
        page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")

        print("--- 2. LOGGING IN ---")
        page.fill("#username", "cmpdi_admin")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")

        page.wait_for_timeout(4000)
        print(f"URL after submit: {page.url}")

        print("--- 3. CHECKING COOKIES AND LOCALSTORAGE ---")
        cookies = context.cookies()
        print(f"Cookies: {cookies}")
        local_storage = page.evaluate("() => ({ ...localStorage })")
        print(f"localStorage: {local_storage}")

        print("--- 4. NAVIGATING TO /documents ---")
        page.goto("https://sih-26023-flame.vercel.app/documents", wait_until="networkidle")
        page.wait_for_timeout(3000)
        print(f"URL after /documents nav: {page.url}")

        browser.close()

if __name__ == "__main__":
    debug_redirect()
