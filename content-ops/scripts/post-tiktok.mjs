#!/usr/bin/env node
// post-tiktok.mjs — post a PHOTO carousel to TikTok. Default = MEDIA_UPLOAD (lands in your TikTok drafts;
// you open the app and tap publish). Images must be PUBLIC HTTPS URLs (JPEG/WebP, not PNG) on a domain
// verified in the TikTok portal — TikTok pulls them itself (PULL_FROM_URL). Skips with a notice if not ready.
// Usage: node scripts/post-tiktok.mjs --file queue/2026-07-22/tiktok.md [--item slug] [--date YYYY-MM-DD]
//
// Queue file shape (queue/<date>/tiktok.md):
//   title: Micelclaw weekly            (optional, <=90 chars)
//   image_url: https://micelclaw.com/tiktok-cards/2026-07-22/1.jpg
//   image_url: https://micelclaw.com/tiktok-cards/2026-07-22/2.jpg
//   cover: 0                            (optional cover index, default 0)
//   <the caption/description goes here, #hashtags and @mentions, <=4000 runes>
import { readFileSync, existsSync, statSync } from 'node:fs';
import { basename, resolve, isAbsolute } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { loadTokens, ensureFreshAccessToken } from './lib/tiktok-tokens.mjs';
import { parseTikTokFile } from './lib/tiktok-file.mjs';
import { gateClip, gateDisabled } from './lib/video-gate.mjs';

const BASE = 'https://open.tiktokapis.com';
const PLATFORM = 'tiktok';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Las banderas SIN valor (`--force`) también cuentan: la versión anterior hacía `a[key] = argv[++i]`
// a secas, así que un flag booleano al final se quedaba en `undefined` (= falso) y parecía ignorado.
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

/**
 * Resuelve la ruta de `video:` contra las raíces del repo, no contra el cwd.
 *
 * Antes era `existsSync(videoPath)` a secas: una ruta RELATIVA (`queue/<fecha>/x.mp4`) solo se
 * encontraba si el proceso arrancaba desde `content-ops/`. Lanzado desde otro sitio —el cron, o
 * `publish-day` invocado por ruta absoluta— el fichero no aparecía, `isVideo` quedaba false y
 * TikTok hacía **skip en silencio**. Mismo resolver que `post-facebook.mjs::resolveImage`.
 */
function resolveLocalVideo(p) {
  if (!p) return null;
  for (const base of [null, CONTENT_OPS_ROOT, REPO_ROOT, resolve(REPO_ROOT, 'public')]) {
    const full = base ? resolve(base, p) : (isAbsolute(p) ? p : null);
    if (full && existsSync(full)) return full;
  }
  return null;
}


async function api(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok && (!data.error || data.error.code === 'ok'), data };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { title, images, cover, coverUrl, videoUrl, videoPath, description } = parseTikTokFile(readFileSync(filePath, 'utf8'));
  const localVideo = resolveLocalVideo(videoPath);
  const isVideo = Boolean(videoUrl || localVideo);

  // `--force` reenvía al buzón un vídeo ya enviado. Existe porque el buzón NO es una publicación:
  // hasta que alguien lo toca en la app, el vídeo sigue pendiente, y si se corrige el montaje hay
  // que mandar el bueno. Sin esto la única salida era mentirle al ledger con un item inventado.
  // Deja constancia (`resent`) para que se vea que hubo dos envíos y por qué.
  if (alreadyPosted(PLATFORM, item, date) && !args.force) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date} — usa --force para reenviar al buzón un montaje corregido`);
    return;
  }
  const resent = alreadyPosted(PLATFORM, item, date);
  if (resent) console.log(`[force] reenviando ${PLATFORM}/${item}/${date} al buzón (ya se envió antes)`);

  const { ok, missing } = requireEnv(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — see platforms/tiktok.md`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }
  if (!loadTokens()) {
    console.log(`[skip] ${PLATFORM}: not authorized — run \`node scripts/tiktok-auth.mjs\` (platforms/tiktok.md)`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: 'no oauth tokens' });
    return;
  }
  if (!images.length && !isVideo) {
    console.log(`[skip] ${PLATFORM}: no image_url/video_url lines — TikTok needs PUBLIC HTTPS URLs (PULL_FROM_URL)`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: 'no public media url' });
    return;
  }
  if (isVideo && !localVideo && !/^https:\/\//i.test(videoUrl)) throw new Error('TikTok video_url must be a public https URL');
  if (!isVideo && images.some((u) => !/^https:\/\//i.test(u))) throw new Error('all TikTok image_url must be public https URLs');

  // Puerta de calidad: TikTok es vertical con sonido. El 2026-07-27 subimos un 4:5 MUDO porque la
  // regla que enrutaba el fichero vivía en un documento. Aquí se MIDE antes de enviar. Skip, no
  // throw: reventar dejaría al resto del lote del día sin publicar.
  if (isVideo && !gateDisabled(env)) {
    const g = gateClip({ pathOrUrl: localVideo || videoUrl, surface: 'tiktok' });
    if (!g.ok) {
      console.log(`[skip] ${PLATFORM}: el vídeo no cumple para TikTok — ${g.summary}`);
      for (const f of g.failures) console.log(`        · ${f.code}: ${f.why}`);
      record({ platform: PLATFORM, item, date, status: 'skipped', note: `video-gate: ${g.summary}`.slice(0, 300) });
      return;
    }
    for (const w of g.warnings) console.log(`[warn] ${PLATFORM}: ${w}`);
  }

  const postMode = env('TIKTOK_POST_MODE', 'MEDIA_UPLOAD'); // MEDIA_UPLOAD = draft; DIRECT_POST = publish (SELF_ONLY until audited)

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} (${postMode}, ${isVideo ? 'VIDEO' : `PHOTO carousel ${images.length} imgs, cover ${cover}`})\n` +
      `--- title: ${title || '(none)'} ---\n${description}\n` +
      (isVideo ? `[video]\n  ${localVideo ? localVideo + ' (FILE_UPLOAD)' : videoUrl}` : `[images]\n  ${images.join('\n  ')}`));
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  const token = await ensureFreshAccessToken();

  const post_info = { title: title || undefined, description, disable_comment: false, auto_add_music: false };
  // creator_info + privacy_level only apply to DIRECT_POST (needs video.publish). Draft/MEDIA_UPLOAD skips it.
  if (postMode === 'DIRECT_POST') {
    const ci = await api('/v2/post/publish/creator_info/query/', token, {});
    if (!ci.ok) {
      record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(ci.data.error || ci.data).slice(0, 300) });
      throw new Error(`tiktok creator_info failed: ${JSON.stringify(ci.data.error || ci.data)}`);
    }
    const opts = ci.data.data?.privacy_level_options || ['SELF_ONLY'];
    post_info.privacy_level = opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';
  }

  // Video drafts go through the inbox endpoint (scope video.upload) and carry no post_info;
  // photos and DIRECT_POST video use content/init. Sending post_info to the inbox endpoint 400s.
  const videoDraft = isVideo && postMode !== 'DIRECT_POST';
  const init = videoDraft
    ? await api('/v2/post/publish/inbox/video/init/', token, localVideo
      // FILE_UPLOAD sube el fichero directamente: no depende de que el mp4 esté desplegado en la
      // web (y por tanto de un push). Un solo chunk basta muy por debajo del límite de 64 MB.
      ? { source_info: { source: 'FILE_UPLOAD', video_size: statSync(localVideo).size,
          chunk_size: statSync(localVideo).size, total_chunk_count: 1 } }
      : { source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } })
    : await api('/v2/post/publish/content/init/', token, {
      media_type: isVideo ? 'VIDEO' : 'PHOTO',
      post_mode: postMode,
      post_info,
      source_info: isVideo
        ? { source: 'PULL_FROM_URL', video_url: videoUrl }
        : { source: 'PULL_FROM_URL', photo_images: images, photo_cover_index: cover },
    });
  if (!init.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(init.data.error || init.data).slice(0, 300) });
    throw new Error(`tiktok init failed: ${JSON.stringify(init.data.error || init.data)}`);
  }
  const publishId = init.data.data?.publish_id;

  // FILE_UPLOAD: el init solo reserva el hueco — hay que PUT del fichero al upload_url devuelto.
  const uploadUrl = init.data.data?.upload_url;
  if (localVideo && uploadUrl) {
    const buf = readFileSync(localVideo);
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(buf.length),
        'Content-Range': `bytes 0-${buf.length - 1}/${buf.length}`,
      },
      body: buf,
    });
    if (!put.ok) {
      record({ platform: PLATFORM, item, date, status: 'error', note: `upload PUT ${put.status}` });
      throw new Error(`tiktok upload failed: HTTP ${put.status} ${await put.text().catch(() => '')}`);
    }
    console.log(`[..] tiktok subido ${(buf.length / 1048576).toFixed(1)} MB (publish_id ${publishId})`);
  } else {
    console.log(`[..] tiktok publish_id ${publishId} — TikTok is pulling ${isVideo ? 'the video' : `${images.length} images`}`);
  }

  // poll status until terminal (cap ~90s)
  let status = 'PROCESSING_DOWNLOAD', fail;
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const st = await api('/v2/post/publish/status/fetch/', token, { publish_id: publishId });
    status = st.data.data?.status || status;
    fail = st.data.data?.fail_reason;
    if (['PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX', 'FAILED'].includes(status)) break;
  }

  if (status === 'FAILED') {
    record({ platform: PLATFORM, item, date, status: 'error', note: `FAILED: ${fail || '?'}` });
    throw new Error(`tiktok post FAILED: ${fail || 'unknown'}`);
  }
  const drafted = status === 'SEND_TO_USER_INBOX';
  // OJO: NO queda en "Borradores" del perfil. La doc oficial: "users must click on inbox
  // notifications to continue the editing flow in TikTok and complete the post".
  if (drafted) {
    console.log('[ok] tiktok → está en tu INBOX de TikTok (Notificaciones), NO en Borradores.');
    console.log('     Abre la app › Inbox › TOCA la notificación para editar y publicar.');
    console.log('     Límite: 5 envíos pendientes por 24h.');
  }
  // La ÚLTIMA línea es la que `publish-day.mjs` mete en el aviso de Telegram (hace
  // `out.split('\n').filter(Boolean).pop()`), así que tiene que ser UNA sola línea y la
  // más útil. Antes el mensaje era multilínea y al aviso llegaba la coletilla ("edit and
  // publish. It is NOT in Drafts…"): ni decía qué había pasado ni servía de nada.
  //
  // Y lleva la DESCRIPCIÓN dentro a propósito. Con el scope `video.upload` la API de
  // inbox NO acepta `post_info` (ver platforms/tiktok.md §94), así que el texto hay que
  // escribirlo a mano en la app — y el aviso llega al mismo móvil desde el que se toca la
  // notificación, o sea que llevarlo ahí convierte "reescribirlo" en "pegarlo".
  const caption = (description || title || '').replace(/\s*\n\s*/g, ' ').trim();

  // El aviso a quien publica lo manda `publish-day.mjs` al terminar el día, NO este script:
  // así sale UN solo mensaje (acción + enlaces de las demás redes) en vez de dos, y la
  // descripción va en un mensaje aparte para poder copiarla de un toque.
  console.log(drafted
    // El aviso a quien publica SOLO existe cuando corre publish-day (que es quien lo manda al
    // final del día). En invocación directa decir "avisada" es MENTIRA — pasó el 2026-08-04:
    // el Ep. 2 se publicó con los scripts sueltos y María no recibió nada hasta que se detectó.
    ? (process.env.VIA_PUBLISH_DAY
      ? `[ok] tiktok → en el INBOX de TikTok (hay que tocarlo en la app). Descripción avisada a ${env('TIKTOK_PUBLISHER_NAME', 'quien publica')}: ${caption}`
      : `[ok] tiktok → en el INBOX de TikTok. ⚠ Invocación directa: el aviso a ${env('TIKTOK_PUBLISHER_NAME', 'quien publica')} NO se ha enviado — mándalo a mano (o corre publish-day). Caption: ${caption}`)
    : `[ok] tiktok → ${status} (publish_id ${publishId})`);
  const nota = drafted ? 'inbox notification — tap it in the app' : status;
  record({ platform: PLATFORM, item, date, status: 'posted', id: publishId, note: resent ? `${nota} (reenvío: montaje corregido)` : nota });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
