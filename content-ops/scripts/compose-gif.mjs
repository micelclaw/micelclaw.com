#!/usr/bin/env node
// compose-gif.mjs — GIF social corto y MUDO (+ su MP4 gemelo) desde la composición Remotion
// `SocialGif`. Hermano animado de compose-card.mjs: mismo lenguaje de marca, misma co-locación en
// queue/<fecha>/ + public/social/<fecha>/ (IG/TikTok necesitan la URL pública).
//
// Por qué así: un solo render (MP4 1080x1350, sin audio) y de ahí se DERIVA el GIF con la pasada de
// paleta de ffmpeg a 864x1080 — 4:5 y <1 MP, que es el techo que impone Mastodon a los GIF
// ("GIF dimensions must be less than 1MP"). Un render y dos salidas = el montaje es idéntico.
//
// Uso:
//   node scripts/compose-gif.mjs --spec specs/gif-a2-token.json
//   node scripts/compose-gif.mjs --spec <f> --date 2026-07-26 --name agent-identity-gif-a2  # co-loca
//
// El spec es un GifProps (ver video/remotion/gif-types.ts) más:
//   name, date            → co-locación (equivalen a --name/--date)
//   beats[].shotSrc       → ruta ABSOLUTA de la captura; se copia a video/public/gif-shots/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, isAbsolute, join, basename, dirname } from 'node:path';
import { CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';

const VIDEO_ROOT = join(CONTENT_OPS_ROOT, 'video');
const SHOTS_DIR = join(VIDEO_ROOT, 'public', 'gif-shots');
const STAGING = '/home/victor/Projects/_artifacts/video/_gifs';

// Lienzo del render (y del MP4 gemelo) y lienzo del GIF.
const RENDER = { w: 1080, h: 1350, fps: 24 };
const GIF = { w: 864, h: 1080, fps: 12 }; // 0.93 MP < 1 MP (límite de Mastodon para GIF)
const GIF_COLORS = 200;
// Las capturas de pantalla son contenido fotográfico: cada frame cambia entero y el GIF no puede
// reaprovechar nada. Con menos fps y menos colores bajan de ~7 MB a ~3 MB sin pérdida perceptible.
// Se puede forzar por spec con gifFps / gifColors.
const SHOTS_GIF = { fps: 10, colors: 128 };

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

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} falló (status ${r.status})`);
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) throw new Error('--spec <spec.json> es obligatorio');
  const specPath = isAbsolute(args.spec) ? args.spec : resolve(CONTENT_OPS_ROOT, args.spec);
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));

  const name = args.name || spec.name;
  const date = args.date || spec.date;
  if (!name) throw new Error('falta `name` (en el spec o por --name)');
  if (!Array.isArray(spec.beats) || !spec.beats.length) throw new Error('el spec necesita `beats`');

  // Las capturas viven bajo video/public/ para que staticFile() las encuentre.
  const beats = spec.beats.map((b) => {
    const { shotSrc, ...rest } = b;
    if (!shotSrc) return rest;
    const src = isAbsolute(shotSrc) ? shotSrc : resolve(CONTENT_OPS_ROOT, shotSrc);
    if (!existsSync(src)) throw new Error(`captura no encontrada: ${src}`);
    mkdirSync(SHOTS_DIR, { recursive: true });
    const dest = join(SHOTS_DIR, basename(src));
    copyFileSync(src, dest);
    return { ...rest, shot: `gif-shots/${basename(src)}` };
  });

  // La duración la manda la suma de los beats (la pausa final es el último beat).
  const durationSec = beats.reduce((s, b) => s + b.durSec, 0);
  const props = {
    fps: RENDER.fps,
    width: RENDER.w,
    height: RENDER.h,
    durationSec,
    kind: spec.kind ?? 'concept',
    concept: spec.concept,
    kicker: spec.kicker,
    beats,
    signature: spec.signature,
  };

  const outDir = join(STAGING, name);
  mkdirSync(outDir, { recursive: true });
  const propsPath = join(outDir, 'props.json');
  writeFileSync(propsPath, JSON.stringify(props, null, 2));

  const mp4 = join(outDir, `${name}.mp4`);
  const gifv = join(outDir, `${name}-gifv.mp4`);
  const gif = join(outDir, `${name}.gif`);
  const palette = join(outDir, 'palette.png');

  // 1) render único: MP4 1080x1350 SIN pista de audio, garantizado por los flags `--muted` y
  //    `--enforce-audio-track=false`. El GIF no admite audio y el gemelo va a Mastodon, que
  //    necesita la AUSENCIA de pista para clasificarlo `gifv` y autorreproducirlo.
  //    OJO: hasta el 2026-07-27 este comentario decía "sin pista de audio" pero NO pasaba los
  //    flags → Remotion 4 inyecta AAC de silencio por defecto, y ese fichero se publicó en TikTok,
  //    Instagram y Facebook a −70 LUFS / pico −∞ dBFS. El comentario no era un test; la guardia
  //    de abajo sí lo es.
  console.log(`[render] ${name} · ${durationSec}s · ${RENDER.w}x${RENDER.h}@${RENDER.fps}`);
  run('npx', ['remotion', 'render', 'remotion/index.ts', 'SocialGif', mp4, '--codec=h264',
    '--crf=10', '--muted', '--enforce-audio-track=false', `--props=${propsPath}`,
    '--timeout=180000', '--concurrency=2'], { cwd: VIDEO_ROOT });

  // 1b) GUARDIA: que el fichero no tenga NINGUNA pista de audio. Es la puerta real — si un día
  //     cambian los nombres de los flags, esto falla en vez de publicar un vídeo mudo.
  const aStreams = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'stream=index', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
  if ((aStreams.stdout || '').trim()) {
    throw new Error(
      `el MP4 del GIF salió CON pista de audio (stream ${aStreams.stdout.trim()}). Remotion inyecta `
      + 'AAC de silencio si no se le pasan --muted Y --enforce-audio-track=false. Así se publicó '
      + 'gif-c1-team-shots.mp4 el 2026-07-27 (−70 LUFS, pico −inf dBFS).',
    );
  }

  // 2) GIF derivado: escalado lanczos a 864x1080 + paleta en 2 pasadas (evita el banding del fondo).
  const isShots = props.kind === 'shots';
  const gifFps = Number(spec.gifFps ?? (isShots ? SHOTS_GIF.fps : GIF.fps));
  const gifColors = Number(spec.gifColors ?? (isShots ? SHOTS_GIF.colors : GIF_COLORS));
  const vf = `fps=${gifFps},scale=${GIF.w}:${GIF.h}:flags=lanczos`;
  console.log(`[gif] paleta ${gifColors} colores · ${GIF.w}x${GIF.h}@${gifFps}`);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf',
    `${vf},palettegen=max_colors=${gifColors}:stats_mode=diff`, palette]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-i', palette, '-lavfi',
    `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    '-loop', '0', gif]);
  rmSync(palette, { force: true });

  // 3) variante para MASTODON. Verificado en vivo (2026-07-26): mastodon.social rechaza un GIF de
  // 864x1080 con "864x1080 GIF files are not supported" — su tope de GIF NO es de area sino por
  // dimension (alto <= 720), asi que un 4:5 vertical nunca cabe. Pero un MP4 SIN pista de audio lo
  // clasifica como `gifv`, que autorreproduce en bucle igual que un GIF y a resolucion completa
  // (comprobado: type=gifv, 1080x1350). De ahi este gemelo sin audio, que es lo que se le manda.
  console.log('[gifv] MP4 sin pista de audio para Mastodon (lo trata como gifv → autoplay en bucle)');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-c:v', 'copy', '-an', gifv]);

  // 4) co-locación (misma mecánica que compose-card.mjs, con la extensión parametrizada)
  if (date) {
    for (const [src, ext] of [[gif, 'gif'], [mp4, 'mp4'], [gifv, 'gifv.mp4']]) {
      for (const target of [
        join(CONTENT_OPS_ROOT, 'queue', date, `${name}.${ext}`),
        join(REPO_ROOT, 'public', 'social', date, `${name}.${ext}`),
      ]) {
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(src, target);
        console.log(`[co-located] → ${target}`);
      }
    }
  }

  console.log(gif);
  console.log(mp4);
  console.log(gifv);
}

try { main(); } catch (e) { console.error('[error]', e.message); process.exit(1); }
