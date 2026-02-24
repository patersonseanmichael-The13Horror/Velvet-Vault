import { chromium } from 'playwright';

const pages = ['index.html','login.html','members.html','slots.html','roulette.html','blackjack.html','poker.html','ledger.html'];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const out = [];
for (const p of pages) {
  const page = await context.newPage();
  let overflow = null;
  let status = 'NO_RESPONSE';
  try {
    const resp = await page.goto(`http://127.0.0.1:4173/${p}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    status = String(resp?.status() ?? 'NO_RESPONSE');
    await page.waitForTimeout(600);
    overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflowX: doc.scrollWidth > doc.clientWidth
      };
    });
  } catch (e) {
    overflow = { error: e.message };
  }
  out.push({ page: p, status, ...overflow });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
