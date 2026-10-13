// 50-render.mjs — Timeline maestra → props.json → render Remotion → mux ffmpeg.
//
// La VOZ manda (audio-first): la ventana de cada escena sale de vo-timeline.json
// (lead + dur + pad, con minSec como suelo). El metraje se recorta/congela para
// encajar. Emite render/props.json, renderiza vídeo SIN audio con Remotion y
// muxea audio/master.wav → exports/<slug>.mp4.
//
// Uso: node scripts/50-render.mjs --project <slug> [--skip-render] [--out nombre.mp4]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO_ROOT = resolve(HERE, '..');
const STAGING = '/home/victor/Projects/_artifacts/video';

const args = process.argv.slice(2);
const get = (n) => { const i = args.indexOf(`--${n}`); return i === -1 ? null : args[i + 1]; };
const has = (n) => args.includes(`--${n}`);
const project = get('project');
if (!project) throw new Error('--project requerido');

const FPS = 30;
const sb = JSON.parse(readFileSync(join(VIDEO_ROOT, 'projects', project, 'storyboard.json'), 'utf8'));
const vt = JSON.parse(readFileSync(join(STAGING, project, 'voiceover', 'vo-timeline.json'), 'utf8'));
const wordsPath = join(VIDEO_ROOT, 'projects', project, 'subs', 'words.json');
const words = existsSync(wordsPath) ? JSON.parse(readFileSync(wordsPath, 'utf8')) : [];

// ── symlink del metraje bajo public/ (staticFile) ──────────────────────────
const footageLink = join(VIDEO_ROOT, 'public', 'footage', project);
mkdirSync(dirname(footageLink), { recursive: true });
rmSync(footageLink, { force: true, recursive: false });
try { symlinkSync(join(STAGING, project, 'footage'), footageLink); } catch { /* ya existe */ }

// ── timeline de escenas: ventanas del vo-timeline (SSOT de 10-tts) ─────────
const byId = Object.fromEntries(vt.lines.map((l) => [l.sceneId, l]));
const scenes = [];
let lastEnd = 0;
for (const sc of sb.scenes) {
  const line = byId[sc.id];
  if (!line) { console.warn(`⚠ escena ${sc.id} sin línea en vo-timeline — omitida`); continue; }
  const scene = {
    id: sc.id,
    kind: sc.kind ?? (sc.capture ? 'footage' : 'title'),
    startSec: line.windowStartSec,
    durSec: line.windowSec,
    camera: sc.camera,
    lowerThird: sc.lowerThird,
    fadeIn: sc.fadeIn,
    srcOffsetSec: sc.srcOffsetSec ?? 0,
    title: sc.title,
    sub: sc.sub,
    tagline: sc.tagline,
    url: sc.url,
    cta: sc.cta,
    episode: sc.episode,
    moduleName: sc.moduleName,
    next: sc.next,
  };
  if (scene.kind === 'footage') {
    const mp4 = join(STAGING, project, 'footage', `${sc.id}.mp4`);
    if (!existsSync(mp4)) {
      console.warn(`⚠ sin metraje para ${sc.id} (${mp4}) — escena omitida del render`);
      continue;
    }
    // Pre-proceso SIEMPRE: recorte a la ventana (offset→0) + downscale a
    // 2560x1440 (zoom máx ~1.2x a salida 1080p → sobra nitidez y el decode
    // en render cuesta ~4x menos que el 4K — evita timeouts bajo carga).
    const trimmed = join(STAGING, project, 'footage', `${sc.id}.trim.mp4`);
    const vertical = (sb.size?.[1] ?? 1080) > (sb.size?.[0] ?? 1920);
    const trimScale = vertical ? 'scale=1080:1920:flags=lanczos' : 'scale=2560:1440:flags=lanczos';
    const t = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(scene.srcOffsetSec ?? 0),
      '-i', mp4, '-t', String(scene.durSec + 1.0), '-r', String(FPS), '-fps_mode', 'cfr',
      '-vf', trimScale, '-g', '30',
      // Intermedio mezzanine: CRF 10 evita volver a introducir macroblocking
      // entre la captura HQ y el render final. 4:2:0 se conserva porque es el
      // formato de entrega web, pero parte de una fuente 4:4:4 a 4K.
      '-c:v', 'libx264', '-crf', '10', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', trimmed]);
    if (t.status !== 0) throw new Error(`trim falló para ${sc.id}`);
    scene.src = `footage/${project}/${sc.id}.trim.mp4`;
    scene.srcOffsetSec = 0;
  }
  scenes.push(scene);
  lastEnd = line.windowStartSec + line.windowSec;
}
const durationSec = Number(lastEnd.toFixed(3));

const props = {
  fps: FPS,
  width: sb.size?.[0] ?? 1920,
  height: sb.size?.[1] ?? 1080,
  durationSec,
  scenes,
  words,
  showCaptions: sb.showCaptions ?? true,
  captionBottom: sb.captionBottom,
  // `hook` del storyboard: 4-8 palabras que se ven en el frame 1 (el karaoke no llega hasta la
  // primera palabra hablada). Opcional: sin él, el render sale idéntico al de antes.
  hook: sb.hook || undefined,
  hookHoldSec: sb.hookHoldSec,
};

const renderDir = join(STAGING, project, 'render');
mkdirSync(renderDir, { recursive: true });
const propsPath = join(renderDir, 'props.json');
writeFileSync(propsPath, JSON.stringify(props, null, 2));
console.log(`props.json: ${scenes.length} escenas, ${durationSec}s`);

// (scene.src va relativo a public/; FootageScene lo resuelve con staticFile())

const videoOnly = join(renderDir, 'video-only.mp4');
if (!has('skip-render')) {
  // timeout amplio + concurrencia baja: la extracción de frames compite con ollama/jobs en esta
  // caja — con los defaults se pasa del delayRender de 28s.
  //
  // Ajustables porque la carga de la máquina VARÍA y el render es lo primero que se cae: el
  // 2026-07-27, con load 95 y 7 GB de swap, la concurrencia 2 se pasó del timeout de 183 s en el
  // frame 100. Antes había que editar este fichero para poder terminar un vídeo.
  const concurrency = process.env.CLAW_RENDER_CONCURRENCY || '2';
  const timeoutMs = process.env.CLAW_RENDER_TIMEOUT_MS || '180000';
  console.log(`render: concurrencia ${concurrency}, timeout ${Math.round(Number(timeoutMs) / 1000)}s` +
    ` (CLAW_RENDER_CONCURRENCY / CLAW_RENDER_TIMEOUT_MS para ajustar si la caja está cargada)`);
  const r = spawnSync('npx', ['remotion', 'render', 'remotion/index.ts', 'Video', videoOnly,
    `--props=${propsPath}`, `--timeout=${timeoutMs}`, `--concurrency=${concurrency}`,
    // PNG evita que los frames de composición atraviesen otro JPEG interno.
    // CRF 10 + preset slow deja un máster H.264 de alta calidad para YouTube.
    '--image-format=png', '--codec=h264', '--crf=10', '--x264-preset=slow', '--pixel-format=yuv420p'],
    { cwd: VIDEO_ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}

// ── mux con el master de audio ─────────────────────────────────────────────
const master = join(STAGING, project, 'audio', 'master.wav');
const exportsDir = join(STAGING, project, 'exports');
mkdirSync(exportsDir, { recursive: true });
const outName = get('out') ?? `${project}.mp4`;
const finalOut = join(exportsDir, outName);
if (existsSync(master)) {
  const r2 = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOnly, '-i', master,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', '-shortest', finalOut]);
  if (r2.status !== 0) throw new Error('mux falló');
  console.log(`OK ${finalOut}`);
} else {
  console.log(`(sin master.wav — solo vídeo en ${videoOnly})`);
}
