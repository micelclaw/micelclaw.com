#!/usr/bin/env node
// compose-card.mjs — wrap a (pre-cropped) product screenshot in a branded social card → JPG 1080×1350.
// Sibling of compose-visual.mjs, but: outputs JPEG q90 at the exact preset size, and (optionally) co-locates
// the result into BOTH content-ops/queue/<date>/<name>.jpg AND public/social/<date>/<name>.jpg (IG/TikTok
// need the public URL). Feed it a screenshot already CROPPED/ZOOMED to the exact module the post is about
// (use capture-ui.mjs / ffmpeg crop first) — the card keeps room on top for a short supporting text.
// Usage:
//   node scripts/compose-card.mjs --shot <cropped.png> --kicker "DENY BY DEFAULT" \
//        --title "Your AI only touches what you allow" --subtitle "Every capability is a toggle. Default: off." \
//        --out /home/victor/Projects/_artifacts/screenshots/inbox/scopes-shot.jpg
//   # …then, once approved, co-locate:
//   node scripts/compose-card.mjs --shot <cropped.png> --kicker … --title … --date 2026-07-25 --name scopes-bridge
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, isAbsolute, join, basename, dirname, extname } from 'node:path';
import { CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';
import { getChromium } from './lib/playwright.mjs';

const SOCIAL = { w: 1080, h: 1350 };
// Story: 9:16 completo. `safe` son los márgenes que la interfaz de Instagram TAPA — arriba el
// avatar y la barra de progreso, abajo la caja de responder y el botón de compartir. Ahí no puede
// caer ni una palabra, así que el contenido se compone dentro de la franja central.
const STORY = { w: 1080, h: 1920, safeTop: 250, safeBottom: 250 };
const PRESETS = { social: SOCIAL, instagram: SOCIAL, tiktok: SOCIAL, x: SOCIAL, bluesky: SOCIAL, mastodon: SOCIAL, telegram: SOCIAL, facebook: SOCIAL, square: { w: 1080, h: 1080 }, story: STORY };

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

function buildHtml({ w, h, safeTop = 0, safeBottom = 0, kicker, title, subtitle, bullets = [], url, accent, shotDataUri }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{--accent:${accent};--bg:#050509;--surface:#0e0e16;--text:#f5f5f7;--dim:#9aa0aa;--border:#22232e}
  *{margin:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px}
  body{background:radial-gradient(1200px 700px at 78% -8%, rgba(212,160,23,.16), transparent 60%),
       radial-gradient(900px 600px at 6% 108%, rgba(0,200,255,.10), transparent 60%),var(--bg);
       font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--text);
       padding:${64 + safeTop}px 64px ${64 + safeBottom}px;display:flex;flex-direction:column;gap:34px}
  .head{display:flex;flex-direction:column;gap:16px}
  .kicker{font-size:26px;font-weight:800;letter-spacing:.26em;color:var(--accent);text-transform:uppercase}
  .title{font-size:64px;font-weight:800;line-height:1.06;letter-spacing:-.01em}
  .subtitle{font-size:32px;font-weight:500;color:var(--dim);line-height:1.35}
  .bullets{display:flex;flex-direction:column;gap:18px;margin-top:6px}
  .bullet{display:flex;gap:18px;align-items:flex-start;font-size:31px;line-height:1.3;color:var(--text)}
  .bullet i{flex:none;width:14px;height:14px;margin-top:10px;border-radius:4px;background:var(--accent);font-style:normal}
  .frame{flex:1;min-height:0;background:var(--surface);border:1px solid var(--border);border-radius:20px;
         box-shadow:0 40px 120px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
  .bar{height:44px;flex:none;display:flex;align-items:center;gap:9px;padding:0 18px;background:#14141d;border-bottom:1px solid var(--border)}
  .dot{width:12px;height:12px;border-radius:50%}
  .dot.r{background:#ff5f57}.dot.y{background:#febc2e}.dot.g{background:#28c840}
  .shot{flex:1;min-height:0;background:#0a0a12 center top/cover no-repeat;background-image:url('${shotDataUri}')}
  .foot{display:flex;align-items:center;justify-content:space-between;color:var(--dim);font-size:26px}
  .brand{font-weight:800;color:var(--text)}
  .brand b{color:var(--accent)}
  /* Sin captura hay que rellenar 1920px SOLO con tipografía: escala mayor, aire repartido y una
     regla de acento que ancle la composición. Con la escala de las tarjetas con pantalla, el texto
     ocupaba un tercio y el resto era un agujero negro. */
  body.noshot{justify-content:center;gap:0}
  body.noshot .head{gap:0;flex:1;justify-content:center}
  body.noshot .kicker{font-size:30px;letter-spacing:.3em;margin-bottom:44px}
  body.noshot .title{font-size:104px;line-height:1.0;letter-spacing:-.02em}
  body.noshot .rule{width:120px;height:8px;background:var(--accent);border-radius:4px;margin:48px 0}
  body.noshot .subtitle{font-size:44px;line-height:1.28;color:var(--text)}
  body.noshot .bullets{padding-top:56px;gap:34px}
  body.noshot .bullet{font-size:38px;line-height:1.25;color:var(--dim)}
  body.noshot .bullet i{width:18px;height:18px;margin-top:12px}
  body.noshot .foot{font-size:30px;padding-top:56px}
</style></head><body class="${shotDataUri ? '' : 'noshot'}">
  <div class="head">
    ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
    ${title ? `<div class="title">${esc(title)}</div>` : ''}
    ${!shotDataUri && (subtitle || bullets.length) ? '<div class="rule"></div>' : ''}
    ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
    ${bullets.length ? `<div class="bullets">${bullets.map((b) => `<div class="bullet"><i></i><span>${esc(b)}</span></div>`).join('')}</div>` : ''}
  </div>
  ${shotDataUri ? `<div class="frame">
    <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
    <div class="shot"></div>
  </div>` : ''}
  <div class="foot"><div class="brand">Micel<b>claw</b></div><div>${esc(url || 'micelclaw.com')}</div></div>
</body></html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // `--noshot` = tarjeta solo de texto (portada de cierre). El resto SIEMPRE lleva pantalla real.
  if (!args.shot && !args.noshot) throw new Error('--shot <screenshot.png> is required (o --noshot)');
  const preset = PRESETS[args.preset] || PRESETS.social;
  let shotDataUri = '';
  let shotPath = '';
  if (args.shot) {
    shotPath = isAbsolute(args.shot) ? args.shot : resolve(CONTENT_OPS_ROOT, args.shot);
    const shotB64 = readFileSync(shotPath).toString('base64');
    const ext = extname(shotPath).toLowerCase();
    const shotMime = ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    shotDataUri = `data:${shotMime};base64,${shotB64}`;
  }

  const html = buildHtml({
    w: preset.w, h: preset.h,
    safeTop: preset.safeTop || 0, safeBottom: preset.safeBottom || 0,
    kicker: args.kicker || '', title: args.title || '', subtitle: args.subtitle || '',
    bullets: args.bullets ? String(args.bullets).split('|').map((x) => x.trim()).filter(Boolean) : [],
    url: args.url || 'micelclaw.com', accent: args.bg || '#d4a017', shotDataUri,
  });

  const stagingDir = '/home/victor/Projects/_artifacts/screenshots/inbox';
  const defaultName = `${shotPath ? basename(shotPath).replace(/\.\w+$/, '') : 'card'}-card.jpg`.replace(/[^\w.\-]/g, '_');
  const outArg = args.out || join(stagingDir, defaultName);
  const outPath = isAbsolute(outArg) ? outArg : join(stagingDir, outArg);
  mkdirSync(dirname(outPath), { recursive: true });

  const chromium = getChromium();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: preset.w, height: preset.h }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
    console.log(`[ok] card ${preset.w}x${preset.h} → ${outPath}`);
  } finally {
    await browser.close();
  }

  // Optional co-location into the day's queue + the served public/social folder (same filename → no .md edits).
  if (args.date && args.name) {
    const targets = [
      join(CONTENT_OPS_ROOT, 'queue', args.date, `${args.name}.jpg`),
      join(REPO_ROOT, 'public', 'social', args.date, `${args.name}.jpg`),
    ];
    for (const t of targets) { mkdirSync(dirname(t), { recursive: true }); copyFileSync(outPath, t); console.log(`[co-located] → ${t}`); }
  }
  console.log(outPath);
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
