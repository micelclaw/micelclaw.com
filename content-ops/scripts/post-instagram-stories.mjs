#!/usr/bin/env node
// post-instagram-stories.mjs — publica una SECUENCIA de stories de Instagram (Graph API).
//
// Por qué es un script aparte y no una rama de post-instagram.mjs:
//   · Son N publicaciones, no una — y el ORDEN importa (es un recorrido por el módulo).
//   · El ledger tiene que ser por fotograma: si el cuarto falla, un relanzamiento no puede
//     volver a publicar los tres primeros.
//   · Los DESTACADOS no tienen API. Ninguna. No hay endpoint para crear uno ni para meterle una
//     story, así que el paso final es humano y hay que avisar de él — y con prisa, porque la story
//     se borra sola a las 24 h y con ella la oportunidad de destacarla.
//
// Formato del fichero de cola (`queue/<fecha>/instagram-stories.md`):
//
//     highlight: Drive
//
//     frame_url: https://micelclaw.com/social/2026-08-10/story-drive-1.jpg
//     alt: portada del módulo
//     frame_url: https://micelclaw.com/social/2026-08-10/story-drive-2.jpg
//
// Cada `frame_url:` abre un fotograma nuevo; `alt:` se pega al que esté abierto. El resto del
// texto son notas para quien revisa y NO se publica (una story no lleva pie).
//
// Uso: node scripts/post-instagram-stories.mjs --file queue/2026-08-10/instagram-stories.md --item unified-drive --date 2026-08-10
import { readFileSync } from 'node:fs';
import { basename, resolve, isAbsolute } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, LIVE, CONTENT_OPS_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { resolveServedMedia } from './lib/served-media.mjs';
import { sendToPersonOrFallback } from './lib/telegram.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PLATFORM = 'instagram_stories';

/**
 * Parte el fichero de cola en fotogramas ordenados.
 *
 * Función PURA para poder probarla sin red. Devuelve `{ highlight, frames }`, donde cada frame es
 * `{ url, alt }`. Un fichero sin ningún `frame_url:` devuelve lista vacía — el llamante decide.
 */
export function parseStoriesFile(text) {
  const frames = [];
  let highlight = '';
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    const mh = line.match(/^highlight:\s*(.+)$/i);
    if (mh) { highlight = mh[1].trim(); continue; }
    const mf = line.match(/^frame_url:\s*(\S+)/i);
    if (mf) { frames.push({ url: mf[1], alt: '' }); continue; }
    const ma = line.match(/^alt:\s*(.+)$/i);
    // Un `alt:` antes del primer `frame_url:` no tiene dueño: se ignora en vez de inventarle uno.
    if (ma && frames.length) frames[frames.length - 1].alt = ma[1].trim();
  }
  return { highlight, frames };
}

/** Clave de ledger por fotograma: el item lleva el índice para que el relanzamiento sea fino. */
export function frameItem(item, n) {
  return `${item}#f${n}`;
}

/** El recado para quien tiene que tocar "Destacar" en el móvil. Sin jerga y con el plazo. */
export function textoDestacado({ highlight, publicados, date }) {
  return [
    `Instagram ${date} — ${publicados} ${publicados === 1 ? 'story publicada' : 'stories publicadas'}.`,
    '',
    'Falta un paso que no se puede automatizar (Instagram no tiene API de destacados):',
    'abre la story, toca "Destacar" y guárdala en' + (highlight ? ` "${highlight}"` : ' su carpeta') + '.',
    '',
    'Tiene que ser hoy: a las 24 h la story desaparece y ya no se puede destacar.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { highlight, frames } = parseStoriesFile(readFileSync(filePath, 'utf8'));
  if (!frames.length) {
    console.log(`[skip] ${PLATFORM}: el fichero no declara ningún frame_url:`);
    return;
  }

  const token = env('INSTAGRAM_ACCESS_TOKEN');
  const igId = env('INSTAGRAM_USER_ID');
  if (!token || !igId) {
    console.log(`[skip] ${PLATFORM}: faltan INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID`);
    return;
  }
  const v = env('META_GRAPH_VERSION', 'v21.0');

  let publicados = 0;
  for (let i = 0; i < frames.length; i++) {
    const n = i + 1;
    const marca = frameItem(item, n);
    const etiqueta = `${PLATFORM} ${n}/${frames.length}`;

    if (alreadyPosted(PLATFORM, marca, date)) {
      console.log(`[skip] ${etiqueta}: ya publicada`);
      publicados++;
      continue;
    }

    // La misma guarda del feed: que la URL sirva imagen de verdad ANTES de pedirle nada a Meta.
    const servida = await resolveServedMedia(frames[i].url, 'image', (m) => console.log(`[skip] ${etiqueta}: ${m}`));
    if (!servida) {
      record({ platform: PLATFORM, item: marca, date, status: 'skipped', note: 'frame_url no sirve imagen' });
      // Se corta la secuencia: publicar el 5 sin el 4 deja un recorrido que no se entiende.
      console.log(`[stop] ${PLATFORM}: corto la secuencia en el fotograma ${n} para no dejarla coja`);
      break;
    }

    if (!shouldPublish()) {
      console.log(`[dry] ${etiqueta} → ig ${igId}\n[image_url] ${servida}`);
      record({ platform: PLATFORM, item: marca, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
      publicados++;
      continue;
    }

    const cres = await fetch(`https://graph.facebook.com/${v}/${igId}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'STORIES', image_url: servida, access_token: token }),
    });
    const cdata = await cres.json();
    if (!cres.ok) {
      record({ platform: PLATFORM, item: marca, date, status: 'error', note: JSON.stringify(cdata).slice(0, 300) });
      throw new Error(`ig stories container failed (frame ${n}): ${JSON.stringify(cdata)}`);
    }
    await sleep(3000); // que Meta se descargue la imagen

    const pres = await fetch(`https://graph.facebook.com/${v}/${igId}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: cdata.id, access_token: token }),
    });
    const pdata = await pres.json();
    if (!pres.ok) {
      record({ platform: PLATFORM, item: marca, date, status: 'error', note: JSON.stringify(pdata).slice(0, 300) });
      throw new Error(`ig stories publish failed (frame ${n}): ${JSON.stringify(pdata)}`);
    }

    console.log(`[ok] ${etiqueta} → media ${pdata.id}`);
    record({ platform: PLATFORM, item: marca, date, status: 'posted', id: pdata.id });
    publicados++;
    // Las stories se ordenan por hora de publicación; un respiro evita empates de segundo.
    if (n < frames.length) await sleep(2000);
  }

  // El aviso del destacado solo tiene sentido si algo salió de verdad HOY.
  if (!publicados) return;
  if (!LIVE || DRY_RUN) {
    console.log(`[dry] aviso de destacado: NO enviado (ensayo)`);
    return;
  }
  const chatId = env('TIKTOK_PUBLISHER_TELEGRAM_CHAT_ID');
  const quien = env('TIKTOK_PUBLISHER_NAME', 'quien publica');
  if (!chatId) { console.log('[warn] sin chat para avisar del destacado'); return; }
  await sendToPersonOrFallback({ chatId, quien, text: textoDestacado({ highlight, publicados, date }) });
}

// Solo corre como CLI: importarlo (los tests) no debe publicar nada.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
}
