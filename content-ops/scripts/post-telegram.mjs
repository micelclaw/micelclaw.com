#!/usr/bin/env node
// post-telegram.mjs — publish a channel post via the Bot API (text, or photo+caption).
// Usage: node scripts/post-telegram.mjs --file queue/2026-07-22/telegram.md [--item slug] [--date YYYY-MM-DD]
import { readFileSync, existsSync, statSync } from 'node:fs';
import { basename, resolve, isAbsolute, join } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { parseQueueFile } from './lib/notify.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}
function resolveImage(p) {
  if (!p) return null;
  for (const base of [null, CONTENT_OPS_ROOT, REPO_ROOT, join(REPO_ROOT, 'public')]) {
    const full = base ? resolve(base, p) : (isAbsolute(p) ? p : null);
    if (full && existsSync(full)) return full;
  }
  return null;
}


/**
 * Parte un texto para un post CON MEDIA.
 *
 * Telegram limita el pie de un medio a 1024 caracteres, mientras que un mensaje de texto suelto
 * llega a 4096. Truncar no vale: el final es donde va SIEMPRE el enlace al post. El 2026-08-06 el
 * canal recibió el mensaje del jueves cortado a mitad de frase y sin enlace — 1682 caracteres
 * recortados a 1024. Y la rama de foto ni siquiera truncaba: Telegram habría rechazado el envío
 * entero.
 *
 * Se corta por el último salto de párrafo que quepa (o por espacio si no hay ninguno razonable) y
 * el resto se manda en un segundo mensaje. Así no se pierde nada y ninguna de las dos partes queda
 * cortada a media frase.
 */
export function partirParaMedia(text, max = 1024) {
  if (text.length <= max) return { caption: text, resto: '' };
  const parrafo = text.lastIndexOf('\n\n', max);
  // Un corte de párrafo demasiado temprano deja un pie ridículo: mejor cortar por palabra.
  const espacio = text.lastIndexOf(' ', max - 1);
  let i = parrafo > max * 0.4 ? parrafo : espacio;
  // Sin párrafo ni espacio utilizables, `lastIndexOf` devuelve -1 y `slice(0, -1)` se traería el
  // texto casi entero — por encima del límite, y Telegram RECHAZA el envío. Corte duro entonces.
  if (i <= 0) i = max;
  return { caption: text.slice(0, i).trim(), resto: text.slice(i).trim() };
}

const PLATFORM = 'telegram';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  if (!text) throw new Error(`empty message in ${args.file}`);
  if (text.length > 4096) console.warn(`[warn] message is ${text.length} chars (>4096)`);

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — see platforms/telegram.md`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  const token = env('TELEGRAM_BOT_TOKEN');
  const chat = env('TELEGRAM_CHAT_ID');
  const image = resolveImage(meta.image);
  const video = resolveImage(meta.video);

  // An animated GIF must go through sendAnimation: sendPhoto publishes it as a STILL frame.
  // Telegram converts the GIF to a soundless MP4 on its side and autoplays it in a loop.
  const animation = image && /\.gif$/i.test(image) ? image : null;
  const still = animation ? null : image;

  // Bot API hard limit: 50 MB per upload. Catch it here instead of eating a 413 mid-post.
  const BOT_API_MAX = 50 * 1024 * 1024;
  for (const [kind, path] of [['video', video], ['animation', animation]]) {
    if (!path) continue;
    const bytes = statSync(path).size;
    if (bytes > BOT_API_MAX) {
      throw new Error(`${kind} is ${(bytes / 1048576).toFixed(1)} MB — Bot API caps uploads at 50 MB`);
    }
  }

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → chat ${chat}\n--- message (${text.length} chars) ---\n${text}` +
      (video ? `\n[video] ${video}` : '') + (animation ? `\n[animation] ${animation}` : '') +
      (still ? `\n[photo] ${still}` : ''));
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  let res, data;
  let caption = text, resto = '';
  if (video) {
    ({ caption, resto } = partirParaMedia(text));
    const form = new FormData();
    form.append('chat_id', chat);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('supports_streaming', 'true');
    form.append('video', new Blob([readFileSync(video)]), basename(video));
    res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: form });
  } else if (animation) {
    ({ caption, resto } = partirParaMedia(text));
    const form = new FormData();
    form.append('chat_id', chat);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('animation', new Blob([readFileSync(animation)], { type: 'image/gif' }), basename(animation));
    res = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, { method: 'POST', body: form });
  } else if (still) {
    // Esta rama NO limitaba el pie: un texto largo con imagen hacía que Telegram rechazara el
    // envío entero. Ahora usa el mismo reparto que las demás.
    ({ caption, resto } = partirParaMedia(text));
    const buf = readFileSync(still);
    const form = new FormData();
    form.append('chat_id', chat);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', new Blob([buf]), basename(still));
    res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  } else {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'Markdown', disable_web_page_preview: false }),
    });
  }
  data = await res.json();
  if (!res.ok || !data.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(data).slice(0, 300) });
    throw new Error(`telegram post failed: ${JSON.stringify(data)}`);
  }
  const msgId = data.result?.message_id;

  // El resto del texto va en un segundo mensaje: con media no cabe, y perderlo significaría
  // perder el enlace al post.
  if (resto) {
    const r2 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: resto, parse_mode: 'Markdown', disable_web_page_preview: false }),
    });
    const d2 = await r2.json();
    console.log(r2.ok && d2.ok
      ? `[ok] telegram → resto del texto en el mensaje ${d2.result?.message_id} (${resto.length} chars)`
      : `[warn] telegram: el resto del texto NO se pudo enviar — ${JSON.stringify(d2).slice(0, 160)}`);
  }

  console.log(`[ok] telegram → message ${msgId} in ${chat}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: String(msgId), note: `chat ${chat}` });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
