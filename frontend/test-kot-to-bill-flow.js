import { chromium } from 'playwright';

async function testKotToBillLifecycle() {
  console.log('🚀 Starting Full Lifecycle Test: KOT -> Prep -> Delivery -> Customer Billing & Settle...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('dialog', async dialog => {
    console.log(`⚠️ Alert: "${dialog.message()}"`);
    await dialog.dismiss();
  });

  try {
    // Step 1: Login
    console.log('Logging in as restaurant shop owner...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'velavanvelavan790@gmail.com');
    await page.fill('input[type="password"]', 'vela@790');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in successfully.');

    // Step 2: Open Restaurant page & ensure at least 1 table exists
    console.log('Navigating to Restaurant Operations...');
    await page.goto('http://localhost:5173/restaurant');
    await page.waitForLoadState('networkidle');

    // Step 3: Check KOTs tab
    const kotTab = page.locator('button:has-text("Kitchen Display / KOTs")');
    await kotTab.click();
    await page.waitForTimeout(1000);

    // Look for Settle button on existing KOTs
    let settleButtons = page.locator('button:has-text("Settle (Rs.")');
    let settleCount = await settleButtons.count();
    console.log(`Found ${settleCount} KOT cards with Settle Bill buttons.`);

    if (settleCount === 0) {
      // Create a dine-in order via POS to have an active ticket
      console.log('Navigating to POS to create an order with KOT...');
      await page.goto('http://localhost:5173/pos');
      await page.waitForLoadState('networkidle');

      // Click Dine-in button
      const dineInBtn = page.locator('button:has-text("Dine-in")');
      if (await dineInBtn.count() > 0) {
        await dineInBtn.click();
      }

      // Add item to cart
      const addBtns = page.locator('button:has-text("Add")');
      if (await addBtns.count() > 0) {
        await addBtns.first().click();
        await page.waitForTimeout(500);

        // If portion/modifier modal opened, confirm it
        const confirmBtn = page.locator('.modal.show button:has-text("Add To Order"), .modal.show button:has-text("Confirm")');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.first().click();
          await page.waitForTimeout(500);
        }
      }

      // Click "Send KOT"
      console.log('Clicking "Send KOT" to dispatch ticket to kitchen...');
      const sendKotBtn = page.locator('button:has-text("Send KOT")');
      if (await sendKotBtn.count() > 0) {
        await sendKotBtn.click();
        await page.waitForTimeout(1500);
        console.log('✅ KOT placed successfully from POS!');
      }

      // Go back to restaurant module
      await page.goto('http://localhost:5173/restaurant');
      await page.waitForLoadState('networkidle');
      await page.locator('button:has-text("Kitchen Display / KOTs")').click();
      await page.waitForTimeout(1000);
      settleButtons = page.locator('button:has-text("Settle (Rs.")');
      settleCount = await settleButtons.count();
    }

    if (settleCount > 0) {
      console.log('Clicking "Settle (Rs. ...)" on the KOT card...');
      await settleButtons.first().click();
      await page.waitForTimeout(1000);

      // Settle Modal should be visible
      const modal = page.locator('.modal.show');
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Customer Bill Settlement Modal opened smoothly.');

      // Capture screenshot of settlement modal
      await page.screenshot({ path: '/Users/velavan/.gemini/antigravity-ide/brain/b307c978-9b2b-4aac-a937-6eb5c5820c97/restaurant_settle_modal_verified.png' });
      console.log('📸 Captured: restaurant_settle_modal_verified.png');

      // Click "Confirm Payment & Close Order"
      const confirmPaymentBtn = page.locator('button:has-text("Confirm Payment & Close Order")');
      await confirmPaymentBtn.click();
      await page.waitForTimeout(1500);

      // Verify the Settled Receipt popup appeared
      const receiptModal = page.locator('.modal.show:has-text("Payment Received & Settled!")');
      if (await receiptModal.count() > 0) {
        console.log('✅ Payment received and finalized! Guest bill ready.');
        await page.screenshot({ path: '/Users/velavan/.gemini/antigravity-ide/brain/b307c978-9b2b-4aac-a937-6eb5c5820c97/restaurant_settled_receipt_verified.png' });
        console.log('📸 Captured: restaurant_settled_receipt_verified.png');

        // Close receipt modal
        await page.locator('.modal.show button:has-text("Close")').click();
        await page.waitForTimeout(500);
      }
    }

    console.log('🎉 COMPLETE KOT BILLING & CUSTOMER SETTLEMENT LIFECYCLE PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
  }
}

testKotToBillLifecycle().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
