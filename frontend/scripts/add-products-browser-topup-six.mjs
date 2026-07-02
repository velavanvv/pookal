import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const timestamp = Date.now();
const products = Array.from({ length: 6 }, (_, index) => ({
  name: `Codex Final ${index + 1}`,
  sku: `CDX-FINAL-${timestamp}-${index + 1}`,
  category: index % 2 === 0 ? 'Bouquet' : 'Supply',
  price: 599 + (index * 40),
  unit: index % 2 === 0 ? 'bunch' : 'piece',
  reorder_level: 3 + index,
  initial_stock: 12 + index,
  track_freshness: index % 2 === 0 ? 'true' : 'false',
  freshness_days: index % 2 === 0 ? 4 + index : 1,
  image_url: '',
}));

const csvPath = join(process.cwd(), 'tmp-products-final.csv');
const header = Object.keys(products[0]).join(',');
const rows = products.map((product) => Object.values(product).join(','));
writeFileSync(csvPath, `${header}\n${rows.join('\n')}\n`);

const authResponse = await fetch('http://127.0.0.1:8000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@pookal.com',
    password: 'pookal123',
  }),
});

const auth = await authResponse.json();

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});

const context = await browser.newContext();
const page = await context.newPage();

page.on('dialog', async (dialog) => {
  console.log(`Dialog: ${dialog.message()}`);
  await dialog.accept();
});

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.evaluate((session) => {
  localStorage.setItem('pookal_auth_token', session.token);
  localStorage.setItem('pookal_auth_user', JSON.stringify(session.user));
}, {
  token: auth.token,
  user: auth.user,
});

await page.goto('http://localhost:5173/products', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Manual Add', { timeout: 15000 });
await page.setInputFiles('input[type="file"]', csvPath);
await page.getByRole('button', { name: 'Import Products' }).click();
await page.waitForTimeout(1500);
await page.getByPlaceholder('Search products…').fill(`CDX-FINAL-${timestamp}-`);
await page.waitForTimeout(600);
const foundRows = await page.locator('table.pk-table tbody tr').count();
console.log(`Final topup rows visible after search: ${foundRows}`);

await browser.close();
