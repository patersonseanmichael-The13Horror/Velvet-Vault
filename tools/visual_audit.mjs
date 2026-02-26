import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173';
const pages = ['index.html','login.html','members.html','slots.html','roulette.html','blackjack.html','poker.html','ledger.html'];
const outDir = 'output/visual-audit';
fs.mkdirSync(outDir, { recursive: true });

const firebaseAppStub = `
export const initializeApp = (cfg) => ({ cfg });
`;

const firebaseAuthStub = `
const mkUser = () => ({ uid:'stub-user', email:'stub@velvet.test', emailVerified:true });
export const getAuth = () => ({ currentUser: mkUser(), authStateReady: async () => {} });
export const onAuthStateChanged = (auth, cb) => { Promise.resolve().then(() => cb(auth.currentUser)); return () => {}; };
export const signOut = async (auth) => { auth.currentUser = null; };
export const createUserWithEmailAndPassword = async () => ({ user: mkUser() });
export const signInWithEmailAndPassword = async () => ({ user: mkUser() });
export const sendEmailVerification = async () => {};
`;

function normError(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

const summary = [];
for (const pageName of pages) {
  const page = await context.newPage();
  const errors = [];
  const reqFails = [];

  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, body: '/* font stub */', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-app.js', (route) => route.fulfill({ status: 200, body: firebaseAppStub, contentType: 'application/javascript' }));
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js', (route) => route.fulfill({ status: 200, body: firebaseAuthStub, contentType: 'application/javascript' }));

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push({ type: 'console.error', text: normError(msg.text()) });
  });
  page.on('pageerror', (err) => errors.push({ type: 'pageerror', text: normError(err.message || String(err)) }));
  page.on('requestfailed', (req) => reqFails.push({ url: req.url(), reason: req.failure()?.errorText || 'failed' }));

  let status = 'ok';
  try {
    await page.goto(`${base}/${pageName}`, { waitUntil: 'commit', timeout: 20000 });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(outDir, `${pageName.replace('.html','')}.png`), fullPage: false, timeout: 15000 });
  } catch (err) {
    status = 'failed';
    errors.push({ type: 'audit', text: normError(err.message || String(err)) });
  }

  const dedup = [];
  const seen = new Set();
  for (const item of errors) {
    const k = `${item.type}|${item.text}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(item);
  }

  const result = { page: pageName, status, errorCount: dedup.length, errors: dedup, requestFailedCount: reqFails.length, requestFails: reqFails };
  summary.push(result);
  fs.writeFileSync(path.join(outDir, `${pageName.replace('.html','')}.json`), JSON.stringify(result, null, 2));
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
