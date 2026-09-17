const { chromium } = require("playwright");

async function runBrowserTest() {
  console.log("=== STARTING REAL CHROMIUM BROWSER LOGIN TEST ===");
  console.log("Production URL: https://sih-26023-flame.vercel.app/login\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Listen for console messages and errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
    } else {
      console.log(`[BROWSER CONSOLE] ${msg.text()}`);
    }
  });

  // 2. Listen for network requests & failures
  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      console.log(`[NETWORK REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log(`[NETWORK RESP] ${res.status()} ${res.url()}`);
    }
  });

  page.on("requestfailed", (req) => {
    console.log(`[NETWORK FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1 & 2: Open website & HOD Login
    // ──────────────────────────────────────────────────────────────────────────
    console.log("--- TEST 1: HOD Login ('cmpdi_admin') ---");
    await page.goto("https://sih-26023-flame.vercel.app/login", { waitUntil: "networkidle" });
    console.log("Page loaded. Current URL:", page.url());

    // Select HOD Admin tab
    const hodTabButton = page.locator("button:has-text('HOD Admin')");
    if (await hodTabButton.isVisible()) {
      await hodTabButton.click();
      console.log("Clicked HOD Admin tab.");
    }

    // Fill Username and Password
    await page.fill("#username", "cmpdi_admin");
    await page.fill("#password", "CMPDI_Secure_Auth_2026!");
    console.log("Entered HOD credentials into form.");

    // Submit form
    console.log("Submitting login form...");
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      page.click("button[type='submit']")
    ]);

    await page.waitForTimeout(2000);
    const afterHodUrl = page.url();
    console.log("Post-login URL:", afterHodUrl);

    // Check if error banner is displayed
    const errorBanner = page.locator(".bg-red-950\\/50, .text-red-200");
    if (await errorBanner.isVisible()) {
      const errorText = await errorBanner.innerText();
      console.log(`[ERROR BANNER SHOWN]: "${errorText}"`);
    }

    // Verify localStorage & Cookies
    const tokenInLocalStorage = await page.evaluate(() => localStorage.getItem("cmpdi_auth_token") || localStorage.getItem("access_token"));
    console.log("Token stored in localStorage:", tokenInLocalStorage ? "YES (Valid Token)" : "NO");

    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === "cmpdi_auth_token");
    console.log("Token stored in Cookie:", authCookie ? "YES" : "NO");

    const hodSuccess = afterHodUrl.endsWith("/") || afterHodUrl === "https://sih-26023-flame.vercel.app/";
    console.log(`HOD Login Outcome: ${hodSuccess ? "PASS" : "FAIL"}`);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: Refresh Dashboard & Session Persistence
    // ──────────────────────────────────────────────────────────────────────────
    if (hodSuccess) {
      console.log("\n--- TEST 2: Session Persistence Across Refresh ---");
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      const refreshUrl = page.url();
      console.log("Post-refresh URL:", refreshUrl);
      console.log(`Session Persistence Outcome: ${refreshUrl.endsWith("/") ? "PASS" : "FAIL"}`);

      // Test Logout
      console.log("\n--- TEST 3: Logout Flow ---");
      const logoutButton = page.locator("button:has-text('Logout'), button:has-text('Sign Out')");
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        console.log("Clicked Logout. URL now:", page.url());
      } else {
        console.log("Logout button not directly found on sidebar, clearing token manually.");
        await page.evaluate(() => {
          localStorage.clear();
          document.cookie = "cmpdi_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: NORMAL_USER Login Test
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 4: NORMAL_USER Login ('normal_user') ---");
    await page.goto("https://sih-26023-flame.vercel.app/login", { waitUntil: "networkidle" });

    // Select Normal User tab
    const normalTabButton = page.locator("button:has-text('Normal User')");
    if (await normalTabButton.isVisible()) {
      await normalTabButton.click();
      console.log("Clicked Normal User tab.");
    }

    await page.fill("#username", "normal_user");
    await page.fill("#password", "CMPDI_Secure_Auth_2026!");
    console.log("Entered NORMAL_USER credentials.");

    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      page.click("button[type='submit']")
    ]);

    await page.waitForTimeout(2000);
    const afterNormUrl = page.url();
    console.log("Post-login URL for NORMAL_USER:", afterNormUrl);

    const normSuccess = afterNormUrl.endsWith("/") || afterNormUrl === "https://sih-26023-flame.vercel.app/";
    console.log(`NORMAL_USER Login Outcome: ${normSuccess ? "PASS" : "FAIL"}`);

    console.log("\n=== REAL BROWSER LOGIN SUITE COMPLETED ===");

  } catch (err) {
    console.error("Browser test error:", err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
