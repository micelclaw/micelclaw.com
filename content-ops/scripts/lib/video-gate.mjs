// video-gate.mjs — puerta de calidad para las superficies de vídeo VERTICAL CON SONIDO
// (TikTok · Instagram Reels · YouTube Shorts).
//
// Por qué existe: el 2026-07-27 se publicó en TikTok, Instagram y Facebook el MISMO MP4 de
// 1080x1350 (4:5), 7,2 s y **silencio absoluto** (−70 LUFS, pico −∞ dBFS). No hubo ningún fallo
// técnico: la regla escrita enrutaba ahí el "MP4 gemelo" del GIF, que es mudo por diseño porque
// Mastodon lo necesita así. Una regla en un documento no impide nada; esto sí.
//
// Diseño:
//   · `checkVerticalClip` es PURA (recibe un probe, devuelve fallos) → testeable sin ficheros.
//   · Los umbrales están anclados en MEDICIONES de los dos ficheros reales, con margen, para que
//     el vídeo bueno pase holgado. Un gate que rechaza lo bueno se desactiva en una semana.
//   · Al fallar NO se lanza: se devuelve el motivo para que el llamante haga skip con aviso. Un
//     gate que rompe `publish-day` deja al resto de las redes sin publicar.

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

/** Perfiles por superficie. Todas son 9:16 con sonido; cambian los topes. */
export const SURFACES = {
  tiktok: { maxSec: 90, needsServedUrl: false },
  reels: { maxSec: 90, needsServedUrl: true, maxMB: 25 }, // Cloudflare Pages sirve hasta 25 MB
  shorts: { maxSec: 60, needsServedUrl: false },           // "Short" = vertical y ≤60 s
};

// ── Umbrales, con la medición que los justifica ──────────────────────────────
// (malo = queue/2026-07-27/gif-c1-team-shots.mp4 · bueno = ep1-notes-vertical-nomusic.mp4)
const RATIO_9_16 = 9 / 16;          // 0,5625 · malo 0,80 · bueno 0,5625
const RATIO_TOL = 0.02;
const MIN_W = 720, MIN_H = 1280;
const MIN_SEC = 5;                  // el malo duraba 7,2 s → la duración NO era el problema
const MIN_LUFS = -20;               // malo −70,0 · bueno −14,6 → 5,4 dB de margen
const MIN_PEAK_DB = -6;             // malo −91,0 · bueno −1,5 → 4,5 dB. ESTE cazaba el fallo
const MAX_SILENCE = 0.65;           // el máster bueno SIN música tiene 0,56 → el tope va encima
const WARN_SILENCE = 0.40;

/** Lee las propiedades del clip. Acepta ruta local o `https://`. Sin lanzar nunca. */
export function probeVideo(pathOrUrl) {
  const isUrl = /^https?:\/\//i.test(pathOrUrl);
  if (!isUrl && !existsSync(pathOrUrl)) return { ok: false, reason: `no existe ${pathOrUrl}` };

  const ff = spawnSync('ffprobe', ['-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate',
    '-show_entries', 'format=duration,size', '-of', 'json', pathOrUrl], { encoding: 'utf8' });
  if (ff.status !== 0) return { ok: false, reason: `ffprobe falló: ${(ff.stderr || '').trim().slice(0, 160)}` };

  let j; try { j = JSON.parse(ff.stdout); } catch { return { ok: false, reason: 'ffprobe devolvió algo ilegible' }; }
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  const a = (j.streams || []).find((s) => s.codec_type === 'audio');
  if (!v) return { ok: false, reason: 'sin pista de vídeo' };

  const durSec = Number(j.format?.duration ?? 0);
  const p = {
    ok: true,
    width: Number(v.width), height: Number(v.height),
    ratio: Number(v.width) / Number(v.height),
    fps: (() => { const [n, d] = String(v.r_frame_rate || '0/1').split('/'); return d ? Number(n) / Number(d) : 0; })(),
    durSec,
    vcodec: v.codec_name, acodec: a?.codec_name ?? null, hasAudio: Boolean(a),
    sizeMB: isUrl ? Number(j.format?.size ?? 0) / 1048576 : statSync(pathOrUrl).size / 1048576,
    lufs: null, peakDb: null, silentRatio: null,
  };

  if (p.hasAudio) {
    // La existencia de la pista NO basta: el fichero malo TENÍA aac, a −91 dB.
    const eb = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', pathOrUrl,
      '-map', '0:a', '-filter:a', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
    const out = (eb.stderr || '') + (eb.stdout || '');
    const mI = out.match(/I:\s*(-?[\d.]+|-inf)\s*LUFS/g);
    const mP = out.match(/Peak:\s*(-?[\d.]+|-inf)\s*dBFS/g);
    const num = (s) => (s && /-inf/.test(s) ? -Infinity : Number((s || '').match(/(-?[\d.]+)/)?.[1] ?? NaN));
    p.lufs = mI ? num(mI[mI.length - 1]) : null;
    p.peakDb = mP ? num(mP[mP.length - 1]) : null;

    const sd = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', pathOrUrl,
      '-map', '0:a', '-af', 'silencedetect=n=-45dB:d=0.4', '-f', 'null', '-'], { encoding: 'utf8' });
    const durs = [...((sd.stderr || '') + (sd.stdout || '')).matchAll(/silence_duration:\s*([\d.]+)/g)]
      .map((m) => Number(m[1]));
    p.silentRatio = durSec > 0 ? durs.reduce((s, d) => s + d, 0) / durSec : null;
  }
  return p;
}

/**
 * LA DECISIÓN, pura. Devuelve `{ok, failures[], warnings[]}`; cada fallo dice qué se midió y qué
 * se esperaba, porque un gate que solo dice "no válido" se bypassea a la primera.
 */
export function checkVerticalClip(probe, surface = 'tiktok') {
  const S = SURFACES[surface] ?? SURFACES.tiktok;
  const failures = [], warnings = [];
  const fail = (code, got, want, why) => failures.push({ code, got, want, why });

  if (!probe || probe.ok === false) {
    return { ok: false, failures: [{ code: 'missing', got: probe?.reason ?? 'sin probe', want: 'un fichero legible', why: 'no se pudo medir el clip' }], warnings };
  }

  if (!(probe.height > probe.width) || Math.abs(probe.ratio - RATIO_9_16) > RATIO_TOL) {
    fail('aspect', `${probe.width}x${probe.height} (${probe.ratio.toFixed(4)})`, '9:16 (0,5625)',
      'no llena la pantalla: aquí el vídeo es vertical o no es');
  }
  if (probe.width < MIN_W || probe.height < MIN_H) {
    fail('min_dim', `${probe.width}x${probe.height}`, `≥${MIN_W}x${MIN_H}`, 'por debajo del suelo de las tres plataformas');
  }
  if (probe.durSec < MIN_SEC) {
    fail('too_short', `${probe.durSec.toFixed(2)}s`, `≥${MIN_SEC}s`, 'no da tiempo ni a una acción con su reposo');
  }
  if (probe.durSec > S.maxSec) {
    fail('too_long', `${probe.durSec.toFixed(2)}s`, `≤${S.maxSec}s`, `tope de ${surface}`);
  }
  if (!probe.hasAudio) {
    fail('no_audio', 'sin pista', 'h264 + aac', 'superficie audio-first: sin sonido la pieza está muerta');
  } else {
    if (probe.lufs !== null && probe.lufs < MIN_LUFS) {
      fail('loudness', `${probe.lufs === -Infinity ? '-inf' : probe.lufs.toFixed(1)} LUFS`, `≥${MIN_LUFS} LUFS`,
        'la pista existe pero no suena');
    }
    if (probe.peakDb !== null && probe.peakDb < MIN_PEAK_DB) {
      fail('peak', `${probe.peakDb === -Infinity ? '-inf' : probe.peakDb.toFixed(1)} dBFS`, `≥${MIN_PEAK_DB} dBFS`,
        'pico inaudible: es silencio digital (el fallo del 2026-07-27)');
    }
    if (probe.silentRatio !== null && probe.silentRatio > MAX_SILENCE) {
      fail('silence', `${Math.round(probe.silentRatio * 100)}%`, `≤${Math.round(MAX_SILENCE * 100)}%`,
        'suena a tramos: la voz no cubre las ventanas');
    } else if (probe.silentRatio !== null && probe.silentRatio > WARN_SILENCE) {
      warnings.push(`silencio ${Math.round(probe.silentRatio * 100)}% (escribe las frases más largas)`);
    }
    if (probe.acodec !== 'aac') fail('acodec', probe.acodec, 'aac', 'exigido por la API de Reels');
  }
  if (probe.vcodec !== 'h264') fail('vcodec', probe.vcodec, 'h264', 'exigido por la API de Reels');
  if (S.maxMB && probe.sizeMB > S.maxMB) {
    fail('size', `${probe.sizeMB.toFixed(1)} MB`, `≤${S.maxMB} MB`, 'Cloudflare Pages no sirve más');
  }
  if (probe.fps && (probe.fps < 24 || probe.fps > 60)) warnings.push(`${probe.fps.toFixed(0)} fps (se espera 24-60)`);

  return { ok: failures.length === 0, failures, warnings };
}

/** Azúcar: mide y juzga. Devuelve además un resumen de una línea para el aviso. */
export function gateClip({ pathOrUrl, surface = 'tiktok' }) {
  const probe = probeVideo(pathOrUrl);
  const r = checkVerticalClip(probe, surface);
  const summary = r.ok
    ? `ok (${probe.width}x${probe.height}, ${probe.durSec?.toFixed(1)}s, ${probe.lufs?.toFixed(1)} LUFS)`
    : r.failures.map((f) => `${f.code} (${f.got}, se espera ${f.want})`).join(' · ');
  return { ...r, probe, summary };
}

/** ¿Está la puerta desactivada a mano? Se registra en el ledger para que quede auditado. */
export function gateDisabled(envFn) {
  return String(envFn?.('VIDEO_GATE') ?? '').toLowerCase() === 'off';
}
