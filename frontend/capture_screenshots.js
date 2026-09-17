const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => console.log(`[Browser Console ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

  try {
    console.log('Navigating to landing page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a moment for 3D/animations to initialize
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'landing_page.png', fullPage: true });
    console.log('Captured landing_page.png');
    
    console.log('Navigating to assistant page...');
    await page.goto('http://localhost:3000/assistant', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for animations
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'assistant_page.png', fullPage: true });
    console.log('Captured assistant_page.png');

  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    await browser.close();
  }
})();
