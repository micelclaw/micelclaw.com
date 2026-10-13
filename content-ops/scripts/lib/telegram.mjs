// telegram.mjs — envío directo a UN chat concreto (persona), con aviso ruidoso si no llega.
//
// Distinto de notify.mjs: aquél manda el resumen de operaciones al chat privado del OPERADOR
// (NOTIFY_TELEGRAM_CHAT_ID). Esto sirve para avisar a la PERSONA que tiene que hacer un paso
// manual — hoy: quien publica en TikTok, que no es el operador.
//
// REGLA DURA DE TELEGRAM: un bot NO puede iniciar una conversación. Si el destinatario no le ha
// escrito nunca al bot, la API responde 400 "chat not found" y NO hay forma de saltárselo.
// Por eso todos los envíos devuelven el motivo y el llamante puede reencaminar el aviso.
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { env } from './env.mjs';

const api = (method) => `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`;

function describe(data, status) {
  const d = data?.description || '';
  // El motivo más común y el único accionable por el usuario: hay que escribirle al bot primero.
  if (/chat not found/i.test(d)) return 'el destinatario no le ha escrito nunca al bot (Telegram no permite que un bot inicie la conversación)';
  if (/bot was blocked/i.test(d)) return 'el destinatario ha bloqueado al bot';
  if (/deactivated/i.test(d)) return 'la cuenta del destinatario está desactivada';
  return d || `HTTP ${status}`;
}

/** Texto plano a propósito: el formato Markdown de Telegram rompe el mensaje ENTERO con un `*` suelto. */
export async function sendText(chatId, text) {
  if (!env('TELEGRAM_BOT_TOKEN')) return { sent: false, reason: 'falta TELEGRAM_BOT_TOKEN' };
  if (!chatId) return { sent: false, reason: 'no hay chat de destino configurado' };
  try {
    const res = await fetch(api('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: describe(data, res.status) };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `fallo de red: ${String(e)}` };
  }
}

/** Imagen (ruta local o URL https) con pie de foto. Se usa para la PORTADA cuando la cola la declara. */
export async function sendPhoto(chatId, pathOrUrl, caption) {
  if (!env('TELEGRAM_BOT_TOKEN') || !chatId) return { sent: false, reason: 'sin token o sin destino' };
  try {
    let res;
    if (/^https?:\/\//i.test(pathOrUrl)) {
      res = await fetch(api('sendPhoto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: pathOrUrl, caption }),
      });
    } else {
      if (!existsSync(pathOrUrl)) return { sent: false, reason: `no existe el fichero ${pathOrUrl}` };
      const form = new FormData();
      form.append('chat_id', String(chatId));
      if (caption) form.append('caption', caption);
      form.append('photo', new Blob([readFileSync(pathOrUrl)]), basename(pathOrUrl));
      res = await fetch(api('sendPhoto'), { method: 'POST', body: form });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: describe(data, res.status) };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `fallo de red: ${String(e)}` };
  }
}

/**
 * Manda un aviso a una persona y, si no se la puede alcanzar, lo REENCAMINA al operador con el
 * motivo. Un paso manual que nadie recibe es peor que no tener aviso: parece hecho y no lo está.
 * (Lección del 2026-07-27: los avisos llevaban semanas sin enviarse y nada lo decía.)
 */
export async function sendToPersonOrFallback({ chatId, quien, text, foto, fotoCaption }) {
  const r = await sendText(chatId, text);
  if (r.sent) {
    if (foto) {
      const f = await sendPhoto(chatId, foto, fotoCaption);
      if (!f.sent) console.warn(`[telegram] ⚠️  la portada NO llegó a ${quien}: ${f.reason}`);
    }
    console.log(`[telegram] aviso entregado a ${quien}.`);
    return { sent: true, to: 'persona' };
  }

  console.warn(`[telegram] ⚠️  NO se pudo avisar a ${quien}: ${r.reason}`);
  const ops = env('NOTIFY_TELEGRAM_CHAT_ID');
  const reenvio = `⚠️ No se pudo avisar a ${quien}: ${r.reason}.\n\nTe reenvío lo que tenía que recibir:\n\n${text}`;
  const f2 = await sendText(ops, reenvio);
  console.warn(f2.sent
    ? '[telegram] → reenviado al chat de operaciones para que no se pierda.'
    : `[telegram] → tampoco se pudo reenviar al operador: ${f2.reason}`);
  return { sent: f2.sent, to: f2.sent ? 'operador' : 'nadie', reason: r.reason };
}
