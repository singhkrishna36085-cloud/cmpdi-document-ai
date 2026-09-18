import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("1. Loading Home Page...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        out_dir = r"C:/Users/Singh/.gemini/antigravity/brain/1f607aeb-2b1a-4a78-ab93-2cec6529b6d3"

        # Scroll Down Cycle 1
        print("2. Scroll Down Cycle 1...")
        await page.evaluate("window.scrollTo({top: 900, behavior: 'smooth'})")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=out_dir + "/scroll_1_down.png")
        print("Saved scroll_1_down.png")

        # Scroll to Pipeline (Section 2)
        await page.evaluate("window.scrollTo({top: 1700, behavior: 'smooth'})")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=out_dir + "/scroll_2_pipeline.png")
        print("Saved scroll_2_pipeline.png")

        # Scroll UP Cycle 1
        print("3. Scroll UP Cycle (returning to top)...")
        await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=out_dir + "/scroll_3_back_top.png")
        print("Saved scroll_3_back_top.png")

        # Scroll Down Cycle 2 (Testing re-trigger on repeated scroll)
        print("4. Scroll Down Cycle 2 (Testing repeated re-animation)...")
        await page.evaluate("window.scrollTo({top: 950, behavior: 'smooth'})")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=out_dir + "/scroll_4_down_again.png")
        print("Saved scroll_4_down_again.png")

        await browser.close()
        print("Scroll wave verification finished successfully!")

asyncio.run(main())