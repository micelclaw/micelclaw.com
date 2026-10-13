// 20-capture.mjs — Metraje Playwright por escena (Chromium directo, sesión Paco).
//
// MODO MÓVIL (storyboard vertical): el screencast de Chromium solo entrega
// píxeles LÓGICOS (393px = borroso al ampliar), así que el metraje 9:16 se
// graba con Chromium HEADED bajo Xvfb a --force-device-scale-factor=2.748
// (ventana física 1080x1920 mostrando el shell móvil real de 393px, nítido)
// y ffmpeg x11grab captura el framebuffer.
//
// Graba cada escena horizontal directamente desde un framebuffer Xvfb 4K,
// H.264 4:4:4 casi sin pérdida. Evita `recordVideo` de Playwright: su VP8
// interno cae por debajo de 1 Mb/s a 4K y destruye texto y gradientes antes
// de cualquier transcode posterior. El móvil usa el mismo principio a 1080x1920.
// Emite footage/<scene>.actions.json con cada timestamp (ancla SFX).
//
// Uso:
//   node scripts/20-capture.mjs --project <slug> [--scene s03]
//   node scripts/20-capture.mjs --smoke          # valida 4K+cursor+transcode
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO_ROOT = resolve(HERE, '..');
const CONTENT_OPS = resolve(VIDEO_ROOT, '..');
const STAGING = '/home/victor/Projects/_artifacts/video';

// ── env + playwright (reutiliza los helpers de content-ops) ────────────────
const { env } = await import(join(CONTENT_OPS, 'scripts/lib/env.mjs'));
const { getChromium } = await import(join(CONTENT_OPS, 'scripts/lib/playwright.mjs'));

const BASE_URL = env('DASH_BASE_URL') || 'http://localhost:7100';
const STORAGE_STATE = env('DASH_STORAGE_STATE');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
};

const FPS = 30;
// GOTCHA (verificado): el screencast de Chromium graba en píxeles CSS — un
// viewport 1920x1080 con dsf2 acaba en el cuarto superior-izquierdo del lienzo
// 4K. Fix: viewport 4K real + zoom 2x en <body> → la UI se ve como una
// pantalla 1080p pero rasterizada a 3840x2160 de verdad.
// Perfil de captura (se fija en main() según la orientación del storyboard):
// - horizontal: viewport 4K + zoom 2 (UI como pantalla 1080p, rasterizada a 4K)
// - vertical/MÓVIL: viewport 1080x1920 + zoom 2.75 (UI como teléfono de ~393px
//   de ancho — el dash activa su shell móvil real: bottom-nav, layouts responsive)
let ZOOM = 2;
let VIEWPORT = { width: 3840, height: 2160 };
let RECORD_SIZE = { width: 3840, height: 2160 };
let TOUCH = false;
// Regla del usuario (2026-07-22): los Insights del chat salen SIEMPRE
// colapsados en cámara, salvo que el storyboard lo pida (ui.insightsCollapsed:
// false). Se inyecta ANTES de cargar la página (ChatPage lee la clave en el
// primer render) → ni un clic en cámara.
let INSIGHTS_COLLAPSED = true;

function buildUiPrefsScript() {
  return `try { localStorage.setItem('claw-insights-collapsed', '${INSIGHTS_COLLAPSED}'); } catch {}`;
}

// ── cursor overlay (inyectado en cada página) ──────────────────────────────
function buildCursorScript({ touch = TOUCH, zoom = ZOOM } = {}) {
  const pointer = touch
    // móvil: "dedo" — disco translúcido que pulsa al tocar
    ? `const c = document.createElement('div');
    c.id = 'claw-cursor';
    c.style.cssText = 'position:fixed;left:-200px;top:-200px;width:56px;height:56px;margin-left:-28px;margin-top:-28px;border-radius:50%;background:rgba(245,245,247,.28);border:2.5px solid rgba(245,245,247,.55);pointer-events:none;z-index:2147483647;transition:none;box-shadow:0 2px 10px rgba(0,0,0,.35);';`
    : `const c = document.createElement('div');
    c.id = 'claw-cursor';
    c.style.cssText = 'position:fixed;left:-200px;top:-200px;width:52px;height:52px;pointer-events:none;z-index:2147483647;transition:none;';
    c.innerHTML = '<svg width="52" height="52" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,.6))"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="#f5f5f7" stroke="#1a1a24" stroke-width="1.4"/></svg>';`;
  const move = touch
    ? `c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
      halo.style.left = (e.clientX - 44) + 'px'; halo.style.top = (e.clientY - 44) + 'px';`
    : `c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
      halo.style.left = (e.clientX - 44 + 8) + 'px'; halo.style.top = (e.clientY - 44 + 8) + 'px';`;
  return `
(() => {
  if (window.__clawCursorInstalled) return;
  window.__clawCursorInstalled = true;
  const mk = () => {
    if (document.getElementById('claw-cursor')) return;
    // zoom en <body>: la UI se rasteriza a la resolución del lienzo; el cursor
    // vive en <html> (fuera del zoom) → tamaños absolutos.
    if (!${touch} && document.body) document.body.style.zoom = '${zoom}';
    // sin toasts en el metraje (p.ej. "Nuevo inicio de sesión" al abrir contexto)
    const st = document.createElement('style');
    st.textContent = '[data-sonner-toaster]{display:none !important}';
    document.documentElement.appendChild(st);
    ${pointer}
    const halo = document.createElement('div');
    halo.id = 'claw-cursor-halo';
    halo.style.cssText = 'position:fixed;left:-200px;top:-200px;width:88px;height:88px;border-radius:50%;pointer-events:none;z-index:2147483646;border:5px solid rgba(212,160,23,.85);opacity:0;transform:scale(.4);';
    document.documentElement.appendChild(halo);
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', (e) => {
      ${move}
    }, { capture: true, passive: true });
    document.addEventListener('mousedown', () => {
      halo.animate([
        { opacity: 0.9, transform: 'scale(0.35)' },
        { opacity: 0, transform: 'scale(1.25)' },
      ], { duration: 380, easing: 'cubic-bezier(.2,.6,.3,1)' });
    }, { capture: true, passive: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk);
  else mk();
})();
`;
}

// ── movimiento humano del ratón ────────────────────────────────────────────
const cursorPos = { x: 200, y: 200 };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function humanMove(page, x, y, ms = 700) {
  const steps = Math.max(12, Math.round(ms / 28));
  const { x: x0, y: y0 } = cursorPos;
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    // ligera curva (control point desplazado) para que no sea una recta perfecta
    const mx = (x0 + x) / 2 + (y - y0) * 0.06;
    const my = (y0 + y) / 2 - (x - x0) * 0.06;
    const u = i / steps;
    const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x;
    const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y;
    await page.mouse.move(bx, by);
    await page.waitForTimeout(Math.max(8, ms / steps));
    void u;
  }
  cursorPos.x = x; cursorPos.y = y;
}

async function centerOf(page, selector) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`sin boundingBox: ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// ── ejecutor de acciones ───────────────────────────────────────────────────
async function runActions(page, actions, record) {
  for (const a of actions) {
    const t = record.now();
    switch (a.op) {
      case 'goto':
        await page.goto(BASE_URL + a.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(a.settleMs ?? 1200);
        break;
      case 'waitFor':
        await page.locator(a.selector).first().waitFor({ state: 'visible', timeout: a.timeout ?? 20000 });
        break;
      case 'scrollIntoView':
        await page.locator(a.selector).first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(a.settleMs ?? 500);
        break;
      case 'moveTo': {
        const p = a.selector ? await centerOf(page, a.selector) : { x: a.x, y: a.y };
        await humanMove(page, p.x + (a.dx ?? 0), p.y + (a.dy ?? 0), a.ms ?? 700);
        break;
      }
      case 'hover': {
        const p = await centerOf(page, a.selector);
        await humanMove(page, p.x, p.y, a.ms ?? 600);
        break;
      }
      case 'click': {
        const p = a.selector ? await centerOf(page, a.selector) : { x: cursorPos.x, y: cursorPos.y };
        if (a.selector) await humanMove(page, p.x + (a.dx ?? 0), p.y + (a.dy ?? 0), a.ms ?? 650);
        // `fast: true` = down+up sin retención. Necesario en triggers de Radix Select: con la
        // retención de 70ms el up cae sobre el listbox ya abierto y Radix lo trata como
        // press-drag-release → selecciona y CIERRA (el siguiente click al option no encuentra nada).
        await page.mouse.down(); if (!a.fast) await page.waitForTimeout(70); await page.mouse.up();
        await page.waitForTimeout(a.settleMs ?? 500);
        break;
      }
      case 'type': {
        if (a.selector) {
          const p = await centerOf(page, a.selector);
          await humanMove(page, p.x, p.y, 500);
          await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
          await page.waitForTimeout(200);
        }
        await page.keyboard.type(a.text, { delay: a.delay ?? 65 });
        break;
      }
      case 'press':
        await page.keyboard.press(a.key);
        await page.waitForTimeout(a.settleMs ?? 400);
        break;
      case 'dblclick': {
        const p = a.selector ? await centerOf(page, a.selector) : { x: cursorPos.x, y: cursorPos.y };
        if (a.selector) await humanMove(page, p.x + (a.dx ?? 0), p.y + (a.dy ?? 0), a.ms ?? 650);
        await page.mouse.dblclick(p.x + (a.dx ?? 0), p.y + (a.dy ?? 0));
        await page.waitForTimeout(a.settleMs ?? 800);
        break;
      }
      case 'drag': {
        // Arrastre suave desde la posición actual hasta una coordenada o el centro
        // de otro elemento. La pulsación y el pequeño movimiento inicial activan
        // sensores dnd-kit sin teletransportar el DragOverlay.
        const target = a.toSelector
          ? await centerOf(page, a.toSelector)
          : { x: a.x, y: a.y };
        await page.mouse.down();
        await page.waitForTimeout(a.pressMs ?? 120);
        const activationPx = a.activationPx ?? 0;
        if (activationPx > 0) {
          const dx = target.x - cursorPos.x;
          const dy = target.y - cursorPos.y;
          const distance = Math.hypot(dx, dy) || 1;
          await humanMove(
            page,
            cursorPos.x + (dx / distance) * activationPx,
            cursorPos.y + (dy / distance) * activationPx,
            a.activationMs ?? 180,
          );
        }
        await humanMove(page, target.x + (a.dx ?? 0), target.y + (a.dy ?? 0), a.ms ?? 1200);
        await page.waitForTimeout(a.hoverMs ?? 0);
        await page.mouse.up();
        await page.waitForTimeout(a.settleMs ?? 300);
        break;
      }
      case 'scroll': {
        const total = a.dy ?? 400;
        const steps = Math.max(8, Math.round(Math.abs(total) / 60));
        for (let i = 0; i < steps; i++) {
          await page.mouse.wheel(0, total / steps);
          await page.waitForTimeout(30);
        }
        break;
      }
      case 'pause':
        await page.waitForTimeout(a.ms);
        break;
      case 'eval':
        await page.evaluate(a.js);
        break;
      default:
        throw new Error(`acción desconocida: ${a.op}`);
    }
    record.push({ op: a.op, target: a.selector ?? a.toSelector ?? a.path ?? a.key ?? null, sfx: a.sfx ?? null, tMs: t });
  }
}

// ── transcode webm → mp4 CFR ───────────────────────────────────────────────
function transcode(rawWebm, outMp4) {
  let r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawWebm,
    '-r', String(FPS), '-fps_mode', 'cfr', '-c:v', 'h264_nvenc', '-cq', '16', '-pix_fmt', 'yuv420p', outMp4]);
  if (r.status !== 0) {
    r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawWebm,
      '-r', String(FPS), '-fps_mode', 'cfr', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-pix_fmt', 'yuv420p', outMp4]);
  }
  if (r.status !== 0) throw new Error(`ffmpeg transcode falló: ${rawWebm}`);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,avg_frame_rate', '-of', 'csv=p=0', outMp4], { encoding: 'utf8' });
  return probe.stdout.trim();
}

// ── captura MÓVIL (Xvfb + x11grab, ver cabecera) ───────────────────────────
const XVFB_DISPLAY = ':97';
let xvfbProc = null;

function ensureXvfb(width, height) {
  if (xvfbProc) return;
  xvfbProc = spawn('Xvfb', [XVFB_DISPLAY, '-screen', '0', `${width}x${height}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' });
  // pequeño margen para que el display exista
  spawnSync('sleep', ['0.8']);
}

async function captureSceneMobile(chromium, scene, targetSec, outDir) {
  ensureXvfb(1080, 1920);
  const rawDir = join(outDir, 'raw');
  mkdirSync(rawDir, { recursive: true });
  // modo --app: ventana SIN chrome de Chromium (bajo Xvfb tampoco hay WM) →
  // el framebuffer 1080x1920 es 100% página. storageState no aplica en
  // contexto persistente → se inyecta claw-auth a mano desde el fichero.
  const profileDir = join(rawDir, '.chrome-profile');
  spawnSync('rm', ['-rf', profileDir]);
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    env: { ...process.env, DISPLAY: XVFB_DISPLAY },
    viewport: null, // la ventana manda (393 CSS → 1080 físicos)
    colorScheme: 'dark',
    args: ['--force-device-scale-factor=2.748', '--window-position=0,0', '--window-size=393,698',
      '--hide-scrollbars', '--disable-infobars', '--no-first-run', `--app=${BASE_URL}/login`],
  });
  await context.addInitScript(buildCursorScript());
  await context.addInitScript(buildUiPrefsScript());
  if (STORAGE_STATE && existsSync(STORAGE_STATE)) {
    const st = JSON.parse(readFileSync(STORAGE_STATE, 'utf8'));
    const item = st.origins?.[0]?.localStorage?.find((i) => i.name === 'claw-auth');
    if (item) {
      await context.addInitScript((value) => {
        try { localStorage.setItem('claw-auth', value); sessionStorage.removeItem('claw-explicit-logout'); } catch {}
      }, item.value);
    }
  }
  const page = context.pages()[0] ?? await context.newPage();

  const rawMkv = join(rawDir, `${scene.id}.x11-hq.mkv`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0',
    '-framerate', String(FPS), '-video_size', '1080x1920', '-i', XVFB_DISPLAY,
    '-r', String(FPS), '-fps_mode', 'cfr',
    '-c:v', 'h264_nvenc', '-preset', 'p7', '-tune', 'hq', '-rc', 'constqp', '-qp', '4',
    '-profile:v', 'high444p', '-pix_fmt', 'yuv444p', rawMkv], { stdio: 'ignore' });

  const t0 = Date.now();
  const rec = { entries: [], now: () => Date.now() - t0, push(e) { this.entries.push(e); } };
  try {
    await runActions(page, scene.capture.actions, rec);
    const targetMs = (targetSec + 0.8) * 1000;
    const elapsed = Date.now() - t0;
    if (elapsed < targetMs) await page.waitForTimeout(targetMs - elapsed);
  } finally {
    ff.kill('SIGINT');
    await new Promise((res) => { ff.on('close', res); setTimeout(res, 3000); });
    await context.close();
    const outMp4 = join(outDir, `${scene.id}.mp4`);
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawMkv,
      '-c:v', 'copy', '-movflags', '+faststart', outMp4]);
    if (r.status !== 0) throw new Error(`remux móvil HQ falló: ${rawMkv}`);
    writeFileSync(join(outDir, `${scene.id}.actions.json`), JSON.stringify({
      sceneId: scene.id, t0Epoch: t0, entries: rec.entries,
    }, null, 2));
    const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,avg_frame_rate,pix_fmt,bit_rate', '-of', 'csv=p=0', outMp4], { encoding: 'utf8' });
    console.log(`  ✓ ${scene.id} [móvil]: ${probe.stdout.trim()} → ${outMp4} (${rec.entries.length} acciones)`);
  }
}

// ── captura DESKTOP HQ (Xvfb + x11grab, sin VP8 intermedio) ───────────────
async function captureSceneDesktopHq(chromium, scene, targetSec, outDir) {
  ensureXvfb(3840, 2160);
  const [captureWidth, captureHeight] = scene.capture.desktopSize ?? [3840, 2160];
  const uiZoom = scene.capture.uiZoom ?? ZOOM;
  const rawDir = join(outDir, 'raw');
  mkdirSync(rawDir, { recursive: true });
  const profileDir = join(rawDir, '.chrome-profile-desktop');
  spawnSync('rm', ['-rf', profileDir]);
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    env: { ...process.env, DISPLAY: XVFB_DISPLAY },
    viewport: null,
    colorScheme: 'dark',
    args: ['--force-device-scale-factor=1', '--window-position=0,0', `--window-size=${captureWidth},${captureHeight}`,
      '--hide-scrollbars', '--disable-infobars', '--no-first-run', `--app=${BASE_URL}/login`],
  });
  await context.addInitScript(buildCursorScript({ touch: false, zoom: uiZoom }));
  await context.addInitScript(buildUiPrefsScript());
  if (STORAGE_STATE && existsSync(STORAGE_STATE)) {
    const st = JSON.parse(readFileSync(STORAGE_STATE, 'utf8'));
    const item = st.origins?.[0]?.localStorage?.find((i) => i.name === 'claw-auth');
    if (item) {
      await context.addInitScript((value) => {
        try { localStorage.setItem('claw-auth', value); sessionStorage.removeItem('claw-explicit-logout'); } catch {}
      }, item.value);
    }
  }
  const page = context.pages()[0] ?? await context.newPage();

  // QP 4 + 4:4:4 conserva bordes de texto y gradientes. Se graba a MKV para
  // que una interrupción no corrompa el archivo; después solo se remuxe a MP4.
  const rawMkv = join(rawDir, `${scene.id}.x11-hq.mkv`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0',
    '-framerate', String(FPS), '-video_size', `${captureWidth}x${captureHeight}`, '-i', XVFB_DISPLAY,
    '-r', String(FPS), '-fps_mode', 'cfr',
    '-c:v', 'h264_nvenc', '-preset', 'p7', '-tune', 'hq', '-rc', 'constqp', '-qp', '4',
    '-profile:v', 'high444p', '-pix_fmt', 'yuv444p', rawMkv], { stdio: 'ignore' });

  const t0 = Date.now();
  const rec = { entries: [], now: () => Date.now() - t0, push(e) { this.entries.push(e); } };
  try {
    await page.waitForTimeout(800);
    if (ff.exitCode !== null) throw new Error(`ffmpeg HQ terminó antes de capturar (exit ${ff.exitCode})`);
    await runActions(page, scene.capture.actions, rec);
    const targetMs = (targetSec + 0.8) * 1000;
    const elapsed = Date.now() - t0;
    if (elapsed < targetMs) await page.waitForTimeout(targetMs - elapsed);
  } finally {
    ff.kill('SIGINT');
    await new Promise((res) => { ff.on('close', res); setTimeout(res, 5000); });
    await context.close();
    const outMp4 = join(outDir, `${scene.id}.mp4`);
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawMkv,
      '-c:v', 'copy', '-movflags', '+faststart', outMp4]);
    if (r.status !== 0) throw new Error(`remux desktop HQ falló: ${rawMkv}`);
    writeFileSync(join(outDir, `${scene.id}.actions.json`), JSON.stringify({
      sceneId: scene.id, t0Epoch: t0, entries: rec.entries,
    }, null, 2));
    const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,avg_frame_rate,pix_fmt,bit_rate', '-of', 'csv=p=0', outMp4], { encoding: 'utf8' });
    console.log(`  ✓ ${scene.id} [desktop HQ]: ${probe.stdout.trim()} → ${outMp4} (${rec.entries.length} acciones)`);
  }
}

// ── captura de una escena ──────────────────────────────────────────────────
async function captureScene(browser, scene, targetSec, outDir) {
  const rawDir = join(outDir, 'raw');
  mkdirSync(rawDir, { recursive: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: STORAGE_STATE && existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined,
    recordVideo: { dir: rawDir, size: RECORD_SIZE },
    colorScheme: 'dark',
  });
  await context.addInitScript(buildCursorScript());
  await context.addInitScript(buildUiPrefsScript());
  const page = await context.newPage();

  const t0 = Date.now();
  const rec = { entries: [], now: () => Date.now() - t0, push(e) { this.entries.push(e); } };

  const cap = scene.capture;
  try {
    await runActions(page, cap.actions, rec);
    // sostener hasta cubrir la ventana de la voz (+0.8s de margen)
    const targetMs = (targetSec + 0.8) * 1000;
    const elapsed = Date.now() - t0;
    if (elapsed < targetMs) await page.waitForTimeout(targetMs - elapsed);
  } finally {
    const video = page.video();
    await context.close();
    const rawPath = await video.path();
    const rawFinal = join(rawDir, `${scene.id}.webm`);
    renameSync(rawPath, rawFinal);
    const outMp4 = join(outDir, `${scene.id}.mp4`);
    const probe = transcode(rawFinal, outMp4);
    writeFileSync(join(outDir, `${scene.id}.actions.json`), JSON.stringify({
      sceneId: scene.id, t0Epoch: t0, entries: rec.entries,
    }, null, 2));
    console.log(`  ✓ ${scene.id}: ${probe} → ${outMp4} (${rec.entries.length} acciones)`);
  }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const chromium = getChromium();

  try {
    if (flag('smoke')) {
      const outDir = join(STAGING, '_smoke', 'footage');
      mkdirSync(outDir, { recursive: true });
      const scene = {
        id: 'smoke',
        capture: {
          actions: [
            { op: 'goto', path: '/', settleMs: 2500 },
            { op: 'moveTo', x: 1920, y: 800, ms: 900 },
            { op: 'moveTo', x: 600, y: 1200, ms: 900 },
            { op: 'click', x: 600, y: 1200, sfx: 'click' },
            { op: 'pause', ms: 1200 },
          ],
        },
      };
      await captureSceneDesktopHq(chromium, scene, 6, outDir);
      return;
    }

    const project = flag('project');
    if (!project) throw new Error('--project <slug> o --smoke');
    const sb = JSON.parse(readFileSync(join(VIDEO_ROOT, 'projects', project, 'storyboard.json'), 'utf8'));
    INSIGHTS_COLLAPSED = sb.ui?.insightsCollapsed !== false;
    // storyboard vertical → captura MÓVIL nativa (shell móvil real del dash)
    if (Array.isArray(sb.size) && sb.size[1] > sb.size[0]) {
      VIEWPORT = { width: 1080, height: 1920 };
      RECORD_SIZE = { width: 1080, height: 1920 };
      ZOOM = 1080 / 393; // la UI se ve como un teléfono de 393px de ancho
      TOUCH = true;
      cursorPos.x = 196; cursorPos.y = 350; // espacio CSS móvil (393x698)
      console.log('· perfil MÓVIL: viewport 1080x1920, zoom 2.75, cursor táctil');
    }
    const vt = JSON.parse(readFileSync(join(STAGING, project, 'voiceover', 'vo-timeline.json'), 'utf8'));
    const durations = Object.fromEntries(vt.lines.map((l) => [l.sceneId, l.durSec + l.padSec]));
    const only = flag('scene');

    const outDir = join(STAGING, project, 'footage');
    mkdirSync(outDir, { recursive: true });
    for (const scene of sb.scenes) {
      if (!scene.capture) continue;
      if (only && scene.id !== only) continue;
      const target = Math.max(durations[scene.id] ?? 4, scene.minSec ?? 0, scene.capture.holdSec ?? 0);
      console.log(`— capturando ${scene.id} (ventana ${target.toFixed(1)}s)`);
      if (TOUCH) await captureSceneMobile(chromium, scene, target, outDir);
      else await captureSceneDesktopHq(chromium, scene, target, outDir);
    }
  } finally {
    if (xvfbProc) xvfbProc.kill();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
