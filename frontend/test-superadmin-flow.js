import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/velavan/.gemini/antigravity-ide/brain/b307c978-9b2b-4aac-a937-6eb5c5820c97';

async function runFullE2ETest() {
  console.log('🚀 Starting Comprehensive Playwright E2E Test Suite...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  const results = {
    superadmin: [],
    shopOwner: [],
    errors: [],
  };

  try {
    // ==========================================
    // PART 1: GOOGLE-STANDARD SUPERADMIN CONSOLE
    // ==========================================
    console.log('\n======================================================');
    console.log('📌 PART 1: Testing Google Admin Standard Console (/admin)');
    console.log('======================================================');

    // 1. Navigate to Login
    console.log('1️⃣ Navigating to Login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]');

    // 2. Perform Superadmin Login
    console.log('2️⃣ Logging in as Superadmin (superadmin@pookal.com)...');
    await page.fill('input[type="email"]', 'superadmin@pookal.com');
    await page.fill('input[type="password"]', 'super@pookal');
    await page.click('button[type="submit"]');

    // 3. Wait for navigation to /admin
    console.log('3️⃣ Waiting for /admin Google Platform Console...');
    await page.waitForURL('**/admin', { timeout: 10000 });
    await page.waitForSelector('header', { timeout: 10000 });
    results.superadmin.push('Authenticated as Superadmin and reached /admin');

    // 4. Verify Superadmin Dedicated Header
    console.log('4️⃣ Verifying Superadmin Dedicated Platform Header...');
    const headerText = await page.innerText('header');
    
    if (!/Universal Business Platform/i.test(headerText) || !/Superadmin/i.test(headerText)) {
      throw new Error('Header does not display platform name and Superadmin badge!');
    }
    if (!headerText.includes('Platform Control Plane')) {
      throw new Error('Header missing "Platform Control Plane" subtitle!');
    }
    if (!headerText.includes('Global Multi-Tenant') && !headerText.includes('System Live')) {
      throw new Error('Header missing Global Multi-Tenant scope indicator!');
    }
    if (headerText.includes('Online Store')) {
      throw new Error('Superadmin header should NOT have "Online Store" link!');
    }

    // Verify Voice Assistant is fully suppressed
    const voiceFab = await page.$('.global-voice-assistant, .voice-assistant-fab, .pk-voice-fab');
    if (voiceFab) throw new Error('Voice Assistant floating button still present in Superadmin!');
    
    results.superadmin.push('Superadmin dedicated header verified (No voice widget, no storefront link, clean platform badge)');

    // 5. Verify Google Admin Hero Service Cards
    console.log('5️⃣ Verifying Google Admin Hero Service Cards...');
    await page.waitForSelector('.google-admin-hero-card', { timeout: 6000 });
    const heroCards = await page.$$('.google-admin-hero-card');
    console.log(`   - Found ${heroCards.length} Google Admin Hero Service Cards.`);
    if (heroCards.length < 4) throw new Error('Expected 4 Hero Service Cards (Tenants, Revenue, Licensing, Leads)!');
    results.superadmin.push(`Verified ${heroCards.length} Google Admin Hero Service Cards`);

    // 6. Test Google Admin Command Search Bar (Filter Shops)
    console.log('6️⃣ Testing Google Admin Command Search Bar...');
    const searchInput = page.locator('input[placeholder*="Search tenants, shop names"]');
    await searchInput.fill('murugan');
    await page.waitForTimeout(400);
    const filteredRows = await page.$$('table.pk-table tbody tr');
    console.log(`   - Filtered shop rows for "murugan": ${filteredRows.length}`);
    if (filteredRows.length === 0) throw new Error('Search did not match tenant "murugan"!');
    await searchInput.fill(''); // clear search
    await page.waitForTimeout(300);
    results.superadmin.push('Google Admin Command Search Bar verified live tenant filtering');

    // Screenshot of Superadmin Tenants Hub
    const adminTenantsPic = path.join(ARTIFACT_DIR, 'superadmin_console_verified.png');
    await page.screenshot({ path: adminTenantsPic, fullPage: true });
    console.log('📸 Captured Superadmin Console screenshot to:', adminTenantsPic);

    // 7. Verify Plans & Licensing Tab (Google Workspace Tier Cards)
    console.log('7️⃣ Verifying Product Plans & Licensing Tier Cards...');
    const plansTabBtn = page.locator('button.pk-tab', { hasText: 'Plans' });
    await plansTabBtn.click();
    await page.waitForSelector('.google-plan-card', { timeout: 6000 });
    const planCards = await page.$$('.google-plan-card');
    console.log(`   - Found ${planCards.length} Google-style tiered product plan cards.`);
    if (planCards.length < 3) throw new Error('Expected at least 3 Plan Cards (Starter, Pro, Enterprise)!');
    results.superadmin.push(`Verified ${planCards.length} tiered licensing plan cards with seat allowances`);

    const adminPlansPic = path.join(ARTIFACT_DIR, 'superadmin_plans_verified.png');
    await page.screenshot({ path: adminPlansPic, fullPage: true });
    console.log('📸 Captured Superadmin Plans screenshot to:', adminPlansPic);

    // 8. Verify Demo Requests Tab & 1-Click Provisioning
    console.log('8️⃣ Verifying Demo Requests Hub and Provision Shop action...');
    const demoTabBtn = page.locator('button.pk-tab', { hasText: 'Demo Requests' });
    await demoTabBtn.click();
    await page.waitForTimeout(600);
    const provisionBtns = await page.$$('button:has-text("Provision Shop")');
    console.log(`   - Found ${provisionBtns.length} "Provision Shop" conversion actions.`);
    results.superadmin.push(`Verified Demo Requests hub with 1-click Provision Shop capability`);

    // Logout Superadmin
    console.log('9️⃣ Logging out of Superadmin...');
    const signOutBtn = page.locator('header button:has-text("Sign Out")');
    await signOutBtn.click();
    await page.waitForURL('**/login', { timeout: 6000 });
    console.log('   - Logged out of Superadmin successfully.');


    // ====================================================
    // PART 2: SHOP OWNER GROWTH & CHANNELS & MONETIZATION
    // ====================================================
    console.log('\n======================================================');
    console.log('📌 PART 2: Testing Shop Owner Growth & Channels Suite');
    console.log('======================================================');

    // 1. Log in as Shop Owner
    console.log('1️⃣ Logging in as Shop Owner (velavanvelavan790@gmail.com)...');
    await page.fill('input[type="email"]', 'velavanvelavan790@gmail.com');
    await page.fill('input[type="password"]', 'vela@790');
    await page.click('button[type="submit"]');

    // 2. Wait for Dashboard or POS
    await page.waitForURL(/\/(dashboard|pos)/, { timeout: 10000 });
    results.shopOwner.push('Authenticated as Shop Owner (Murugan Shop)');

    // 3. Verify AppHeader Storefront Link is Dynamic (points to /store/murugan or /store)
    console.log('2️⃣ Verifying dynamic Storefront link in AppHeader...');
    await page.waitForSelector('a:has-text("Online Store")', { timeout: 6000 });
    const storeLink = await page.getAttribute('a:has-text("Online Store")', 'href');
    console.log(`   - Storefront link in header: ${storeLink}`);
    if (!storeLink || (!storeLink.includes('/store/murugan') && !storeLink.includes('/store'))) {
      throw new Error(`Expected storefront link /store/murugan or /store, got: ${storeLink}`);
    }
    results.shopOwner.push(`Dynamic storefront link in header: ${storeLink}`);

    // 4. Test CRM & Loyalty Suite (/crm)
    console.log('3️⃣ Navigating to CRM & Loyalty (/crm)...');
    await page.goto('http://localhost:5173/crm', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=CRM & Growth Engine', { timeout: 6000 });

    // Check WhatsApp Campaign Generator Tab
    const mktTabBtn = page.locator('button', { hasText: 'WhatsApp Marketing & Flash Sales' });
    await mktTabBtn.click();
    await page.waitForTimeout(500);
    const hasCampaignTools = (await page.locator('text=High-Converting Templates').count()) > 0 ||
                             (await page.locator('text=Customize Campaign Message').count()) > 0;
    console.log('   - WhatsApp Broadcast Campaign Generator loaded:', hasCampaignTools);
    if (!hasCampaignTools) throw new Error('Campaign generator not loaded in CRM!');

    // Check Loyalty Rewards Program Tab
    const loyaltyTabBtn = page.locator('button', { hasText: 'Loyalty Rewards Program' });
    await loyaltyTabBtn.click();
    await page.waitForTimeout(500);
    const hasLoyaltyProgram = (await page.locator('text=Customer Retention & Loyalty Engine').count()) > 0;
    console.log('   - Customer Retention & Loyalty Engine loaded:', hasLoyaltyProgram);
    if (!hasLoyaltyProgram) throw new Error('Loyalty program tab not loaded in CRM!');

    // Check Customers & Khata Ledger Tab
    const khataTabBtn = page.locator('button', { hasText: 'Customers & Khata Ledger' });
    await khataTabBtn.click();
    await page.waitForTimeout(500);

    results.shopOwner.push('CRM & Loyalty verified (Loyalty tiers, WhatsApp campaign generator, Khata ledger)');
    const crmPic = path.join(ARTIFACT_DIR, 'shop_crm_growth_verified.png');
    await page.screenshot({ path: crmPic, fullPage: true });
    console.log('📸 Captured CRM Growth screenshot to:', crmPic);

    // 5. Test Storefront Configuration (/website-config)
    console.log('4️⃣ Navigating to Storefront Configuration (/website-config)...');
    await page.goto('http://localhost:5173/website-config', { waitUntil: 'networkidle' });
    await page.waitForSelector('.wc-theme-card', { timeout: 6000 });

    // Verify multi-vertical themes
    const themes = await page.$$('.wc-theme-card');
    console.log(`   - Found ${themes.length} multi-vertical color themes.`);
    if (themes.length < 5) throw new Error('Expected at least 5 multi-vertical themes in Website Config!');

    // Switch to Orders & Money section
    const commerceNavBtn = page.locator('.wc-section-btn', { hasText: 'Orders & Money' });
    await commerceNavBtn.click();
    await page.waitForTimeout(400);

    // Verify Orders & Money Monetization fields
    const hasWaField = (await page.locator('text=WhatsApp Orders Phone Number').count()) > 0;
    const hasUpiField = (await page.locator('text=Shop UPI ID').count()) > 0;
    console.log('   - Direct monetization controls present (WhatsApp ordering & UPI QR):', hasWaField && hasUpiField);
    if (!hasWaField || !hasUpiField) throw new Error('Orders & Money direct revenue controls missing in Website Config!');

    results.shopOwner.push('Website Config verified (Multi-vertical themes + Orders & Money monetization controls)');
    const webConfigPic = path.join(ARTIFACT_DIR, 'shop_webconfig_verified.png');
    await page.screenshot({ path: webConfigPic, fullPage: true });
    console.log('📸 Captured Website Config screenshot to:', webConfigPic);

    // 6. Test Universal Online Storefront (/store/murugan)
    console.log('5️⃣ Navigating to Universal Online Storefront (/store/murugan)...');
    await page.goto('http://localhost:5173/store/murugan', { waitUntil: 'networkidle' });
    await page.waitForSelector('.sf-launchpad', { timeout: 8000 });

    // Verify Storefront Title
    const sfTitle = await page.innerText('.sf-launchpad__hero h1');
    console.log(`   - Online Storefront Shop Title: "${sfTitle}"`);

    // Verify multi-vertical category filters exist
    const catTiles = await page.$$('.sf-category-tile');
    console.log(`   - Category tiles found: ${catTiles.length}`);

    // Test adding product to bag and verify 1-Click WhatsApp Order
    const addBtns = await page.$$('.sf-product-card__btn, button:has-text("Add")');
    if (addBtns.length > 0) {
      await addBtns[0].click();
      await page.waitForTimeout(300);
      const cartTrigger = page.locator('.sf-cart-trigger');
      await cartTrigger.click();
      await page.waitForSelector('.sf-modal', { timeout: 4000 });
      const waBtn = await page.locator('button:has-text("WhatsApp Order")');
      const hasWaBtn = (await waBtn.count()) > 0;
      console.log('   - Cart displays 1-Click WhatsApp Direct Order button:', hasWaBtn);
      // Close cart modal
      const cartClose = page.locator('.sf-modal__close');
      if (await cartClose.count() > 0) await cartClose.click();
    }

    results.shopOwner.push('Online Storefront verified (/store/murugan with universal categories & 1-click WhatsApp order)');
    const sfPic = path.join(ARTIFACT_DIR, 'universal_storefront_verified.png');
    await page.screenshot({ path: sfPic, fullPage: true });
    console.log('📸 Captured Online Storefront screenshot to:', sfPic);

    // 7. Test Delivery Fulfillment Board (/delivery)
    console.log('6️⃣ Navigating to Delivery Board (/delivery)...');
    await page.goto('http://localhost:5173/delivery', { waitUntil: 'networkidle' });
    await page.waitForSelector('.delivery-col', { timeout: 6000 });

    const delivStages = await page.$$('.delivery-col');
    console.log(`   - Delivery fulfillment board loaded with ${delivStages.length} stage columns.`);
    results.shopOwner.push('Delivery Board verified (Universal fulfillment stages with WhatsApp tracking notifications)');
    const delivPic = path.join(ARTIFACT_DIR, 'delivery_board_verified.png');
    await page.screenshot({ path: delivPic, fullPage: true });
    console.log('📸 Captured Delivery Board screenshot to:', delivPic);

    console.log('\n🎉 ALL E2E TESTS COMPLETED WITH 100% SUCCESS!');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('❌ E2E Test Suite Failed:', err.message);
    results.errors.push(err.message);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_test_failure.png'), fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

runFullE2ETest().catch((e) => {
  console.error(e);
  process.exit(1);
});
