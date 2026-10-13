// notify.mjs — send the daily/weekly ops summary. Telegram if configured, else console.
import { env } from './env.mjs';

/**
 * Escapa lo que Telegram interpreta como Markdown, para TEXTO DINÁMICO que se inserta en un
 * mensaje con formato (URLs, ids, títulos). No usar sobre el mensaje entero: se comería los
 * `*negrita*` que ponemos a propósito, ni dentro de un bloque ``` (ahí no se interpreta nada).
 *
 * Por qué existe: el id de un post de Facebook es SIEMPRE `<página>_<post>`. Ese único `_` abre
 * una cursiva que nunca cierra y Telegram rechaza el mensaje ENTERO con 400 — o sea que el
 * reintento en texto plano saltaba en CADA publicación con Facebook y el aviso llegaba siempre
 * sin formato. Verificado el 2026-07-28 (byte 166 = el id de Facebook).
 */
export function escapeMdInline(text = '') {
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

export async function notify(message) {
  // Always print (visible in cron logs).
  console.log('\n[notify]\n' + message + '\n');

  const token = env('TELEGRAM_BOT_TOKEN');
  // Ops notices go ONLY to a private chat — never fall back to the public content channel.
  const chat = env('NOTIFY_TELEGRAM_CHAT_ID');

  // El resultado se AVISA aquí y no se deja al llamante (2026-07-27). Los tres callers de
  // publish-day hacían `await notify(...)` tirando el retorno, así que un aviso no entregado
  // era INVISIBLE: el `console.log` de arriba parece un envío. Consecuencia real: durante
  // semanas no llegó ni un aviso porque faltaba NOTIFY_TELEGRAM_CHAT_ID, y nadie lo supo.
  if (!token || !chat) {
    const falta = [!token && 'TELEGRAM_BOT_TOKEN', !chat && 'NOTIFY_TELEGRAM_CHAT_ID'].filter(Boolean).join(' + ');
    console.warn(
      `[notify] ⚠️  NO ENVIADO por Telegram: falta ${falta} en content-ops/.env.local.\n` +
      '          El aviso de arriba solo se ha impreso aquí. Para conseguir el id del chat privado:\n' +
      '          escríbele algo al bot en Telegram y luego lee\n' +
      '          https://api.telegram.org/bot<TOKEN>/getUpdates → result[].message.chat.id\n' +
      '          OJO: NO uses TELEGRAM_CHAT_ID (ése es el canal PÚBLICO de contenido).',
    );
    return { sent: false, via: 'console', missing: falta };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: message, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Causa típica: `parse_mode: Markdown` y el texto trae un `*`/`_`/`[` sin cerrar →
      // Telegram rechaza el mensaje ENTERO con 400. Se reintenta en texto plano para no
      // perder el aviso, que es lo único que importa.
      console.warn(`[notify] ⚠️  Telegram rechazó el mensaje (HTTP ${res.status}): ${data?.description || JSON.stringify(data)}`);
      const plano = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: message, disable_web_page_preview: true }),
      });
      if (plano.ok) {
        console.warn('[notify] → reenviado SIN formato Markdown: entregado.');
        return { sent: true, via: 'telegram', degraded: 'plain-text' };
      }
      const d2 = await plano.json().catch(() => ({}));
      console.warn(`[notify] ⚠️  tampoco se entregó en texto plano: ${d2?.description || JSON.stringify(d2)}`);
      return { sent: false, via: 'telegram', error: data };
    }
    return { sent: true, via: 'telegram', ok: true };
  } catch (e) {
    console.warn(`[notify] ⚠️  NO ENVIADO por Telegram (fallo de red): ${String(e)}`);
    return { sent: false, via: 'telegram', error: String(e) };
  }
}

// Small helper: read the text body + optional metadata lines from a queue .md file.
// Keys: image/alt/image_url (still pictures), video/video_url (native video — Reels, Shorts,
// Telegram video, TikTok), link/link_title/link_desc (link cards).
export function parseQueueFile(text) {
  const lines = text.split('\n');
  const meta = {};
  const body = [];
  for (const line of lines) {
    // `title` y `subreddit` los añadió Reddit (2026-08-05): a diferencia del resto de redes,
    // Reddit exige un titular aparte y no lo deduce del cuerpo.
    const m = line.match(/^(image|alt|image_url|video|video_url|link|link_title|link_desc|title|subreddit):\s*(.+)$/i);
    if (m) {
      meta[m[1].toLowerCase()] = m[2].trim();
    } else {
      body.push(line);
    }
  }
  return { text: body.join('\n').trim(), meta };
}
