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
    apiCalls: []
  };

  try {
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
    // STEP 1: LANDING
    // =========================
    await page.goto('https://lexpal.in', { waitUntil: 'networkidle' });

    result.steps.push('Landing loaded');

    // =========================
    // STEP 2: SWITCH TO CLIENT
    // =========================
    const clientToggle = page.locator('button:has-text("Clients")');

    await clientToggle.waitFor({ timeout: 5000 });
    await clientToggle.click();

    result.steps.push('Switched to client mode');

    // =========================
    // STEP 3: CLICK LOGIN
    // =========================
    const loginBtn = page.locator('button:has-text("Log In")').first();

    await loginBtn.click();

    // Wait for navigation to /Login
    await page.waitForURL('**/Login', { timeout: 10000 });

    result.steps.push('Navigated to client login page');

    // =========================
    // STEP 4: LOGIN FORM
    // =========================
    await page.waitForSelector('input[name="email"]');

    await page.fill('input[name="email"]', 'mishrachinmay004@gmail.com');
    await page.fill('input[name="password"]', '123456');

    result.steps.push('Filled login form');

    // =========================
    // STEP 5: SUBMIT LOGIN
    // =========================
    await page.click('button[type="submit"]');

    // Wait for dashboard redirect
    await page.waitForURL('**/Dashboard', { timeout: 15000 });

    result.steps.push('Login successful → Dashboard');

    // =========================
    // STEP 6: VERIFY DASHBOARD
    // =========================
    const dashboardCheck = await page.locator('text=Featured Experts').isVisible();

    if (!dashboardCheck) {
      throw new Error('Dashboard UI not visible');
    }

    result.steps.push('Dashboard verified');

    await browser.close();

  } catch (err) {
    if (browser) await browser.close();

    result.status = 'failed';
    result.errors.push(err.message);
  }

  return result;
}

async function runFullTest() {
  const results = await Promise.all(
    DEVICE_CONFIGS.map(cfg => runSingleTest(cfg))
  );

  const path = `./reports/lexpal-report-${Date.now()}.json`;
  fs.writeFileSync(path, JSON.stringify(results, null, 2));

  console.log("Report saved:", path);

  return results;
}

module.exports = runFullTest;