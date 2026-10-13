// x-handoff.mjs — entrega un hilo de X a la persona que publica (María), por Telegram.
//
// Por qué existe: X no tiene API en este sistema (decisión de `platforms/x.md`: sin credenciales,
// sin coste, sin riesgo de baneo). Hasta el 2026-08-05 los hilos se quedaban en `queue/<fecha>/x.md`
// esperando a que el usuario los copiase a mano, y se acumularon diez. Desde esa fecha los publica
// María, avisada por Telegram como ya se hacía con TikTok.
//
// Decisión de formato: CADA TUIT VA EN SU PROPIO MENSAJE. En Telegram, copiar un mensaje lo copia
// entero, así que un mensaje por tuit se pega de un toque en X. Mandar el hilo en un solo bloque
// obliga a seleccionar a mano trozo por trozo, que es justo el trabajo que se le quiere ahorrar.
// (Misma razón por la que la descripción de TikTok va aparte — ver `publisher-notice.mjs`.)

import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { CONTENT_OPS_ROOT } from './env.mjs';
import { sendText, sendPhoto } from './telegram.mjs';

/**
 * Parte el fichero de X en los tuits que lo componen.
 *
 * El formato de la cola es `1/ …`, `2/ …` con línea en blanco entre medias, y al final líneas
 * sueltas de metadatos (`image:`, `alt:`…). Se devuelven los tuits SIN su numeración: el numerito
 * es para nosotros, no para publicarlo — X ya muestra el hilo enlazado.
 *
 * @returns {{tuits: string[], image: string|null, alt: string|null}}
 */
export function parseXFile(text) {
  const meta = {};
  const cuerpo = [];
  for (const linea of text.split('\n')) {
    const m = linea.match(/^(image|image_url|alt):\s*(.+)$/);
    if (m) { meta[m[1]] = m[2].trim(); continue; }
    cuerpo.push(linea);
  }

  // Cada tuit empieza por `N/`. Se acumula hasta el siguiente marcador.
  const tuits = [];
  let actual = null;
  for (const linea of cuerpo.join('\n').split('\n')) {
    if (/^\d+\/\s?/.test(linea)) {
      if (actual !== null) tuits.push(actual.trim());
      actual = linea.replace(/^\d+\/\s?/, '');
    } else if (actual !== null) {
      actual += '\n' + linea;
    }
  }
  if (actual !== null) tuits.push(actual.trim());

  return {
    tuits: tuits.filter(Boolean),
    image: meta.image_url || meta.image || null,
    alt: meta.alt || null,
  };
}

/** Resuelve la imagen: URL pública, ruta absoluta o ruta relativa a content-ops. Las tres se usan. */
export function resolveXImage(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image) || isAbsolute(image)) return image;
  const p = join(CONTENT_OPS_ROOT, image);
  return existsSync(p) ? p : null;
}

/**
 * Manda un hilo a quien publica. Devuelve qué se entregó para poder anotarlo en el ledger:
 * un hilo que no llegó NO puede quedar registrado como entregado.
 *
 * @returns {Promise<{entregado:boolean, tuits:number, conImagen:boolean, motivo?:string}>}
 */
export async function entregarHiloX({ chatId, quien = 'quien publica', date, file, titulo }) {
  if (!existsSync(file)) return { entregado: false, tuits: 0, conImagen: false, motivo: 'no hay x.md' };
  const { tuits, image, alt } = parseXFile(readFileSync(file, 'utf8'));
  if (!tuits.length) return { entregado: false, tuits: 0, conImagen: false, motivo: 'el fichero no tiene tuits' };

  const cabecera = [
    `X ${date} — pendiente de ti.`,
    `${tuits.length} tuits en hilo, cada uno en su mensaje. Se copian de un toque.`,
    titulo ? `Tema: ${titulo}` : null,
    image ? 'La imagen va en el ÚLTIMO mensaje: adjúntala al primer tuit.' : 'Sin imagen.',
  ].filter(Boolean).join('\n');

  const c = await sendText(chatId, cabecera);
  if (!c.sent) return { entregado: false, tuits: 0, conImagen: false, motivo: c.reason };

  let enviados = 0;
  for (const t of tuits) {
    const r = await sendText(chatId, t);
    if (r.sent) enviados++;
    else console.warn(`[telegram] ⚠️  un tuit NO llegó a ${quien}: ${r.reason}`);
  }

  let conImagen = false;
  const ruta = resolveXImage(image);
  if (ruta) {
    const f = await sendPhoto(chatId, ruta, `Imagen del hilo de X · ${date}`);
    conImagen = f.sent;
    if (!f.sent) console.warn(`[telegram] ⚠️  la imagen NO llegó a ${quien}: ${f.reason}`);
  }

  // Se considera entregado solo si llegaron TODOS los tuits: media entrega es peor que ninguna,
  // porque publica un hilo cortado y nadie se entera.
  return { entregado: enviados === tuits.length, tuits: enviados, conImagen };
}
