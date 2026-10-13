#!/usr/bin/env node
// publish-day.mjs — publish everything queued for a given day, then send a summary.
// Reads content-ops/queue/<date>/{mastodon,bluesky,telegram,facebook,instagram,x}.md
// X is draft-only: its text goes into the notification, not to any API.
// Usage: node scripts/publish-day.mjs [--date YYYY-MM-DD]
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { env, CONTENT_OPS_ROOT, LIVE, DRY_RUN } from './lib/env.mjs';
import { notify, parseQueueFile, escapeMdInline } from './lib/notify.mjs';
import { gateClip, gateDisabled } from './lib/video-gate.mjs';
import { readLedger, alreadyPosted, record } from './lib/ledger.mjs';
import { parseTikTokFile } from './lib/tiktok-file.mjs';
import { sendToPersonOrFallback, sendText, sendPhoto } from './lib/telegram.mjs';
import { composePublisherNotice } from './lib/publisher-notice.mjs';
import { entregarHiloX } from './lib/x-handoff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}

const API_PLATFORMS = [
  ['devto', 'post-devto.mjs'],
  ['mastodon', 'post-mastodon.mjs'],
  ['bluesky', 'post-bluesky.mjs'],
  ['telegram', 'post-telegram.mjs'],
  ['facebook', 'post-facebook.mjs'],
  ['instagram', 'post-instagram.mjs'],
  // Secuencia de stories del módulo. Va DESPUÉS del feed a propósito: si el post del día falla
  // por el CDN, se ve en la primera línea del resumen y no enterrado bajo seis fotogramas.
  ['instagram-stories', 'post-instagram-stories.mjs'],
  ['tiktok', 'post-tiktok.mjs'],
  // Reddit SOLO publica en subreddit propio; la guarda de post-reddit.mjs rechaza el resto.
  ['reddit', 'post-reddit.mjs'],
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date || new Date().toISOString().slice(0, 10);
  // A rescheduled batch can retain its reviewed files/media URLs, while the ledger uses today's date.
  const queueDate = args['queue-date'] || date;
  const queueDir = join(CONTENT_OPS_ROOT, 'queue', queueDate);

  if (!existsSync(queueDir)) {
    await notify(`📭 *content-ops ${date}*: nothing queued (no ${date}/ folder).`);
    return;
  }

  // Optional meta.json → { item, approved }
  let item = date;
  let approved = false;
  const metaPath = join(queueDir, 'meta.json');
  if (existsSync(metaPath)) {
    try {
      const m = JSON.parse(readFileSync(metaPath, 'utf8'));
      item = m.item || date;
      approved = m.approved === true;
      if (m.publication_date && m.publication_date !== date) {
        console.log(`[skip] batch rescheduled to ${m.publication_date}; run with that --date and --queue-date ${queueDate}`);
        return;
      }
    } catch {}
  }

  // Approval gate (weekly-batch model): nothing publishes until the day's meta.json has approved:true.
  // Set by the user's weekly OK. Manual-testing override only: PUBLISH_UNAPPROVED=1.
  if (!approved && env('PUBLISH_UNAPPROVED') !== '1') {
    await notify(`⏸ *content-ops ${date}*: queued but NOT approved — review, then set \`approved:true\` in ${date}/meta.json to publish.`);
    return;
  }

  // Preflight de vídeo: mide ANTES de lanzar los publicadores y lo dice en el aviso del día. Cada
  // publicador tiene su propia puerta (y es la que decide), pero un skip enterrado en el stdout de
  // un script pasa desapercibido; aquí sale en el mensaje de Telegram del operador.
  const videoAvisos = preflightVideos(queueDir);
  for (const a of videoAvisos) console.log(`[preflight] ${a}`);

  const results = [];
  for (const [platform, script] of API_PLATFORMS) {
    const file = join(queueDir, `${platform}.md`);
    if (!existsSync(file)) continue;
    const r = spawnSync(process.execPath, [join(HERE, script), '--file', file, '--item', item, '--date', date], {
      // VIA_PUBLISH_DAY: los scripts hijos ajustan su mensaje ("descripción avisada" solo es
      // verdad cuando ESTE orquestador manda el aviso del final del día).
      encoding: 'utf8', env: { ...process.env, VIA_PUBLISH_DAY: '1' },
    });
    const out = (r.stdout || '').trim();
    const err = (r.stderr || '').trim();
    const line = out.split('\n').filter(Boolean).pop() || '';
    results.push({ platform, ok: r.status === 0, line: line || err.split('\n').pop() || '(no output)' });
    if (out) process.stdout.write(out + '\n');
    if (err) process.stderr.write(err + '\n');
  }

  // X no tiene API: lo publica María desde el 2026-08-05. Antes el hilo entero se volcaba AQUÍ,
  // en el resumen del operador, para que el usuario lo copiase — y así se acumularon diez sin
  // publicar. Ahora se le entrega a ella tuit a tuit (ver `avisarAQuienPublica`) y aquí solo
  // queda el estado, que es lo que el operador necesita saber.
  const xFile = join(queueDir, 'x.md');
  const xEnCola = existsSync(xFile);
  const xYaEntregado = xEnCola && alreadyPosted('x', item, date);
  const xBlock = !xEnCola ? ''
    : xYaEntregado ? '\n\n✍️ x: ya entregado a quien publica'
    : '\n\n✍️ x: se entrega a quien publica al final de esta pasada';

  const modeTag = DRY_RUN ? 'DRY_RUN' : LIVE ? 'LIVE' : 'SHADOW';
  // Se escapa la parte DINÁMICA (trae URLs con `_`, que rompen el Markdown de Telegram y hacían
  // rechazar el mensaje entero); el `*negrita*` de nuestra plantilla se queda como está.
  const lines = results.map((r) => `${r.ok ? '•' : '⚠️'} ${r.platform}: ${escapeMdInline(r.line)}`);
  const videoBlock = videoAvisos.length
    ? `\n\n🎬 *vídeo:*\n${videoAvisos.map((a) => `⚠️ ${escapeMdInline(a)}`).join('\n')}` : '';
  const summary =
    `📣 *content-ops ${date}* (${modeTag})\n` +
    (lines.length ? lines.join('\n') : '(no API platforms queued)') +
    videoBlock +
    xBlock;
  await notify(summary);

  // Solo se avisa a quien publica si en ESTA pasada se publicó algo de verdad. Volver a lanzar el
  // día (por un cron que repite, por una prueba, por reintentar UNA red) hace que todo salga
  // `[skip] already posted` — el ledger sigue lleno, así que el aviso se compondría igual y esa
  // persona recibiría por segunda vez un encargo que ya hizo. Pasó el 2026-07-29.
  // ...PERO un hilo de X sin entregar sí es trabajo nuevo aunque las redes con API ya estuvieran
  // publicadas: es justo el caso del atasco que se vació el 2026-08-05, donde el día llevaba
  // semanas publicado y el hilo seguía en la cola. Por eso entra en la condición.
  const publicadoAhora = results.some((r) => /^\[ok\]/.test(r.line));
  if (!publicadoAhora && !(xEnCola && !xYaEntregado)) {
    console.log('[skip] aviso a quien publica: nada nuevo en esta pasada (todo ya estaba publicado)');
    return;
  }
  await avisarAQuienPublica(queueDir, item, date, { soloX: !publicadoAhora });
}

/**
 * Mide los vídeos que la cola del día quiere mandar a TikTok y a Instagram Reels.
 *
 * NO decide nada (cada publicador tiene su puerta): solo devuelve las frases de aviso para que un
 * vídeo rechazado aparezca en el mensaje del día en vez de quedarse enterrado en un stdout.
 * Devuelve [] cuando todo está bien o cuando no hay vídeo, así que el mensaje no engorda sin motivo.
 */
function preflightVideos(queueDir) {
  if (gateDisabled(env)) return ['puerta de calidad DESACTIVADA a mano (VIDEO_GATE=off)'];
  const avisos = [];

  const resolveLocal = (p) => {
    if (!p) return null;
    for (const base of [null, CONTENT_OPS_ROOT, resolve(CONTENT_OPS_ROOT, '..')]) {
      const full = base ? resolve(base, p) : p;
      if (existsSync(full)) return full;
    }
    return null;
  };

  const tk = join(queueDir, 'tiktok.md');
  if (existsSync(tk)) {
    const { videoUrl, videoPath } = parseTikTokFile(readFileSync(tk, 'utf8'));
    const target = resolveLocal(videoPath) || videoUrl;
    if (target) {
      const g = gateClip({ pathOrUrl: target, surface: 'tiktok' });
      if (!g.ok) avisos.push(`tiktok NO se envía — ${g.summary}`);
      else avisos.push(...g.warnings.map((w) => `tiktok: ${w}`));
    }
  }

  const ig = join(queueDir, 'instagram.md');
  if (existsSync(ig)) {
    const { meta } = parseQueueFile(readFileSync(ig, 'utf8'));
    if (meta.video_url) {
      const g = gateClip({ pathOrUrl: meta.video_url, surface: 'reels' });
      if (!g.ok) {
        avisos.push(meta.image_url
          ? `instagram cae a la tarjeta (el Reel no cumple) — ${g.summary}`
          : `instagram NO se publica — ${g.summary}`);
      } else avisos.push(...g.warnings.map((w) => `instagram: ${w}`));
    }
  }

  return avisos;
}

/**
 * Aviso a quien hace el trabajo manual (no al operador): qué le toca en TikTok + los enlaces de
 * lo que se ha publicado, para que les eche un vistazo.
 *
 * Se manda desde AQUÍ y no desde cada `post-*.mjs` porque este es el único sitio que ve el día
 * COMPLETO: así recibe UN mensaje con todos los enlaces en vez de uno por red.
 *
 * Tono: seco y al grano, sin saludos ni despedidas (petición del usuario, 2026-07-27).
 * Y la descripción va SIEMPRE en un mensaje SUELTO: en Telegram copiar un mensaje lo copia
 * entero, así que sola se copia de un toque; mezclada con instrucciones, no.
 */
async function avisarAQuienPublica(queueDir, item, date, { soloX = false } = {}) {
  const chatId = env('TIKTOK_PUBLISHER_TELEGRAM_CHAT_ID');
  if (!chatId) return;
  const quien = env('TIKTOK_PUBLISHER_NAME', 'quien publica');

  // En un ensayo NO se avisa a nadie: no se ha publicado nada, así que pedirle a una persona que
  // vaya a la app es mandarla a hacer un trabajo que no existe. Pasó de verdad el 2026-07-27
  // (un DRY_RUN de prueba le repitió a María el aviso de la mañana).
  if (!LIVE || DRY_RUN) {
    console.log(`[dry] aviso a ${quien}: NO enviado (ensayo)`);
    return;
  }

  // La verdad de qué se publicó está en el ledger, no en el stdout de los scripts.
  const publicados = readLedger().filter((e) => e.item === item && e.date === date && e.status === 'posted');

  // Se compone primero SIN descripción para saber si hay algo pendiente de TikTok; si lo hay, se
  // lee la cola y se vuelve a componer con la descripción y la portada ya resueltas.
  let { tiktokPendiente } = composePublisherNotice({ date, publicados });
  let caption = '';
  let portada = null;
  if (tiktokPendiente) {
    const tkFile = join(queueDir, 'tiktok.md');
    if (existsSync(tkFile)) {
      const { description, title, coverUrl } = parseTikTokFile(readFileSync(tkFile, 'utf8'));
      caption = (description || title || '').replace(/\s*\n\s*/g, ' ').trim();
      // Una portada puede venir de tres formas y las TRES se usan: URL pública, ruta relativa a
      // content-ops, y ruta ABSOLUTA (el corto vive en _artifacts/, fuera del repo). La absoluta
      // se colaba por el `join` y salía `content-ops/home/victor/…` → el 2026-07-29 María recibió
      // el aviso y la descripción pero NO la portada.
      if (coverUrl) {
        portada = /^https?:\/\//i.test(coverUrl) || isAbsolute(coverUrl)
          ? coverUrl
          : join(CONTENT_OPS_ROOT, coverUrl);
      }
    }
  }

  // X lo publica María desde el 2026-08-05 (antes se quedaba en la cola esperando al usuario y se
  // acumularon diez hilos). Se entrega tuit a tuit, y SOLO una vez: la entrega se anota en el
  // ledger igual que una publicación, porque si no cada pasada del día se lo volvería a mandar —
  // que es exactamente el fallo del aviso duplicado del 2026-07-29.
  const xFile = join(queueDir, 'x.md');
  const xPendiente = existsSync(xFile) && !alreadyPosted('x', item, date);

  // Con `soloX` no se manda el repaso de enlaces: esas redes se publicaron dias atras y ya se
  // revisaron. Repetirselo seria pedirle que revise algo que ya vio.
  const { texto, hayAlgo } = soloX
    ? { texto: '', hayAlgo: false }
    : composePublisherNotice({ date, publicados, caption, conPortada: Boolean(portada) });
  if (!hayAlgo && !xPendiente) return;

  const r = hayAlgo
    ? await sendToPersonOrFallback({ chatId, quien, text: texto })
    : { sent: true, to: 'persona' };
  // La descripción SOLO si el primer mensaje llegó a ella: si se reencaminó al operador, ya va
  // dentro del reenvío y mandarla aparte al operador sería ruido.
  if (r.to === 'persona' && caption) {
    const c = await sendText(chatId, caption);
    if (!c.sent) console.warn(`[telegram] ⚠️  la descripción NO llegó a ${quien}: ${c.reason}`);
    if (portada) {
      const f = await sendPhoto(chatId, portada, 'Portada del vídeo');
      if (!f.sent) console.warn(`[telegram] ⚠️  la portada NO llegó a ${quien}: ${f.reason}`);
    }
  }

  if (r.to === 'persona' && xPendiente) {
    const x = await entregarHiloX({ chatId, quien, date, file: xFile, titulo: item });
    if (x.entregado) {
      record({ platform: 'x', item, date, status: 'posted', note: `entregado a ${quien} por Telegram: ${x.tuits} tuits${x.conImagen ? ' + imagen' : ''}` });
      console.log(`[ok] x → entregado a ${quien} (${x.tuits} tuits${x.conImagen ? ' + imagen' : ''})`);
    } else {
      console.warn(`[warn] x: NO entregado a ${quien} — ${x.motivo || 'entrega incompleta'}; se reintentará en la próxima pasada`);
    }
  }
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
