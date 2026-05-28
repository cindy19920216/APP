import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

const pages = [
  { url: 'http://localhost:3000', name: 'dashboard' },
  { url: 'http://localhost:3000/assets', name: 'assets' },
  { url: 'http://localhost:3000/members', name: 'members' },
  { url: 'http://localhost:3000/transactions', name: 'transactions' },
  { url: 'http://localhost:3000/ticker-codes', name: 'ticker-codes' },
  { url: 'http://localhost:3000/analysis', name: 'analysis' },
];

for (const p of pages) {
  await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: `shot_${p.name}.png`, fullPage: false });
  console.log(`done: ${p.name}`);
}

await browser.close();
