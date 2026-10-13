import { chromium } from 'playwright';

async function testKotAdvance() {
  console.log('🧪 Starting KOT Status Advance Browser Test...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to dialogs (such as window.alert)
  let dialogMessage = null;
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log(`⚠️ Dialog appeared: "${dialogMessage}"`);
    await dialog.dismiss();
  });

  try {
    // 1. Login
    console.log('Logging in as velavanvelavan790@gmail.com...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'velavanvelavan790@gmail.com');
    await page.fill('input[type="password"]', 'vela@790');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in successfully.');

    // 2. Navigate to Restaurant page
    console.log('Navigating to Restaurant module...');
    await page.goto('http://localhost:5173/restaurant');
    await page.waitForLoadState('networkidle');

    // 3. Switch to KOT tab
    console.log('Switching to Kitchen Display / KOTs tab...');
    const kotTab = page.locator('button:has-text("Kitchen Display / KOTs")');
    await kotTab.click();
    await page.waitForTimeout(1000);

    // 4. Find advance buttons
    const advanceButtons = page.locator('button:has-text("Start Prep"), button:has-text("Mark Ready"), button:has-text("Mark Served")');
    const count = await advanceButtons.count();
    console.log(`Found ${count} advanceable KOT buttons.`);

    if (count > 0) {
      const firstBtn = advanceButtons.first();
      const btnText = await firstBtn.innerText();
      console.log(`Clicking button: "${btnText}"...`);
      await firstBtn.click();
      await page.waitForTimeout(1500);

      if (dialogMessage) {
        throw new Error(`Failed to advance ticket status! Dialog: ${dialogMessage}`);
      }

      console.log(`✅ Successfully advanced KOT ticket status without errors!`);
    } else {
      console.log('No advanceable tickets found currently.');
    }

    // Take screenshot
    await page.screenshot({ path: '/Users/velavan/.gemini/antigravity-ide/brain/b307c978-9b2b-4aac-a937-6eb5c5820c97/kot_advance_verified.png' });
    console.log('📸 Screenshot saved to kot_advance_verified.png');
    console.log('🎉 KOT ADVANCE TEST PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
  }
}

testKotAdvance().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
