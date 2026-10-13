// publisher-notice.mjs — compone el aviso para QUIEN hace el trabajo manual de publicación.
//
// Función PURA (sin red ni disco) para poder probarla: la de verdad se envía desde
// `publish-day.mjs`. Reglas de estilo, pedidas por el usuario el 2026-07-27:
//
//   · SECO. Ni saludos, ni "espero que", ni despedidas. Va al grano.
//   · La DESCRIPCIÓN va en un mensaje APARTE, nunca dentro del texto de instrucciones:
//     en Telegram copiar un mensaje lo copia entero, así que sola se copia de un toque.
//   · Solo se mencionan las redes que de verdad se publicaron (el ledger manda, no la cola).

/** Redes cuyo enlace se manda para que les eche un vistazo. */
export const REDES_A_REVISAR = ['bluesky', 'mastodon', 'facebook', 'instagram'];

/**
 * @param {object} a
 * @param {string} a.date               fecha del lote (YYYY-MM-DD)
 * @param {Array<{platform:string,url?:string,note?:string}>} a.publicados  filas 'posted' del ledger
 * @param {string} [a.caption]          descripción a pegar en TikTok (si hay algo pendiente)
 * @param {boolean} [a.conPortada]      si se va a enviar una imagen de portada detrás
 * @returns {{texto:string, hayAlgo:boolean}}
 */
export function composePublisherNotice({ date, publicados = [], caption = '', conPortada = false }) {
  const url = (p) => publicados.find((e) => e.platform === p)?.url;
  const enlaces = REDES_A_REVISAR
    .filter((p) => publicados.some((e) => e.platform === p))
    .map((p) => `• ${p}: ${url(p) || '(publicado, sin enlace)'}`);

  // Solo el buzón de TikTok exige trabajo manual. Un DIRECT_POST ya publicado no necesita a nadie,
  // así que no se le da la lata: se distingue por la nota que dejó el publicador en el ledger.
  const tiktok = publicados.find((e) => e.platform === 'tiktok');
  const tiktokPendiente = Boolean(tiktok && /inbox/i.test(tiktok.note || ''));

  const bloques = [];
  if (tiktokPendiente) {
    bloques.push([
      `TikTok ${date} — pendiente de ti.`,
      'App › Inbox (notificaciones) › toca el vídeo. No está en Borradores.',
      caption ? 'Descripción: en el mensaje siguiente.' : 'Sin descripción en la cola.',
      conPortada ? 'Portada: la imagen que va detrás.' : 'Portada: elige fotograma en la app.',
    ].join('\n'));
  }
  if (enlaces.length) bloques.push([`Publicado ${date}, para revisar:`, ...enlaces].join('\n'));

  return { texto: bloques.join('\n\n'), hayAlgo: bloques.length > 0, tiktokPendiente };
}
