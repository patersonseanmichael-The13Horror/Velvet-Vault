import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BASE = "http://127.0.0.1:4173";

const PAGES = [
  "index.html",
  "login.html",
  "members.html",
  "slots.html",
  "roulette.html",
  "blackjack.html",
  "poker.html",
  "ledger.html",
];

const FORBIDDEN = ["Grand Golden Vault"];

let ABORTED = false;
let browser = null;

function onAbort() {
  ABORTED = true;
}
process.on("SIGINT", onAbort);
process.on("SIGTERM", onAbort);

function existsFile(rel) {
  try {
    const p = path.join(ROOT, rel.replace(/^\/+/, ""));
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let items = [];
    try {
      items = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of items) {
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else if (it.isFile()) out.push(full);
    }
  }
  return out;
}

function scanForbidden() {
  const targets = walkFiles(ROOT).filter(
    (f) =>
      /\.(html|css|js|md|json|txt)$/i.test(f) &&
      !f.includes(`${path.sep}node_modules${path.sep}`) &&
      !f.includes(`${path.sep}.git${path.sep}`) &&
      !path.basename(f).startsWith(".tmp_")
  );

  const hits = [];
  for (const f of targets) {
    let text = "";
    try {
      text = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const bad of FORBIDDEN) {
      if (text.includes(bad)) hits.push({ file: path.relative(ROOT, f), match: bad });
    }
  }
  return hits;
}

function normalizeAssetUrl(raw) {
  if (!raw) return null;
  const u = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!u) return null;
  if (u.startsWith("data:")) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return null;
  if (u.startsWith("//")) return null;
  if (u.startsWith("#")) return null;
  return u.split("#")[0].split("?")[0].replace(/^\/+/, "");
}

async function collectMissingAssets(page) {
  return await page.evaluate(() => {
    const assets = new Set();

    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src) assets.add(src);
    });

    const urlRe = /url\(\s*([^)]+)\s*\)/g;

    function grabUrlsFromText(cssText) {
      if (!cssText) return;
      let m;
      while ((m = urlRe.exec(cssText)) !== null) assets.add(m[1]);
    }

    document.querySelectorAll("*").forEach((el) => {
      const st = el.getAttribute("style");
      if (st) grabUrlsFromText(st);
    });

    document.querySelectorAll("style").forEach((s) => grabUrlsFromText(s.textContent || ""));

    const sheets = Array.from(document.styleSheets || []);
    for (const sh of sheets) {
      try {
        const rules = Array.from(sh.cssRules || []);
        for (const r of rules) {
          if (r?.cssText) grabUrlsFromText(r.cssText);
        }
      } catch {
        // ignore blocked/cross-origin
      }
    }

    return Array.from(assets);
  });
}

async function headStatus(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.status;
  } catch {
    return 0;
  }
}

async function safeCloseBrowser() {
  try {
    if (browser) await browser.close();
  } catch {}
  browser = null;
}

async function run() {
  const startedAt = Date.now();

  const forbiddenHits = scanForbidden();

  browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const results = [];
  const missingImagesGlobal = [];
  const assetsChecked = new Set();

  for (const p of PAGES) {
    if (ABORTED) break;

    const url = `${BASE}/${p}`;

    // DESKTOP
    let status = "NO_RESPONSE";
    const consoleErrors = [];
    const page = await desktop.newPage();

    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
    });

    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = String(resp?.status() ?? "NO_RESPONSE");
      await page.waitForTimeout(800);

      const assets = await collectMissingAssets(page);
      for (const a of assets) {
        if (ABORTED) break;
        const norm = normalizeAssetUrl(a);
        if (!norm) continue;
        if (assetsChecked.has(norm)) continue;
        assetsChecked.add(norm);

        const fsOk = existsFile(norm);
        const httpS = await headStatus(`${BASE}/${norm}`);
        const httpOk = httpS >= 200 && httpS < 400;

        if (!fsOk && !httpOk) {
          missingImagesGlobal.push({ asset: norm, referencedBy: p });
        }
      }
    } catch (e) {
      consoleErrors.push(`navigation: ${e.message}`);
    } finally {
      try {
        await page.close();
      } catch {}
    }

    // MOBILE overflow
    let overflow = { overflowX: false, scrollWidth: null, clientWidth: null };
    let mstatus = "NO_RESPONSE";
    const mpage = await mobile.newPage();

    try {
      const resp = await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      mstatus = String(resp?.status() ?? "NO_RESPONSE");
      await mpage.waitForTimeout(600);
      overflow = await mpage.evaluate(() => {
        const doc = document.documentElement;
        return {
          overflowX: doc.scrollWidth > doc.clientWidth,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
    } catch (e) {
      overflow = { overflowX: true, scrollWidth: null, clientWidth: null, error: e.message };
    } finally {
      try {
        await mpage.close();
      } catch {}
    }

    results.push({ page: p, http: status, mobileHttp: mstatus, consoleErrors, overflow });
  }

  await safeCloseBrowser();

  const summary = {
    aborted: ABORTED,
    ok:
      !ABORTED &&
      forbiddenHits.length === 0 &&
      missingImagesGlobal.length === 0 &&
      results.every((r) => r.http === "200" && r.consoleErrors.length === 0 && !r.overflow.overflowX),
    timeMs: Date.now() - startedAt,
    forbiddenHits,
    missingAssets: missingImagesGlobal,
    pageResults: results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (ABORTED) process.exit(130);
  if (!summary.ok) process.exit(2);
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Audit crashed:", e?.message || e);
  await safeCloseBrowser();
  process.exit(1);
});
