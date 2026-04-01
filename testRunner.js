const { chromium, firefox, devices } = require('playwright');
const fs = require('fs');

const DEVICE_CONFIGS = [
  { name: 'Desktop Chrome', browser: 'chromium', device: null },
  { name: 'Desktop Firefox', browser: 'firefox', device: null },
  { name: 'iPhone 13', browser: 'chromium', device: devices['iPhone 13'] },
];

async function runSingleTest(config) {
  let browser;

  const result = {
    device: config.name,
    browser: config.browser,
    status: 'passed',
    steps: [],
    errors: [],
    apiCalls: [],
    duration: 0
  };

  const startTime = Date.now();

  try {
    // Launch browser
    browser = await (config.browser === 'firefox'
      ? firefox.launch()
      : chromium.launch());

    const context = config.device
      ? await browser.newContext({ ...config.device })
      : await browser.newContext();

    const page = await context.newPage();

    // =========================
    // API MONITORING
    // =========================
    page.on('response', async (res) => {
      try {
        result.apiCalls.push({
          url: res.url(),
          status: res.status()
        });
      } catch {}
    });

    // =========================
    // STEP 1: LOAD LANDING
    // =========================
    await page.goto('https://lexpal.in', { waitUntil: 'networkidle' });

    result.steps.push('Landing page loaded');

    // =========================
    // STEP 2: HANDLE MOBILE VS DESKTOP
    // =========================
    const mobileMenuBtn = page.locator('button[aria-label="Toggle menu"]');

    if (await mobileMenuBtn.isVisible()) {
      // 📱 MOBILE FLOW
      result.steps.push('Mobile layout detected');

      await mobileMenuBtn.click();

      // Wait for menu to open
      const clientBtn = page.locator('button:has-text("For Clients")');
      await clientBtn.waitFor({ timeout: 5000 });

      await clientBtn.click();
      result.steps.push('Switched to client (mobile)');

      const loginBtn = page.locator('button:has-text("Log In")');
      await loginBtn.waitFor({ timeout: 5000 });

      await loginBtn.click();
      result.steps.push('Clicked login (mobile)');

    } else {
      // 💻 DESKTOP FLOW
      result.steps.push('Desktop layout detected');

      const clientToggle = page.locator('button:has-text("Clients")');

      await clientToggle.waitFor({ timeout: 5000 });
      await clientToggle.click();
      result.steps.push('Switched to client (desktop)');

      const loginBtn = page.locator('button:has-text("Log In")').first();
      await loginBtn.waitFor({ timeout: 5000 });

      await loginBtn.click();
      result.steps.push('Clicked login (desktop)');
    }

    // =========================
    // STEP 3: WAIT FOR LOGIN PAGE
    // =========================
    await page.waitForURL('**/Login', { timeout: 10000 });
    result.steps.push('Navigated to login page');

    // =========================
    // STEP 4: FILL LOGIN FORM
    // =========================
    await page.waitForSelector('input[name="email"]');

    await page.fill('input[name="email"]', 'mishrachinmay004@gmail.com');
    await page.fill('input[name="password"]', '123456');

    result.steps.push('Filled login form');

    // =========================
    // STEP 5: SUBMIT LOGIN
    // =========================
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/Dashboard', { timeout: 15000 });
    result.steps.push('Login successful → Dashboard');

    // =========================
    // STEP 6: VERIFY DASHBOARD
    // =========================
    const dashboardVisible = await page.locator('text=Featured Experts').isVisible();

    if (!dashboardVisible) {
      throw new Error('Dashboard UI not visible');
    }

    result.steps.push('Dashboard verified');

    // =========================
    // DONE
    // =========================
    result.duration = Date.now() - startTime;

    await browser.close();

  } catch (err) {
    if (browser) await browser.close();

    result.status = 'failed';
    result.errors.push(err.message);
    result.duration = Date.now() - startTime;
  }

  return result;
}

async function runFullTest() {
  console.log(`
====================================
 LEXPAL CROSS-DEVICE TEST ENGINE
====================================
`);

  const results = await Promise.all(
    DEVICE_CONFIGS.map(cfg => runSingleTest(cfg))
  );

  const reportPath = `./reports/lexpal-report-${Date.now()}.json`;

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log("Report saved:", reportPath);

  return results;
}

module.exports = runFullTest;