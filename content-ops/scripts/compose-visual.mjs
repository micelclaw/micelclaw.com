#!/usr/bin/env node
// compose-visual.mjs — wrap a screenshot in a branded composition → a "pretty" PNG that explains the post.
// Usage:
//   node scripts/compose-visual.mjs --shot _artifacts/.../drive.png --preset instagram \
//        --kicker "MICELCLAW" --title "Your files, one index" --subtitle "Move a file, the real file moves." \
//        --out drive-instagram.png
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, isAbsolute, join, basename, dirname, extname } from 'node:path';
import { CONTENT_OPS_ROOT } from './lib/env.mjs';
import { getChromium } from './lib/playwright.mjs';

// One vertical 1080×1350 card for EVERY social network (verified 2026-07-22: reads bigger/cleaner than
// landscape on Mastodon/Bluesky/Telegram/Facebook; IG/TikTok are native portrait). blog/docs stay landscape
// — those are inline/hero images, a different family, not the branded social card.
const SOCIAL = { w: 1080, h: 1350 };
const PRESETS = {
  social: SOCIAL, instagram: SOCIAL, tiktok: SOCIAL,
  x: SOCIAL, bluesky: SOCIAL, mastodon: SOCIAL, telegram: SOCIAL, facebook: SOCIAL,
  square: { w: 1080, h: 1080 }, blog: { w: 1600, h: 900 }, docs: { w: 1440, h: 810 },
  youtube: { w: 1280, h: 720 }, wide: { w: 1920, h: 1080 },
};

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2), next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildHtml({ w, h, kicker, title, subtitle, url, accent, shotDataUri, vertical }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{--accent:${accent};--bg:#050509;--surface:#0e0e16;--text:#f5f5f7;--dim:#9aa0aa;--border:#22232e}
  *{margin:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px}
  body{background:radial-gradient(1200px 700px at 78% -8%, rgba(212,160,23,.16), transparent 60%),var(--bg);
       font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--text);
       padding:${vertical ? 64 : 56}px;display:flex;flex-direction:column;gap:${vertical ? 40 : 28}px}
  .head{display:flex;flex-direction:column;gap:14px}
  .kicker{font-size:${vertical ? 26 : 22}px;font-weight:800;letter-spacing:.28em;color:var(--accent);text-transform:uppercase}
  .title{font-size:${vertical ? 76 : 56}px;font-weight:800;line-height:1.05;letter-spacing:-.01em;max-width:${vertical ? '100%' : '88%'}}
  .subtitle{font-size:${vertical ? 34 : 26}px;font-weight:500;color:var(--dim);line-height:1.35;max-width:${vertical ? '100%' : '80%'}}
  .frame{flex:1;min-height:0;background:var(--surface);border:1px solid var(--border);border-radius:20px;
         box-shadow:0 40px 120px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
  .bar{height:44px;flex:none;display:flex;align-items:center;gap:9px;padding:0 18px;background:#14141d;border-bottom:1px solid var(--border)}
  .dot{width:12px;height:12px;border-radius:50%}
  .dot.r{background:#ff5f57}.dot.y{background:#febc2e}.dot.g{background:#28c840}
  .shot{flex:1;min-height:0;background:#0a0a12 center top/cover no-repeat;background-image:url('${shotDataUri}')}
  .foot{display:flex;align-items:center;justify-content:space-between;color:var(--dim);font-size:${vertical ? 26 : 22}px}
  .brand{font-weight:800;color:var(--text)}
  .brand b{color:var(--accent)}
</style></head><body>
  <div class="head">
    ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
    ${title ? `<div class="title">${esc(title)}</div>` : ''}
    ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
  </div>
  <div class="frame">
    <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
    <div class="shot"></div>
  </div>
  <div class="foot"><div class="brand">Micel<b>claw</b></div><div>${esc(url || 'micelclaw.com')}</div></div>
</body></html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.shot) throw new Error('--shot <screenshot.png> is required');
  const preset = PRESETS[args.preset] || PRESETS.social;
  const shotPath = isAbsolute(args.shot) ? args.shot : resolve(CONTENT_OPS_ROOT, args.shot);
  const shotB64 = readFileSync(shotPath).toString('base64');
  const ext = extname(shotPath).toLowerCase();
  const shotMime = ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const shotDataUri = `data:${shotMime};base64,${shotB64}`;

  const html = buildHtml({
    w: preset.w, h: preset.h, vertical: preset.h > preset.w,
    kicker: args.kicker || '', title: args.title || '', subtitle: args.subtitle || '',
    url: args.url || 'micelclaw.com', accent: args.bg || '#d4a017', shotDataUri,
  });

  const assetsDir = join(CONTENT_OPS_ROOT, 'assets');
  // Sanitize only the auto-generated default; respect an explicit --out (may be an absolute path).
  const defaultName = `${basename(shotPath).replace(/\.\w+$/, '')}-${args.preset || 'social'}.png`.replace(/[^\w.\-]/g, '_');
  const outArg = args.out || defaultName;
  const outPath = isAbsolute(outArg) ? outArg : join(assetsDir, outArg);
  mkdirSync(dirname(outPath), { recursive: true });

  const chromium = getChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    // deviceScaleFactor 1: output matches the preset dimensions exactly (IG caps width at 1440; TikTok ≤1080p).
    const page = await browser.newPage({ viewport: { width: preset.w, height: preset.h }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outPath });
    console.log(`[ok] composed ${args.preset || 'social'} (${preset.w}x${preset.h}) → ${outPath}`);
  } finally {
    await browser.close();
  }
  console.log(outPath);
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
