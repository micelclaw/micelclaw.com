#!/usr/bin/env node
// post-reddit.mjs — publica en un subreddit PROPIO. Nunca en comunidades ajenas.
//
// Reddit no es un canal de difusión: es una comunidad con sistema inmunitario. `GROWTH.md` §7.2
// prohíbe que el agente publique en subreddits de otros (r/selfhosted está en reacción anti-slop
// desde julio de 2026; un bot ahí se lleva por delante la cuenta Y el dominio). La única
// automatización admisible es la casa propia, igual que el canal de Telegram.
//
// Esa regla NO se deja en un comentario: `assertSubredditPropio` aborta el envío. Un `subreddit:`
// mal escrito en la cola no puede terminar en un baneo.
//
// Uso: node scripts/post-reddit.mjs --file queue/2026-08-10/reddit.md [--item slug] [--date YYYY-MM-DD]
import { readFileSync } from 'node:fs';
import { basename, resolve, isAbsolute } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { parseQueueFile } from './lib/notify.mjs';

const PLATFORM = 'reddit';
const TITULO_MAX = 300;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}

/** Lista blanca de subreddits propios, de `.env.local`. Sin ella no se publica en ningún sitio. */
export function subredditsPropios(getEnv = env) {
  return (getEnv('REDDIT_OWN_SUBREDDITS', '') || '')
    .split(',').map((s) => s.trim().replace(/^\/?r\//i, '')).filter(Boolean);
}

/**
 * La guarda. Devuelve el subreddit a usar o lanza con el motivo.
 * Se exporta para poder probarla sin red (ver `tests/content-ops/_reddit-guard-verify.mjs`).
 */
export function assertSubredditPropio(pedido, propios) {
  if (!propios.length) {
    throw new Error('REDDIT_OWN_SUBREDDITS está vacío — no hay ningún subreddit propio declarado. '
      + 'Publicar en comunidades ajenas está prohibido (GROWTH.md §7.2).');
  }
  const destino = (pedido || propios[0]).trim().replace(/^\/?r\//i, '');
  const vale = propios.some((p) => p.toLowerCase() === destino.toLowerCase());
  if (!vale) {
    throw new Error(`r/${destino} NO es un subreddit propio (propios: ${propios.map((p) => 'r/' + p).join(', ')}). `
      + 'El agente solo publica en la casa propia; en comunidades ajenas publica un humano — GROWTH.md §7.2.');
  }
  return destino;
}

/** Token de una hora. No se guarda: se pide uno por ejecución. */
async function getToken({ id, secret, user, pass, ua }) {
  const body = new URLSearchParams({ grant_type: 'password', username: user, password: pass });
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': ua,
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // El fallo típico aquí es 2FA: con doble factor, `password` tiene que ser "clave:código" y el
    // código caduca en 30 s, así que no sirve para un cron. Ver platforms/reddit.md.
    throw new Error(`no se pudo autenticar (${res.status}): ${data.error || JSON.stringify(data).slice(0, 160)}`);
  }
  return data.access_token;
}

/**
 * Lee la respuesta de /api/submit.
 *
 * TRAMPA de la API: `/api/submit` responde **200 aunque el envío falle** — el error viaja dentro
 * del cuerpo, en `json.errors`. Un publicador que solo mire el código de estado daría por
 * publicado lo que Reddit rechazó. Se exporta para poder probarlo sin red.
 */
export function leerRespuestaSubmit(data) {
  const j = data?.json ?? {};
  const errores = Array.isArray(j.errors) ? j.errors : [];
  if (errores.length) {
    // Cada error es [CODIGO, explicación, campo].
    return { ok: false, motivo: errores.map((e) => (Array.isArray(e) ? e.slice(0, 2).join(': ') : String(e))).join(' · ') };
  }
  const url = j.data?.url || null;
  const id = j.data?.id || j.data?.name || null;
  if (!url && !id) return { ok: false, motivo: 'Reddit no devolvió ni URL ni id del post' };
  return { ok: true, url, id };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  const title = (meta.title || '').trim();
  if (!title) throw new Error(`falta la línea "title:" en ${args.file} — Reddit no lo deduce del cuerpo`);
  if (title.length > TITULO_MAX) throw new Error(`el título tiene ${title.length} caracteres (máx ${TITULO_MAX})`);
  if (!text && !meta.link) throw new Error(`${args.file} no tiene ni cuerpo ni "link:"`);

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: faltan ${missing.join(', ')} — ver platforms/reddit.md`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  let sr;
  try {
    sr = assertSubredditPropio(meta.subreddit, subredditsPropios());
  } catch (e) {
    // Se salta con el motivo, no se revienta el día entero: las demás redes deben poder salir.
    console.log(`[skip] ${PLATFORM}: ${e.message}`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: e.message.slice(0, 200) });
    return;
  }

  const kind = meta.link ? 'link' : 'self';
  const ua = `node:micelclaw-content-ops:1.0 (by /u/${env('REDDIT_USERNAME')})`;

  if (!shouldPublish() || DRY_RUN) {
    console.log(`[dry] ${PLATFORM}/${item}/${date} → r/${sr} (${kind})`);
    console.log(`--- ${title} ---`);
    console.log(meta.link ? `[link] ${meta.link}` : text.slice(0, 400));
    record({ platform: PLATFORM, item, date, status: 'dry', note: `DRY_RUN r/${sr}` });
    return;
  }

  const token = await getToken({
    id: env('REDDIT_CLIENT_ID'), secret: env('REDDIT_CLIENT_SECRET'),
    user: env('REDDIT_USERNAME'), pass: env('REDDIT_PASSWORD'), ua,
  });

  const form = new URLSearchParams({ sr, kind, title, api_type: 'json', resubmit: 'true' });
  if (kind === 'link') form.set('url', meta.link);
  else form.set('text', text);

  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Reddit devuelve 403 a los User-Agent genéricos — comprobado el 2026-08-05.
      'User-Agent': ua,
    },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`submit falló (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);

  const r = leerRespuestaSubmit(data);
  if (!r.ok) {
    console.log(`[error] ${PLATFORM}: Reddit rechazó el post — ${r.motivo}`);
    record({ platform: PLATFORM, item, date, status: 'error', note: r.motivo.slice(0, 200) });
    process.exitCode = 1;
    return;
  }

  record({ platform: PLATFORM, item, date, status: 'posted', url: r.url, id: r.id, note: `r/${sr}` });
  console.log(`[ok] ${PLATFORM} → ${r.url || r.id}`);
}

// Solo corre si se invoca como script; importarlo (los tests) no publica nada.
if (process.argv[1] && process.argv[1].endsWith('post-reddit.mjs')) {
  main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
}
