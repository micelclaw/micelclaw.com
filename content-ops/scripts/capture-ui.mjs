#!/usr/bin/env node
// capture-ui.mjs — capture the real product UI (dash) with Chromium. Staging output → _artifacts.
// Auth: uses a Playwright storageState JSON (DASH_STORAGE_STATE) captured once as PACO TRUENO — never admin.
// Usage:
//   node scripts/capture-ui.mjs --module drive [--selector ".file-grid"] [--out name.png] [--full]
//   node scripts/capture-ui.mjs --url http://localhost:7100/finance --width 1440 --height 900
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, isAbsolute, join, dirname } from 'node:path';
import { env, REPO_ROOT } from './lib/env.mjs';
import { getChromium } from './lib/playwright.mjs';

const STAGING = '/home/victor/Projects/_artifacts/screenshots/inbox';

// Minimal dash route map; unknown modules fall back to /<module>.
const ROUTES = {
  drive: '/drive', finance: '/finance', photos: '/photos', calendar: '/calendar', notes: '/notes',
  activity: '/activity', chat: '/chat', agents: '/agents', graph: '/graph', search: '/search',
  inventory: '/inventory', mail: '/mail', office: '/office', studio: '/studio', explorer: '/explorer',
};

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = env('DASH_BASE_URL', 'http://localhost:7100').replace(/\/$/, '');
  const url = args.url || `${base}${ROUTES[args.module] || '/' + (args.module || '')}`;
  const width = Number(args.width || 1440);
  const height = Number(args.height || 900);
  // Sanitize only the auto-generated default; respect an explicit --out (may be an absolute path).
  const defaultName = `${args.module || 'ui'}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`.replace(/[^\w.\-]/g, '_');
  const outArg = args.out || defaultName;
  const outPath = isAbsolute(outArg) ? outArg : join(STAGING, outArg);
  mkdirSync(dirname(outPath), { recursive: true });

  const chromium = getChromium();
  const browser = await chromium.launch({ headless: true });

  const storageState = env('DASH_STORAGE_STATE');
  const ctxOpts = { viewport: { width, height }, deviceScaleFactor: 2 };
  if (storageState && existsSync(storageState)) ctxOpts.storageState = storageState;
  else console.warn('[warn] no DASH_STORAGE_STATE (Paco session) — capture may hit the login screen. See platforms note.');

  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(Number(args.wait || 1200));
    let target = page;
    if (args.selector) {
      const el = await page.$(args.selector);
      if (!el) throw new Error(`selector not found: ${args.selector}`);
      target = el;
    }
    await target.screenshot({ path: outPath, ...(args.full && target === page ? { fullPage: true } : {}) });
    console.log(`[ok] captured ${url} → ${outPath}`);
  } finally {
    await browser.close();
  }
  console.log(outPath); // last line = path, so compose-visual can chain
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
