import asyncio
from playwright.async_api import async_playwright
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

async def verify_all_routes():
    print(f"\n==================================================")
    print(f"VERIFYING REDESIGNED 3D PLATFORM ON LOCALHOST:3000")
    print(f"==================================================")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error"] else None)

        results = {}

        for route in ROUTES:
            target_url = f"http://localhost:3000{route}"
            print(f"\n---> Testing Route: {route}")

            try:
                response = await page.goto(target_url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)

                status_code = response.status if response else 0
                
                # Check for headings
                headings = []
                for h in await page.locator("h1, h2, h3").all():
                    txt = await h.inner_text()
                    if txt.strip():
                        headings.append(txt.strip())

                button_count = await page.locator("button").count()
                glass_panels = await page.locator(".glass-panel, .glass-panel-interactive, .bg-slate-900").count()
                
                # Check 3D core canvas on /
                has_canvas = False
                if route == "/":
                    canvas_count = await page.locator("canvas").count()
                    has_canvas = canvas_count > 0
                    print(f"  [3D Core Check] WebGL Canvas elements present: {canvas_count}")

                print(f"  [PASS] Status: {status_code} | Headings: {headings[:2]} | Buttons: {button_count} | Glass Panels: {glass_panels}")

                results[route] = {
                    "status": "PASS",
                    "http_status": status_code,
                    "headings": headings[:3],
                    "button_count": button_count,
                    "glass_panels": glass_panels,
                    "has_canvas": has_canvas
                }

            except Exception as e:
                print(f"  [FAIL] Route {route} error: {str(e)}")
                results[route] = {
                    "status": "FAIL",
                    "error": str(e)
                }

        print(f"\nTotal Console Errors: {len(console_errors)}")
        for err in console_errors[:5]:
            print(f"  {err}")

        await browser.close()
        return results

if __name__ == "__main__":
    asyncio.run(verify_all_routes())
