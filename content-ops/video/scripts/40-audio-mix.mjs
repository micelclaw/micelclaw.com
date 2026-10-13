// 40-audio-mix.mjs — Audio maestro: narración + música con ducking + SFX.
//
// Música: fade-in/out + sidechaincompress con la narración como key.
// SFX: eventos anclados a las acciones de captura (actions.json, tag `sfx`)
// más los `sfx` declarados a nivel de escena en el storyboard.
// Salida: audio/master.wav (48k estéreo, loudnorm -14 LUFS).
//
// Uso: node scripts/40-audio-mix.mjs --project <slug>
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO_ROOT = resolve(HERE, '..');
const STAGING = '/home/victor/Projects/_artifacts/video';

const args = process.argv.slice(2);
const project = args[args.indexOf('--project') + 1];
if (!project) throw new Error('--project requerido');

const sb = JSON.parse(readFileSync(join(VIDEO_ROOT, 'projects', project, 'storyboard.json'), 'utf8'));
const vt = JSON.parse(readFileSync(join(STAGING, project, 'voiceover', 'vo-timeline.json'), 'utf8'));

// ── ventanas de escena: las emite 10-tts en vo-timeline (SSOT) ─────────────
const sceneStart = Object.fromEntries(vt.lines.map((l) => [l.sceneId, l.windowStartSec]));
const sceneWin = Object.fromEntries(vt.lines.map((l) => [l.sceneId, l.windowSec]));
const totalSec = vt.totalSec;

// ── recolectar eventos SFX ─────────────────────────────────────────────────
const sfxDir = join(VIDEO_ROOT, 'assets', 'sfx');
const events = [];
for (const sc of sb.scenes) {
  // sfx a nivel de escena: [{name, atSec}] relativos al inicio de escena
  for (const e of sc.sfx ?? []) {
    events.push({ name: e.name, t: sceneStart[sc.id] + (e.atSec ?? 0) });
  }
  // sfx de las acciones de captura
  const actionsPath = join(STAGING, project, 'footage', `${sc.id}.actions.json`);
  if (existsSync(actionsPath)) {
    const rec = JSON.parse(readFileSync(actionsPath, 'utf8'));
    for (const a of rec.entries) {
      if (!a.sfx) continue;
      // El efecto se ancla al instante en que la acción SE VE, no al de la captura.
      // `20-capture` cronometra `tMs` desde el inicio del METRAJE, pero `50-render` recorta
      // el clip con `-ss srcOffsetSec` (L73), así que hay que descontarlo. Sin esto cada
      // efecto sonaba `srcOffsetSec` TARDE — medido en 2026-07-ep1-notes-vertical: el clic
      // de la chip se ve a los 14,27 s y sonaba a los 22,27 s (+8,00 s). La música a −15 dB
      // lo tapaba; en un corto de voz+SFX sin música es el 100% del diseño sonoro.
      const rel = a.tMs / 1000 - (sc.srcOffsetSec ?? 0);
      // Fuera de la ventana = la acción no se ve en el corte final → su efecto no suena.
      if (rel < 0 || rel > (sceneWin[sc.id] ?? Infinity)) continue;
      events.push({ name: a.sfx, t: sceneStart[sc.id] + rel });
    }
  }
}
const validEvents = events
  .filter((e) => existsSync(join(sfxDir, `${e.name}.wav`)) && e.t >= 0 && e.t < totalSec - 0.1)
  .sort((a, b) => a.t - b.t);

// ── música ─────────────────────────────────────────────────────────────────
// `--no-music` (o `"music": null` en el storyboard) mezcla SOLO narración + SFX. Se necesita para
// TikTok: su Content ID bloquea las pistas CC-BY de incompetech aunque la licencia lo permita y la
// atribución esté puesta (Ep. 1 bloqueado el 2026-07-25). Ver platforms/tiktok.md.
const noMusic = args.includes('--no-music') || sb.music === null;
const musicDir = join(VIDEO_ROOT, 'assets', 'music');
let musicFile = null, musicStartSec = 0;
if (!noMusic) {
  const musicName = sb.music;
  musicFile = musicName
    ? join(musicDir, musicName)
    : join(musicDir, readdirSync(musicDir).find((f) => f.endsWith('.mp3')));
  if (!existsSync(musicFile)) throw new Error(`música no encontrada: ${musicFile}`);
  musicStartSec = sb.musicStartSec ?? 0; // saltar intros flojas de la pista
}

// ── filtergraph ────────────────────────────────────────────────────────────
const outDir = join(STAGING, project, 'audio');
mkdirSync(outDir, { recursive: true });
const narration = join(STAGING, project, 'voiceover', 'narration.wav');

const inputs = ['-i', narration];
if (!noMusic) inputs.push('-ss', String(musicStartSec), '-i', musicFile);
validEvents.forEach((e) => inputs.push('-i', join(sfxDir, `${e.name}.wav`)));

const SFX_BASE = noMusic ? 1 : 2;   // entradas ocupadas antes de los SFX (narración [+ música])
const parts = [];
// narración a 48k estéreo
parts.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${totalSec}[vo]`);
if (!noMusic) parts.push(`[vo]asplit=2[voKey][voMix]`);
else parts.push(`[vo]anull[voMix]`);
// música: recorte + fades + nivel base, luego ducking con la voz como key
const fadeOutStart = Math.max(0, totalSec - 3.0);
if (!noMusic) {
  parts.push(
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${totalSec},` +
    `afade=t=in:d=1.2,afade=t=out:st=${fadeOutStart}:d=3.0,volume=${sb.musicDb ?? -14}dB[mus]`,
  );
  parts.push(`[mus][voKey]sidechaincompress=threshold=0.02:ratio=6:attack=25:release=450:makeup=1[ducked]`);
}
// bus de SFX
let sfxBus = null;
if (validEvents.length > 0) {
  const labels = validEvents.map((e, i) => {
    const ms = Math.round(e.t * 1000);
    parts.push(`[${i + SFX_BASE}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${sb.sfxDb ?? -16}dB[sfx${i}]`);
    return `[sfx${i}]`;
  });
  parts.push(`${labels.join('')}amix=inputs=${validEvents.length}:normalize=0,apad=whole_dur=${totalSec}[sfxbus]`);
  sfxBus = '[sfxbus]';
}
// mezcla final + loudnorm
const stems = ['[voMix]', ...(noMusic ? [] : ['[ducked]']), ...(sfxBus ? [sfxBus] : [])];
const mixIns = stems.join('');
const nIns = stems.length;
parts.push(`${mixIns}amix=inputs=${nIns}:normalize=0,atrim=0:${totalSec},loudnorm=I=-14:TP=-1.5:LRA=11[out]`);

const filter = parts.join(';');
// Salida alternativa para no pisar el master ya publicado (--out master-nomusic.wav).
const outName = (args.indexOf('--out') !== -1 ? args[args.indexOf('--out') + 1] : null) ?? 'master.wav';
const out = join(outDir, outName);
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs,
  '-filter_complex', filter, '-map', '[out]', '-ar', '48000', out], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}

// medir loudness resultante
const probe = spawnSync('ffmpeg', ['-i', out, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
  { encoding: 'utf8' });
const m = probe.stderr.match(/\{[\s\S]*\}/);
const report = { totalSec, sfxEvents: validEvents, music: musicFile ?? null, loudnorm: m ? JSON.parse(m[0]) : null };
writeFileSync(join(outDir, outName.replace(/\.wav$/, '') === 'master' ? 'mix-report.json' : `mix-report-${outName.replace(/\.wav$/, '')}.json`), JSON.stringify(report, null, 2));
console.log(`OK ${outName} (${totalSec}s, ${validEvents.length} SFX, música ${musicFile ? musicFile.split('/').pop() : 'NINGUNA'})`);
console.log(`   LUFS medido: ${report.loudnorm?.input_i ?? '?'}`);
