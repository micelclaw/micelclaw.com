#!/usr/bin/env node
// 60-thumbs.mjs — miniaturas de YouTube en el estilo del canal ("Sticker Punch").
//
// Cierra el pipeline: 10-tts → 20-capture → 30-align → 40-audio-mix → 50-render → 60-thumbs.
// Base: THUMBNAILS.md §"Sticker Punch" + §"Sistema de la serie" (placa ámbar = el módulo a secas,
// gancho en la placa blanca). Render 1280x720 CSS con deviceScaleFactor 2 y downscale lanczos.
//
// Uso:
//   node scripts/60-thumbs.mjs --layout duo --shot desk.png --crop 0,0,1920,1080 \
//        --shot2 phone.png --plate "NOTES" --sub "YOUR AGENT WRITES THEM" --qa --out t.png
//
// Layouts (--layout):
//   hero    una captura casi entera, letrero pequeño abajo — la UI manda (default)
//   duo     escritorio + móvil en perspectiva (usa --shot2 = frame del corte vertical)
//   trio    tres pantallas escalonadas en perspectiva contando un flujo (--shot2, --shot3)
//   split   panel de texto a la izquierda + captura sangrada en perspectiva a la derecha
//   sticker composición original: UI a sangre con zoom fuerte y letrero grande
//
// Flags: --shot/--shot2/--shot3 · --crop/--crop2/--crop3 (x,y,w,h del frame original)
//        --plate · --sub · --tone photo|graph · --blur (px) · --scale (tamaño del letrero, 1=default)
//        --qa (emite <out>-qa120.png: contacto a 120px sobre #0f0f0f y sobre blanco)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChromium } from '../../scripts/lib/playwright.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO_ROOT = resolve(HERE, '..');
const WEB_ROOT = resolve(VIDEO_ROOT, '../..');
const W = 1280, H = 720;

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(`--${n}`); return i === -1 ? null : args[i + 1]; };
const has = (n) => args.includes(`--${n}`);

const plate = get('plate');
if (!get('shot') || !plate) throw new Error('--shot y --plate son obligatorios');
const layout = get('layout') ?? 'hero';
const outArg = get('out') ?? 'thumb.png';
const outPath = isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });

// ── preparación de cada captura: recorte + escalado con ffmpeg ─────────────────────────────
// OJO: el flag es x,y,w,h (orden natural al leer coordenadas de un frame) pero el filtro de
// ffmpeg es crop=w:h:x:y — hay que reordenar o recorta una región equivocada en silencio.
const tmp = [];
function prepShot(shotFlag, cropFlag, outW, outH) {
  const s = get(shotFlag);
  if (!s) return null;
  const p = isAbsolute(s) ? s : resolve(process.cwd(), s);
  if (!existsSync(p)) throw new Error(`no existe el frame: ${p}`);
  const crop = get(cropFlag);
  let vf = `scale=${outW}:${outH}:flags=lanczos`;
  if (crop) {
    const [x, y, w, h] = crop.split(',').map((n) => Number(n.trim()));
    if ([x, y, w, h].some((n) => !Number.isFinite(n))) throw new Error(`--${cropFlag} espera x,y,w,h`);
    vf = `crop=${w}:${h}:${x}:${y},scale=${outW}:${outH}:flags=lanczos`;
  }
  const dst = `${outPath}.${shotFlag}.png`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', p, '-vf', vf, '-frames:v', '1', dst]);
  if (r.status !== 0) throw new Error(`ffmpeg falló preparando ${shotFlag} (${vf})`);
  tmp.push(dst);
  return `data:image/png;base64,${readFileSync(dst).toString('base64')}`;
}

const dataUri = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`;
const fontUri = dataUri(join(VIDEO_ROOT, 'assets/fonts/InterVariable.ttf'), 'font/ttf');
const logoUri = dataUri(join(WEB_ROOT, 'public/logo.svg'), 'image/svg+xml');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Blur bajo por defecto: aquí la captura es la protagonista, no una textura de fondo. Solo el
// layout `sticker` (zoom fuerte) necesita desenfoque para que la UI no compita con el letrero.
const blurPx = get('blur') !== null ? Number(get('blur')) : (layout === 'sticker' ? 2.2 : 0.5);
const tone = `${(get('tone') ?? 'graph') === 'graph'
  ? 'brightness(1.22) saturate(1.4)'
  : 'brightness(.86) saturate(1.15)'} blur(${blurPx}px)`;

// ── letrero: escala reducida (el usuario pidió menos peso tipográfico, 2026-07-25) ─────────
const sub = get('sub');
const scale = Number(get('scale') ?? 1);
const n = plate.length;
const plateSize = Math.round((n <= 8 ? 92 : n <= 12 ? 80 : n <= 17 ? 66 : 56) * scale);
const subSize = Math.round((!sub ? 30 : sub.length <= 24 ? 30 : sub.length <= 32 ? 26 : 23) * scale);
const plateBorder = Math.max(3, Math.round(4 * scale));
const plateShadow = Math.max(5, Math.round(8 * scale));

const LETTERING = `
  .plate{background:#f2b621;color:#0a0a12;font-family:'InterVar';font-weight:1000;
         font-size:${plateSize}px;line-height:.95;letter-spacing:-.02em;text-transform:uppercase;
         padding:${Math.round(12 * scale)}px ${Math.round(24 * scale)}px;
         border:${plateBorder}px solid #08080d;box-shadow:${plateShadow}px ${plateShadow}px 0 #08080d;
         transform:rotate(-3deg)}
  .sub{background:#f5f5f7;color:#0a0a12;font-family:'InterVar';font-weight:900;font-size:${subSize}px;
       line-height:1;letter-spacing:-.01em;text-transform:uppercase;
       padding:${Math.round(9 * scale)}px ${Math.round(16 * scale)}px;
       border:${Math.max(3, plateBorder - 1)}px solid #08080d;
       box-shadow:${plateShadow - 2}px ${plateShadow - 2}px 0 #08080d;transform:rotate(-3deg);
       margin-left:${Math.round(10 * scale)}px}
  .stack{display:flex;flex-direction:column;align-items:flex-start;gap:${Math.round(14 * scale)}px}
  /* Mosca abajo-derecha, por encima de todo y translúcida (decisión del usuario 2026-07-25).
     bottom:52 la mantiene por encima del badge de duración de YouTube, que se pega a la esquina
     (~120x60px) y taparía un logo a ras del borde. La sombra negra es lo que la despega de la
     pantalla del móvil: sin ella se lee como un icono más de la UI. */
  .logo{position:absolute;bottom:52px;right:28px;height:80px;opacity:.62;z-index:20;
        filter:drop-shadow(0 8px 20px rgba(0,0,0,.95)) drop-shadow(0 0 22px rgba(0,200,255,.5))}
  /* Anti-fusión con el feed oscuro de YouTube (regla 4). */
  .rim{position:absolute;inset:0;pointer-events:none;
       box-shadow:inset 0 0 0 2px rgba(245,245,247,.10),inset 0 0 90px rgba(0,0,0,.5)}
  /* Cada "pantalla" lleva borde claro + sombra para despegarse del fondo. */
  .screen{position:absolute;overflow:hidden;border-radius:10px;border:2px solid rgba(245,245,247,.16);
          box-shadow:0 40px 90px rgba(0,0,0,.75),0 0 60px rgba(242,182,33,.10);background:#0a0a12}
  .screen img{width:100%;height:100%;object-fit:cover;filter:${tone}}
  .phone{position:absolute;overflow:hidden;border-radius:26px;border:3px solid rgba(245,245,247,.22);
         box-shadow:0 40px 90px rgba(0,0,0,.8),0 0 50px rgba(0,200,255,.12);background:#0a0a12}
  .phone img{width:100%;height:100%;object-fit:cover;filter:${tone}}`;

const BODY_BG = `background:
  radial-gradient(120% 90% at 78% -10%, rgba(242,182,33,.16), transparent 58%),
  radial-gradient(90% 80% at 8% 108%, rgba(0,200,255,.10), transparent 60%), #08080e`;

const stackHtml = `<div class="plate">${esc(plate)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}`;

function build() {
  if (layout === 'duo') {
    const desk = prepShot('shot', 'crop', 1600, 900);
    const phone = prepShot('shot2', 'crop2', 620, 1102);
    // Geometría: el móvil queda ANCLADO a la derecha (tamaño por --duo-phone = su altura) y el
    // escritorio se estira hasta montar --duo-overlap px por debajo de él. Escalar ambos con un
    // zoom común no servía: el móvil se salía del lienzo y el escritorio se iba por la izquierda.
    const phoneH = Math.round(Number(get('duo-phone') ?? 560));
    const overlap = Number(get('duo-overlap') ?? 90);
    const phoneW = Math.round(phoneH * 300 / 533);
    const phoneRight = 70;
    const phoneLeft = W - phoneRight - phoneW;
    const phoneTop = Math.round((H - phoneH) / 2);
    const deskLeft = -40;
    const deskW = Math.round(phoneLeft + overlap - deskLeft);
    const deskH = Math.round(deskW * 0.5625);
    const deskTop = Math.round((H - deskH) / 2 + 12);
    return `<div class="screen" style="left:${deskLeft}px;top:${deskTop}px;width:${deskW}px;height:${deskH}px;
        z-index:1;transform:perspective(1500px) rotateY(14deg) rotateX(3deg) rotate(-1.5deg)">
        <img src="${desk}"></div>
      ${phone ? `<div class="phone" style="right:${phoneRight}px;top:${phoneTop}px;width:${phoneW}px;height:${phoneH}px;
        z-index:3;transform:perspective(1400px) rotateY(-12deg) rotate(2deg)"><img src="${phone}"></div>` : ''}
      <div class="stack" style="position:absolute;left:44px;bottom:30px;z-index:5">${stackHtml}</div>`;
  }
  if (layout === 'trio') {
    const a = prepShot('shot', 'crop', 1200, 675);
    const b = prepShot('shot2', 'crop2', 1200, 675);
    const c = prepShot('shot3', 'crop3', 1200, 675);
    const pane = (img, left, top, z) => `<div class="screen" style="left:${left}px;top:${top}px;
      width:600px;height:338px;z-index:${z};
      transform:perspective(1600px) rotateY(19deg) rotateX(3deg)"><img src="${img}"></div>`;
    return `${pane(a, -30, 40, 1)}${b ? pane(b, 330, 130, 2) : ''}${c ? pane(c, 690, 220, 3) : ''}
      <div class="stack" style="position:absolute;left:48px;bottom:36px;z-index:9">${stackHtml}</div>`;
  }
  if (layout === 'split') {
    // La captura entera como pantalla flotante a la derecha (no sangrada: sangrarla dejaba un
    // recorte sin contexto) y el texto en la banda izquierda.
    const shot = prepShot('shot', 'crop', 1600, 900);
    return `<div class="screen" style="right:-120px;top:112px;width:900px;height:506px;
        transform:perspective(1700px) rotateY(-16deg) rotateX(3deg) rotate(1deg)"><img src="${shot}"></div>
      <div style="position:absolute;inset:0;width:52%;background:linear-gradient(90deg,
        rgba(8,8,14,.96) 62%, rgba(8,8,14,.6) 86%, transparent)"></div>
      <div class="stack" style="position:absolute;left:52px;top:50%;transform:translateY(-50%)">${stackHtml}</div>`;
  }
  if (layout === 'phone') {
    // Móvil de protagonista con la pantalla de escritorio detrás, desenfocada: vende "esto va
    // contigo" y es el layout más legible a 120px porque el objeto focal es uno solo.
    const back = prepShot('shot', 'crop', 1600, 900);
    const phone = prepShot('shot2', 'crop2', 620, 1102);
    return `<div class="screen" style="left:250px;top:-40px;width:1100px;height:620px;opacity:.5;
        filter:blur(3px);transform:perspective(1600px) rotateY(-12deg) rotate(1deg)"><img src="${back}"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,
        rgba(8,8,14,.92) 30%, rgba(8,8,14,.45) 65%, rgba(8,8,14,.7))"></div>
      ${phone ? `<div class="phone" style="right:150px;top:36px;width:364px;height:648px;
        transform:perspective(1500px) rotateY(-11deg) rotate(2.5deg)"><img src="${phone}"></div>` : ''}
      <div class="stack" style="position:absolute;left:56px;bottom:56px">${stackHtml}</div>`;
  }
  if (layout === 'sticker') {
    const shot = prepShot('shot', 'crop', 1600, 900);
    return `<div style="position:absolute;inset:-46px;overflow:hidden;transform:rotate(-2deg)">
        <img src="${shot}" style="width:100%;height:100%;object-fit:cover;filter:${tone}"></div>
      <div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 30% 60%,
        rgba(5,5,9,.42), rgba(5,5,9,.14) 55%, rgba(5,5,9,.38))"></div>
      <div class="stack" style="position:absolute;left:60px;bottom:96px">${stackHtml}</div>`;
  }
  // hero: la captura casi entera, apenas inclinada, con el letrero abajo a la izquierda.
  const shot = prepShot('shot', 'crop', 1700, 956);
  return `<div class="screen" style="left:34px;top:26px;width:1212px;height:668px;
      transform:perspective(2600px) rotateX(2.5deg) rotate(-.8deg)"><img src="${shot}"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:46%;
      background:linear-gradient(0deg, rgba(6,6,11,.94) 12%, rgba(6,6,11,.55) 55%, transparent)"></div>
    <div class="stack" style="position:absolute;left:52px;bottom:44px">${stackHtml}</div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'InterVar';src:url('${fontUri}') format('truetype');font-weight:100 1000}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{${BODY_BG}}
  ${LETTERING}
</style></head><body>
  ${build()}
  <div class="rim"></div>
  <img class="logo" src="${logoUri}">
</body></html>`;

// ── portada vertical 1080x1920 para TikTok / Reels ────────────────────────────────────────
// No es un recorte del 16:9 (perdería el letrero o una de las pantallas): es una recomposición
// con los MISMOS elementos. Zonas seguras de las apps: la UI cubre ~15% arriba y ~28% abajo, y
// la cuadrícula del perfil recorta a ~3:4 desde arriba → todo lo legible vive en la franja central.
const CW = 1080, CH = 1920;

/** ¿El fotograma base ya es vertical? Entonces es un CORTO, no un episodio 16:9. */
function shotIsPortrait() {
  const s = get('shot');
  if (!s) return false;
  const p = isAbsolute(s) ? s : resolve(process.cwd(), s);
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p], { encoding: 'utf8' });
  const [w, h] = (r.stdout || '').trim().split(',').map(Number);
  return Number.isFinite(w) && Number.isFinite(h) && h > w;
}

function buildCover() {
  // Un CORTO nace vertical: su fotograma va a SANGRE, no metido en la perspectiva de "escritorio
  // + móvil" (que asume una captura 16:9 y, con una vertical, la estira y le come los bordes —
  // visto el 2026-07-27). El letrero se queda donde estaba: en la franja legible de la cuadrícula.
  if (shotIsPortrait()) {
    const full = prepShot('shot', 'crop', CW, CH);
    return `<div style="position:absolute;inset:0;z-index:1"><img src="${full}"
        style="width:100%;height:100%;object-fit:cover"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:46%;z-index:4;
        background:linear-gradient(0deg, rgba(6,6,11,.98) 26%, rgba(6,6,11,.72) 60%, transparent)"></div>
      <div class="stack" style="position:absolute;left:64px;bottom:440px;z-index:6">${stackHtml}</div>`;
  }

  const desk = prepShot('shot', 'crop', 1600, 900);
  const phone = prepShot('shot2', 'crop2', 620, 1102);
  return `<div class="screen" style="left:-130px;top:180px;width:1080px;height:608px;z-index:1;
      transform:perspective(1600px) rotateY(13deg) rotateX(4deg) rotate(-2deg)"><img src="${desk}"></div>
    ${phone ? `<div class="phone" style="right:60px;top:352px;width:512px;height:910px;z-index:3;
      border-radius:40px;transform:perspective(1700px) rotateY(-11deg) rotate(2deg)">
      <img src="${phone}"></div>` : ''}
    <div style="position:absolute;left:0;right:0;bottom:0;height:42%;z-index:4;
      background:linear-gradient(0deg, rgba(6,6,11,.97) 30%, rgba(6,6,11,.6) 68%, transparent)"></div>
    <div class="stack" style="position:absolute;left:64px;bottom:440px;z-index:6">${stackHtml}</div>`;
}
const coverHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'InterVar';src:url('${fontUri}') format('truetype');font-weight:100 1000}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${CW}px;height:${CH}px;overflow:hidden}
  body{${BODY_BG}}
  ${LETTERING}
  /* El letrero manda más en vertical: se ve a un tamaño mucho menor en la cuadrícula del perfil. */
  .plate{font-size:${Math.round(plateSize * 1.5)}px;padding:20px 36px;border-width:6px;
         box-shadow:12px 12px 0 #08080d}
  .sub{font-size:${Math.round(subSize * 1.45)}px;padding:14px 24px;border-width:5px;
       box-shadow:9px 9px 0 #08080d}
  .stack{gap:22px}
  /* La mosca sube: los ~300px inferiores los ocupan la caption y los botones de TikTok/Reels. */
  .logo{bottom:290px;right:56px;height:104px}
</style></head><body>
  ${buildCover()}
  <div class="rim"></div>
  <img class="logo" src="${logoUri}">
</body></html>`;

const chromium = getChromium();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const raw = `${outPath}.2x.png`;
  await page.screenshot({ path: raw });
  const dn = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw,
    '-vf', `scale=${W}:${H}:flags=lanczos`, '-frames:v', '1', outPath]);
  if (dn.status !== 0) throw new Error('ffmpeg falló en el downscale');
  rmSync(raw, { force: true });

  if (has('qa')) {
    // La puerta de los 120px (regla 8): mismo contacto sobre el dark mode de YouTube y sobre blanco.
    const qa = outPath.replace(/\.png$/, '-qa120.png');
    const q = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outPath, '-filter_complex',
      'scale=120:-1:flags=lanczos,split=2[a][b];'
      + '[a]pad=170:110:25:21:0x0f0f0f[d];[b]pad=170:110:25:21:white[e];[d][e]hstack',
      '-frames:v', '1', qa]);
    if (q.status === 0) console.log(`  qa120 → ${qa}`);
  }

  // Portada vertical: se emite SIEMPRE junto a la horizontal (salvo --no-cover). Regla del
  // usuario 2026-07-25: cada episodio necesita las dos, y generarlas por separado se olvida.
  if (!has('no-cover')) {
    const coverPath = outPath.replace(/\.png$/, '-cover.png');
    const cp = await browser.newPage({ viewport: { width: CW, height: CH }, deviceScaleFactor: 2 });
    await cp.setContent(coverHtml, { waitUntil: 'networkidle' });
    await cp.evaluate(() => document.fonts.ready);
    const craw = `${coverPath}.2x.png`;
    await cp.screenshot({ path: craw });
    const cdn = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', craw,
      '-vf', `scale=${CW}:${CH}:flags=lanczos`, '-frames:v', '1', coverPath]);
    rmSync(craw, { force: true });
    if (cdn.status !== 0) throw new Error('ffmpeg falló en el downscale de la portada');
    const csz = spawnSync('identify', ['-format', '%wx%h %b', coverPath], { encoding: 'utf8' });
    console.log(`  cover 9:16 → ${coverPath} ${csz.stdout.trim()}`);
  }
} finally {
  await browser.close();
  for (const f of tmp) rmSync(f, { force: true });
}

const sz = spawnSync('identify', ['-format', '%wx%h %b', outPath], { encoding: 'utf8' });
console.log(`[ok] ${layout} → ${outPath} ${sz.stdout.trim()}`);
