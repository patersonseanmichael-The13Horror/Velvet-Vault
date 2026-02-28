// tools/vv_audit_strict.mjs
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = process.cwd();
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

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 720 },
];

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readText(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp, out);
    else out.push(fp);
  }
  return out;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// Extract asset paths from html/css/js
function extractAssetRefs(text) {
  const refs = [];
  // src="..." href="..." poster="..."
  for (const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) refs.push(m[1]);
  // url("...") or url(...)
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) refs.push(m[1]);
  // fetch("...") / fetch('...')
  for (const m of text.matchAll(/\bfetch\(\s*["']([^"']+)["']/gi)) refs.push(m[1]);
  return refs
    .map(r => r.trim())
    .filter(r => r && !r.startsWith("http://") && !r.startsWith("https://") && !r.startsWith("data:") && !r.startsWith("mailto:") && !r.startsWith("#"));
}

function resolveLocal(ref) {
  // If ref begins with / treat as relative to ROOT
  const clean = ref.replace(/^file:\/\//, "");
  if (clean.startsWith("/")) return path.join(ROOT, clean.slice(1));
  return path.join(ROOT, clean);
}

function nowISO() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-");
}

async function run() {
  const reportDir = path.join(ROOT, "audit");
  if (!exists(reportDir)) fs.mkdirSync(reportDir);

  const stamp = nowISO();
  const outJson = path.join(reportDir, `vv_audit_${stamp}.json`);
  const outMd = path.join(reportDir, `vv_audit_${stamp}.md`);
  const shotsDir = path.join(reportDir, `shots_${stamp}`);
  fs.mkdirSync(shotsDir, { recursive: true });

  const issues = [];
  const summary = {
    pages: [],
    missingAssets: [],
    forbiddenRefs: [],
  };

  // 1) Forbidden reference scan
  const allFiles = walk(ROOT).filter(f =>
    !f.includes(`${path.sep}.git${path.sep}`) &&
    !f.includes(`${path.sep}node_modules${path.sep}`) &&
    !f.includes(`${path.sep}audit${path.sep}`) &&
    (f.endsWith(".html") || f.endsWith(".css") || f.endsWith(".js") || f.endsWith(".md"))
  );

  const forbidden = [];
  for (const f of allFiles) {
    const t = readText(f);
    for (const word of forbidden) {
      if (t.includes(word)) {
        summary.forbiddenRefs.push({ file: path.relative(ROOT, f), match: word });
      }
    }
  }
  if (summary.forbiddenRefs.length) {
    issues.push({ severity: "CRITICAL", title: "Forbidden references detected", details: summary.forbiddenRefs });
  }

  // 2) Missing asset scan from source files (static scan)
  const assetRefs = [];
  for (const f of allFiles.filter(x => x.endsWith(".html") || x.endsWith(".css") || x.endsWith(".js"))) {
    const t = readText(f);
    const refs = extractAssetRefs(t);

    // only consider local-ish paths
    for (const r of refs) {
      // ignore firebase/google cdn scripts
      if (r.includes("gstatic.com") || r.includes("googleapis.com")) continue;
      // ignore in-page anchors
      if (r.startsWith("#")) continue;
      assetRefs.push({ file: path.relative(ROOT, f), ref: r });
    }
  }

  const missing = [];
  for (const { file, ref } of assetRefs) {
    // ignore query-only
    const r = ref.split("?")[0].split("#")[0];
    // ignore empty
    if (!r) continue;
    // ignore external protocol-ish
    if (/^[a-z]+:\/\//i.test(r)) continue;

    // resolve relative to project root first
    const p1 = resolveLocal(r);

    // resolve relative to the file itself second (common in css/js)
    const p2 = path.join(ROOT, path.dirname(file), r);

    if (!exists(p1) && !exists(p2)) {
      missing.push({ file, ref: r });
    }
  }
  summary.missingAssets = uniq(missing.map(m => JSON.stringify(m))).map(s => JSON.parse(s));

  if (summary.missingAssets.length) {
    issues.push({ severity: "HIGH", title: "Missing local assets referenced", details: summary.missingAssets });
  }

  // 3) Runtime audit (Playwright): console errors + request failures + overflow + screenshots
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ].filter(Boolean);

  let browser = null;
  let lastErr = null;

  for (const exe of candidates) {
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: exe,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--no-zygote",
          "--disable-gpu"
        ]
      });
      console.log("[VV] Using system Chromium:", exe);
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!browser) {
    // fallback to Playwright bundled Chromium
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
        "--disable-gpu",
        "--single-process"
      ]
    });
  }

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

    for (const p of PAGES) {
      const page = await context.newPage();
      const pageErrors = [];
      const requestFails = [];

      page.on("pageerror", (err) => pageErrors.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") pageErrors.push(`console.error: ${msg.text()}`);
      });
      page.on("requestfailed", (req) => {
        const u = req.url();
        // ignore aborted redirects (common in auth guards)
        const failure = req.failure();
        const reason = failure?.errorText || "unknown";
        if (!reason.toLowerCase().includes("aborted")) {
          requestFails.push(`${reason}: ${u}`);
        }
      });

      const url = `http://127.0.0.1:4173/${p}`;
      let status = "NO_RESPONSE";
      let overflow = null;

      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        status = String(resp?.status() ?? "NO_RESPONSE");
        // settle animations/fonts a bit
        await page.waitForTimeout(900);

        overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const sw = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
          const cw = doc.clientWidth;
          return { overflowX: sw > cw + 1, scrollWidth: sw, clientWidth: cw };
        });

        const shotName = `${vp.name}_${p.replace(".html", "")}.png`;
        await page.screenshot({ path: path.join(shotsDir, shotName), fullPage: true });
      } catch (e) {
        pageErrors.push(`navigation: ${e.message}`);
      }

      summary.pages.push({
        viewport: vp.name,
        page: p,
        url,
        status,
        overflow,
        consoleErrors: pageErrors,
        requestFails
      });

      if (status !== "200") {
        issues.push({ severity: "HIGH", title: `Page not 200: ${p} (${vp.name})`, details: { status, url } });
      }
      if (overflow?.overflowX) {
        issues.push({ severity: "MEDIUM", title: `Horizontal overflow: ${p} (${vp.name})`, details: overflow });
      }
      if (pageErrors.length) {
        issues.push({ severity: "HIGH", title: `Console/Page errors: ${p} (${vp.name})`, details: pageErrors });
      }
      if (requestFails.length) {
        issues.push({ severity: "MEDIUM", title: `Request failures: ${p} (${vp.name})`, details: requestFails });
      }

      await page.close();
    }

    await context.close();
  }

  await browser.close();

  const result = {
    timestamp: stamp,
    root: ROOT,
    pages: PAGES,
    viewports: VIEWPORTS,
    issues,
    summary
  };

  fs.writeFileSync(outJson, JSON.stringify(result, null, 2), "utf8");

  // Markdown report
  const md = [];
  md.push(`# Velvet Vault Strict Audit`);
  md.push(`- Timestamp: \`${stamp}\``);
  md.push(`- Root: \`${ROOT}\``);
  md.push(`- Screenshots: \`${path.relative(ROOT, shotsDir)}\``);
  md.push(``);

  const sevOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const grouped = {};
  for (const s of sevOrder) grouped[s] = [];
  for (const i of issues) grouped[i.severity] = grouped[i.severity] || [], grouped[i.severity].push(i);

  for (const s of sevOrder) {
    md.push(`## ${s}`);
    if (!grouped[s]?.length) {
      md.push(`- None`);
    } else {
      grouped[s].forEach((it, idx) => {
        md.push(`- **${it.title}**`);
        md.push(`  - Details: \`${JSON.stringify(it.details).slice(0, 900)}${JSON.stringify(it.details).length > 900 ? "…" : ""}\``);
      });
    }
    md.push(``);
  }

  md.push(`## Forbidden references`);
  if (!summary.forbiddenRefs.length) md.push(`- PASS (0 matches)`);
  else summary.forbiddenRefs.forEach(x => md.push(`- ${x.file} → ${x.match}`));
  md.push(``);

  md.push(`## Missing assets`);
  if (!summary.missingAssets.length) md.push(`- PASS (0 missing)`);
  else summary.missingAssets.forEach(x => md.push(`- ${x.file} → ${x.ref}`));
  md.push(``);

  md.push(`## Page results (quick)`);
  for (const r of summary.pages) {
    const errCount = (r.consoleErrors?.length || 0);
    const rfCount = (r.requestFails?.length || 0);
    const ov = r.overflow?.overflowX ? "OVERFLOW" : "OK";
    md.push(`- ${r.viewport.toUpperCase()} \`${r.page}\` → ${r.status} • overflow:${ov} • consoleErr:${errCount} • reqFail:${rfCount}`);
  }
  md.push("");

  fs.writeFileSync(outMd, md.join("\n"), "utf8");

  console.log(`OK: wrote report`);
  console.log(`- ${path.relative(ROOT, outMd)}`);
  console.log(`- ${path.relative(ROOT, outJson)}`);
  console.log(`- screenshots: ${path.relative(ROOT, shotsDir)}`);
}

run().catch((e) => {
  console.error("AUDIT_FAILED:", e);
  process.exit(1);
});
