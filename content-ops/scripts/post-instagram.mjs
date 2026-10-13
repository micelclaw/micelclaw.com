#!/usr/bin/env node
// post-instagram.mjs — publish an IG feed image (Graph API: container → publish).
// IG needs a PUBLIC image_url it can fetch (no local upload). Skips with a notice if not configured.
// Usage: node scripts/post-instagram.mjs --file queue/2026-07-22/instagram.md [--item slug] [--image <public url>]
import { readFileSync } from 'node:fs';
import { basename, resolve, isAbsolute } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { parseQueueFile } from './lib/notify.mjs';
import { gateClip, gateDisabled } from './lib/video-gate.mjs';
import { resolveServedMedia } from './lib/served-media.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PLATFORM = 'instagram';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  const caption = text;
  let imageUrl = args.image || meta.image_url || '';
  let videoUrl = args.video || meta.video_url || '';

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['INSTAGRAM_USER_ID']);
  const token = env('INSTAGRAM_ACCESS_TOKEN') || env('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!ok || !token) {
    const need = [...missing, ...(token ? [] : ['INSTAGRAM_ACCESS_TOKEN|FACEBOOK_PAGE_ACCESS_TOKEN'])];
    console.log(`[skip] ${PLATFORM}: missing ${need.join(', ')} — complete the Meta setup (platforms/instagram.md)`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${need.join(',')}` });
    return;
  }
  if (!imageUrl && !videoUrl) {
    console.log(`[skip] ${PLATFORM}: no public image_url/video_url (IG cannot upload local files) — host the media first`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: 'no public media url' });
    return;
  }

  // Antes de pedirle NADA a Meta: que la URL sirva el medio. Ver resolveServedMedia.
  if (videoUrl) {
    const servido = await resolveServedMedia(videoUrl, 'video', (m) => console.log(`[skip] ${PLATFORM}: ${m}`));
    if (!servido) {
      if (!imageUrl) { record({ platform: PLATFORM, item, date, status: 'skipped', note: 'video_url no sirve vídeo' }); return; }
      videoUrl = '';
    } else videoUrl = servido;
  }

  // Un Reel es vertical con sonido. Si el vídeo no cumple, se DEGRADA a la tarjeta estática (que sí
  // es un post de Instagram legítimo) en vez de publicar un Reel mudo en 4:5 como el 2026-07-27.
  // Solo se salta el día entero si tampoco hay tarjeta.
  if (videoUrl && !gateDisabled(env)) {
    const g = gateClip({ pathOrUrl: videoUrl, surface: 'reels' });
    if (!g.ok) {
      console.log(`[warn] ${PLATFORM}: el vídeo no cumple para Reels — ${g.summary}`);
      if (!imageUrl) {
        console.log(`[skip] ${PLATFORM}: sin tarjeta a la que caer`);
        record({ platform: PLATFORM, item, date, status: 'skipped', note: `video-gate: ${g.summary}`.slice(0, 300) });
        return;
      }
      console.log(`[warn] ${PLATFORM}: publico la tarjeta estática en su lugar`);
      videoUrl = '';
    } else {
      for (const w of g.warnings) console.log(`[warn] ${PLATFORM}: ${w}`);
    }
  }

  // La tarjeta se comprueba igual que el vídeo, y justo antes de usarla: si no sirve imagen, se
  // salta con el motivo medido en vez de dejar que Meta devuelva "formato no soportado".
  if (!videoUrl && imageUrl) {
    const servido = await resolveServedMedia(imageUrl, 'image', (m) => console.log(`[skip] ${PLATFORM}: ${m}`));
    if (!servido) { record({ platform: PLATFORM, item, date, status: 'skipped', note: 'image_url no sirve imagen' }); return; }
    imageUrl = servido;
  }

  const v = env('META_GRAPH_VERSION', 'v21.0');
  const igId = env('INSTAGRAM_USER_ID');

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → ig ${igId}\n${videoUrl ? `[REELS video_url] ${videoUrl}` : `[image_url] ${imageUrl}`}`
      + `\n--- caption (${caption.length} chars) ---\n${caption}`);
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  // 1) create container — REELS for video (the only video type the API publishes), image otherwise
  const payload = videoUrl
    ? { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: true, access_token: token }
    : { image_url: imageUrl, caption, access_token: token };
  const cres = await fetch(`https://graph.facebook.com/${v}/${igId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const cdata = await cres.json();
  if (!cres.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(cdata).slice(0, 300) });
    throw new Error(`ig container failed: ${JSON.stringify(cdata)}`);
  }
  if (videoUrl) {
    // Reels transcode asynchronously; publishing before FINISHED returns a "media not ready" error.
    const deadline = Date.now() + 300_000;
    process.stdout.write('[..] instagram transcoding');
    for (;;) {
      await sleep(5000);
      const s = await fetch(`https://graph.facebook.com/${v}/${cdata.id}?fields=status_code,status&access_token=${token}`);
      const sd = await s.json();
      if (sd.status_code === 'FINISHED') { process.stdout.write(' done\n'); break; }
      if (sd.status_code === 'ERROR') { process.stdout.write('\n'); throw new Error(`ig transcode failed: ${JSON.stringify(sd)}`); }
      if (Date.now() > deadline) { process.stdout.write('\n'); throw new Error('ig transcode timed out (300s)'); }
      process.stdout.write('.');
    }
  } else {
    await sleep(3000); // let Meta fetch/process the image
  }

  // 2) publish
  const pres = await fetch(`https://graph.facebook.com/${v}/${igId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: cdata.id, access_token: token }),
  });
  const pdata = await pres.json();
  if (!pres.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(pdata).slice(0, 300) });
    throw new Error(`ig publish failed: ${JSON.stringify(pdata)}`);
  }
  // El publish solo devuelve el id de media, que no sirve para ir a ver el post. Se pide el
  // permalink para que el ledger guarde un enlace REAL (el resumen a quien revisa lo usa).
  // Best-effort: si falla, se registra igual el id — no se pierde una publicación buena por esto.
  let url;
  try {
    const perm = await fetch(`https://graph.facebook.com/${v}/${pdata.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    const pj = await perm.json();
    if (perm.ok && pj.permalink) url = pj.permalink;
    else console.warn(`[instagram] sin permalink: ${pj?.error?.message || 'respuesta inesperada'}`);
  } catch (e) {
    console.warn(`[instagram] sin permalink (fallo de red): ${String(e)}`);
  }
  console.log(`[ok] instagram → ${url || `media ${pdata.id}`}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: pdata.id, url });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
