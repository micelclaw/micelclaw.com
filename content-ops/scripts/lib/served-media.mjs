// served-media.mjs — comprueba que una URL sirve de verdad el medio que Meta espera.
//
// Por qué existe: Instagram no sube ficheros locales, se los DESCARGA. Si la URL responde 200 con
// el HTML del sitio —porque el despliegue aún no había aterrizado cuando alguien la pidió y el CDN
// cacheó esa respuesta— Meta contesta "The image format is not supported", que suena a que la
// imagen está corrupta cuando la imagen está perfecta. Pasó el 2026-07-29, el 2026-07-31 y el
// 2026-08-03.
//
// SIEMPRE se pide con clave de caché nueva, no solo cuando falla la comprobación. La versión
// anterior validaba la URL limpia desde NUESTRA máquina y, si servía la imagen, se la pasaba a Meta
// tal cual — pero Meta descarga desde SUS nodos de borde, que pueden seguir con el HTML envenenado
// aunque el nuestro ya esté sano. Eso es lo que pasó el 2026-08-03: `curl` daba image/jpeg y Meta
// seguía rechazándola. Una clave nueva fuerza entrada de caché nueva en TODOS los bordes.
//
// Vive aquí, y no dentro de post-instagram.mjs, porque desde el 2026-08-10 hay DOS consumidores
// (feed y stories) y una copia por consumidor acaba divergiendo — el test ya llevaba una tercera.

/**
 * @param {string} url        URL pública del medio
 * @param {'image'|'video'} kind
 * @param {(msg: string) => void} [log]  para que el llamante ponga su propio prefijo
 * @returns {Promise<string|null>} la URL a usar (con clave de caché), o null si no sirve el medio
 */
export async function resolveServedMedia(url, kind, log = console.log) {
  const mira = async (u) => {
    try {
      const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      return { ok: r.ok, type: (r.headers.get('content-type') || '').toLowerCase() };
    } catch (e) { return { ok: false, type: `error: ${String(e).slice(0, 80)}` }; }
  };
  const vale = (t) => t.startsWith(kind + '/');

  const busted = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
  const r = await mira(busted);
  if (r.ok && vale(r.type)) return busted;

  log(`${url} sirve "${r.type || '?'}" en vez de ${kind}/* con caché nueva — ¿ha aterrizado el despliegue?`);
  return null;
}
