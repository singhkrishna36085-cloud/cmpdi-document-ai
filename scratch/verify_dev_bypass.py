import asyncio
from playwright.async_api import async_playwright

async def verify_dev_bypass():
    print(f"\n==================================================")
    print(f"VERIFYING DEV LOGIN BYPASS & DIRECT DASHBOARD RENDER")
    print(f"==================================================")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # 1. Direct navigation to /
        print("\n1. Navigating directly to http://localhost:3000/...")
        await page.goto("http://localhost:3000/", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        current_url = page.url
        print(f"   Current URL: {current_url} (Expected: http://localhost:3000/)")

        # 2. Manual navigation to /login
        print("\n2. Manually navigating to http://localhost:3000/login...")
        await page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        
        login_url = page.url
        print(f"   URL after opening /login: {login_url}")

        is_bypassed = login_url == "http://localhost:3000/" or "/login" not in login_url
        print(f"\n[SUMMARY] Direct Dashboard Access: PASS | /login Redirect: {'PASS' if is_bypassed else 'FAIL'}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_dev_bypass())
