from playwright.sync_api import sync_playwright

def debug_user():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on("response", lambda res: print(f"[RESP {res.status}] {res.url}"))

        page.goto("https://sih-26023-flame.vercel.app/login", wait_until="networkidle")
        page.fill("#username", "normal_user")
        page.fill("#password", "CMPDI_Secure_Auth_2026!")
        page.click("button[type='submit']")

        page.wait_for_timeout(3000)
        print(f"Final URL: {page.url}")
        browser.close()

if __name__ == "__main__":
    debug_user()
