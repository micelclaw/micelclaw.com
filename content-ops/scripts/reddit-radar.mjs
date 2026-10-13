#!/usr/bin/env node
// reddit-radar.mjs — busca hilos de Reddit donde Víctor pueda aportar de verdad, y deja una lista
// corta para que ÉL comente. No publica nada: `GROWTH.md` §7.2 prohíbe que el agente escriba en
// comunidades ajenas, y esto no lo cambia.
//
// POR QUÉ RSS Y NO LA API: Reddit cerró el alta self-service de aplicaciones (comprobado el
// 2026-08-05, ver `platforms/reddit.md`). Los feeds `/new/.rss` siguen siendo públicos y traen
// título, autor, fecha y CUERPO COMPLETO de los 25 posts más recientes — suficiente para elegir.
//
// RITMO: el RSS está limitado duro. Medido el 2026-08-05: peticiones seguidas → 429, y con 20 s de
// espaciado TAMBIÉN salta a veces. Por eso hay pausa larga entre subreddits, reintento con espera
// creciente, y CACHÉ en disco: relanzar el radar el mismo día no vuelve a pedir nada.
//
// Uso:
//   node scripts/reddit-radar.mjs                 # usa caché si es de hoy
//   node scripts/reddit-radar.mjs --refetch       # fuerza descarga
//   node scripts/reddit-radar.mjs --horas 12      # ventana de antigüedad (por defecto 8)
//   node scripts/reddit-radar.mjs --nivel 1       # solo los subs tranquilos (por defecto 1+2)
//   node scripts/reddit-radar.mjs --nivel 3       # los grandes: solo cuando la cuenta aguante
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_OPS_ROOT } from './lib/env.mjs';

const CACHE = '/home/victor/Projects/_artifacts/scratch/reddit-cache';
// El UA con forma de bot de API (`node:app:version (by /u/…)`) recibe **403** en los feeds —
// medido el 2026-08-05. Ese formato es el que pide la API autenticada, no el RSS público: aquí
// hay que identificarse como un lector de feeds, que es exactamente lo que hacemos.
const UA = process.env.REDDIT_RSS_UA
  || 'Mozilla/5.0 (compatible; micelclaw-radar/1.0; +https://micelclaw.com) feedparser/6.0';

// A DÓNDE APUNTAR, y por qué en este orden.
//
// El 2026-08-05 r/selfhosted retiró el primer comentario de la cuenta a los 10 minutos: no era
// shadowban (comprobado), era el filtro de cuenta nueva. Los subs grandes son los que más filtran,
// así que se empieza por los tranquilos y se sube cuando la cuenta aguante.
//
// El ritmo de publicación se MIDIÓ ese día (25 posts más recientes / horas que abarcan). No hay
// forma de leer suscriptores sin API, pero el ritmo dice lo que importa: cuánta competencia tiene
// un comentario por ser visto.
const NIVELES = {
  // Arranque: poca competencia y temas donde Víctor responde por haberlos construido.
  1: ['docker', 'Nextcloud', 'pihole', 'truenas', 'HomeServer', 'Proxmox'],
  // Cuando los comentarios del nivel 1 sobrevivan.
  2: ['ollama', 'immich', 'jellyfin'],
  // Los grandes. Filtran duro a cuentas nuevas; son el objetivo del mes 2 (`GROWTH.md` §4).
  3: ['selfhosted', 'homelab', 'LocalLLaMA'],
};
// Ritmo medido el 2026-08-05, posts/día: docker 2 · Nextcloud 3 · pihole 3 · truenas 6 ·
// HomeServer 8 · Proxmox 8 · ollama 15 · immich 18 · jellyfin 23.
const SUBS = [...NIVELES[1], ...NIVELES[2]];

// Temas en los que Víctor puede responder de verdad, por haberlos construido. Un comentario útil
// en uno de estos vale más que diez genéricos — y es lo único que da karma de forma sostenible.
const COMPETENCIA = [
  ['docker', 3], ['compose', 3], ['proxy', 3], ['reverse proxy', 4], ['caddy', 4], ['nginx', 3],
  ['traefik', 3], ['dns', 3], ['vpn', 3], ['wireguard', 3], ['tailscale', 2], ['cloudflare', 2],
  ['postgres', 4], ['database', 2], ['backup', 4], ['restore', 3], ['zfs', 4], ['raid', 3],
  ['nas', 3], ['synology', 3], ['truenas', 3], ['unraid', 2], ['smb', 3], ['nfs', 3],
  ['ollama', 4], ['llm', 3], ['local model', 4], ['gpu', 3], ['vram', 3], ['whisper', 3],
  ['immich', 2], ['nextcloud', 2], ['jellyfin', 2], ['paperless', 3], ['n8n', 4],
  ['certificate', 3], ['https', 3], ['ssl', 3], ['tls', 3], ['systemd', 3], ['wsl', 4],
  ['self-host', 2], ['selfhost', 2], ['homelab', 1], ['agent', 3], ['mcp', 4], ['rag', 3],
  ['proxmox', 4], ['pihole', 3], ['lxc', 3], ['container', 2], ['vm', 2], ['adguard', 2],
];

// Un post que NO pide ayuda no es una oportunidad: comentar en un "look at my rack" no aporta.
const NO_PIDE_AYUDA = /\b(my (setup|rack|homelab|server|build)|showcase|finally|just finished|i (built|made)|introducing|releas(e|ed|ing)|announcing|is complete|completed|v\d+\.\d+|giveaway|meme|update:)\b/i;
const PIDE_AYUDA = /\?|\b(how (do|to|can|would|should)|what('s| is| are| would)|any(one|body) (know|have|else|using)|help|advice|recommend|suggestions?|which|why (does|is|do|are)|struggling|stuck|issues?|problems?|error|troubleshoot|can'?t get)\b/i;

// Preguntas de charla: son preguntas de verdad, pero no se responden con conocimiento — no
// construyen reputación de "este sabe". Se descartan aunque puntúen por frescura.
const CHARLA = /\b(nicknames?|name your|what do you (call|name)|favourite|favorite|show me|rate my|opinions? on|thoughts\?|hot take|unpopular)\b/i;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), n = argv[i + 1];
    if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; }
  }
  return a;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Descarga un feed respetando el límite: reintenta con espera creciente ante 429. */
async function traerFeed(sub, { intentos = 4 } = {}) {
  for (let i = 0; i < intentos; i++) {
    // El `Accept` explícito importa: sin él node recibe 429/403 donde curl pasa — medido el
    // 2026-08-05 comparando las dos rutas contra el mismo feed.
    const res = await fetch(`https://www.reddit.com/r/${sub}/new/.rss`, {
      headers: { 'User-Agent': UA, Accept: 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    if (res.ok) return res.text();
    if (res.status !== 429) throw new Error(`r/${sub}: HTTP ${res.status}`);
    const espera = 30_000 * (i + 1);
    console.log(`  [429] r/${sub} limitado — espero ${espera / 1000}s (intento ${i + 1}/${intentos})`);
    await dormir(espera);
  }
  return null;
}

/** Atom → objetos. Se exporta para poder probarlo sin red. */
export function parseFeed(xml, sub) {
  // El contenido va escapado DOS veces: el XML escapa el HTML, y el HTML ya traía entidades.
  // Un `&` del texto original llega como `&amp;amp;`, así que una sola pasada deja `&amp;`.
  const decodificar = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const limpiar = (s) => decodificar(s.replace(/<!\[CDATA\[|\]\]>/g, ''));
  const out = [];
  for (const [, e] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const g = (re) => (e.match(re) || [])[1] || '';
    const cuerpoHtml = limpiar(g(/<content type="html">([\s\S]*?)<\/content>/));
    // Las CAPTURAS del cuerpo, que muchas veces llevan la mitad de la información (config, logs,
    // mensajes de error). El 2026-08-05 se redactó un comentario cuya tesis principal era FALSA
    // por no haberlas mirado: el usuario lo cazó. Se extraen aquí para que nadie pueda ignorarlas.
    // Se descarta la miniatura del post (`width=140`), que no es contenido.
    const imagenes = [...new Set(
      (cuerpoHtml.match(/https?:\/\/(?:preview|i)\.redd\.it\/[^\s"'<>]+/g) || [])
        .filter((u) => !u.includes('width=140')),
    )];
    out.push({
      sub,
      imagenes,
      titulo: limpiar(g(/<title>([\s\S]*?)<\/title>/)).trim(),
      autor: g(/<name>([\s\S]*?)<\/name>/).trim(),
      fecha: g(/<published>([\s\S]*?)<\/published>/).trim() || g(/<updated>([\s\S]*?)<\/updated>/).trim(),
      link: g(/<link href="([^"]+)"/),
      cuerpo: decodificar(cuerpoHtml.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

/**
 * Puntúa un hilo. Dos ejes, y el primero pesa más de lo que parece:
 *
 *  1. FRESCURA. En Reddit el karma se lo lleva quien llega pronto: un comentario bueno en un hilo
 *     de 6 horas con 200 respuestas queda enterrado. Uno correcto a los 30 minutos se queda arriba.
 *  2. COMPETENCIA. Que sea algo que Víctor sepa responder por haberlo construido.
 *
 * Se exporta para poder probarlo.
 */
export function puntuar(post, ahora = Date.now()) {
  const edadH = (ahora - new Date(post.fecha).getTime()) / 3.6e6;
  const texto = `${post.titulo} ${post.cuerpo}`.toLowerCase();

  if (CHARLA.test(post.titulo)) {
    return { puntos: 0, edadH, motivo: 'pregunta de charla, no de conocimiento', temas: [] };
  }
  if (NO_PIDE_AYUDA.test(post.titulo)) {
    return { puntos: 0, edadH, motivo: 'no pide ayuda (showcase/anuncio)', temas: [] };
  }
  // La petición tiene que estar en el TÍTULO. Un showcase suele traer un "?" de pasada en el
  // cuerpo, y eso colaba "4 node cluster is complete!" como si preguntara algo.
  if (!PIDE_AYUDA.test(post.titulo)) {
    return { puntos: 0, edadH, motivo: 'el título no pide nada', temas: [] };
  }

  // Por PALABRA COMPLETA, no por subcadena: `rag` casaba dentro de "sto(rag)e" y metía ruido
  // en la mitad de los candidatos. Medido el 2026-08-05.
  const temas = COMPETENCIA.filter(([k]) =>
    new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?([^a-z0-9]|$)`, 'i').test(texto));
  if (!temas.length) return { puntos: 0, edadH, motivo: 'fuera de lo que sabemos responder', temas: [] };

  const pTema = Math.min(10, temas.reduce((s, [, p]) => s + p, 0));
  // Frescura: 10 puntos recién salido, 0 a partir de la ventana. Lineal y sin misterio.
  const pFrescura = Math.max(0, 10 - edadH * 1.5);
  // Un cuerpo con detalle es una pregunta contestable; dos líneas suelen ser irrespondibles.
  const pDetalle = post.cuerpo.length > 300 ? 2 : post.cuerpo.length > 120 ? 1 : 0;

  return {
    puntos: Math.round((pTema + pFrescura + pDetalle) * 10) / 10,
    edadH, temas: temas.map(([k]) => k), motivo: null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ventanaH = Number(args.horas || 8);
  const subs = args.nivel ? (NIVELES[String(args.nivel)] || []) : SUBS;
  if (!subs.length) throw new Error(`nivel desconocido: ${args.nivel} (hay 1, 2 y 3)`);
  const hoy = new Date().toISOString().slice(0, 10);
  mkdirSync(CACHE, { recursive: true });

  const posts = [];
  for (const sub of subs) {
    const f = join(CACHE, `${hoy}-${sub}.rss`);
    let xml = null;
    if (!args.refetch && existsSync(f) && (Date.now() - statSync(f).mtimeMs) < 6 * 3.6e6) {
      xml = readFileSync(f, 'utf8');
      console.log(`  [caché] r/${sub}`);
    } else {
      console.log(`  [red] r/${sub}…`);
      xml = await traerFeed(sub);
      if (xml) writeFileSync(f, xml);
      else { console.log(`  [fallo] r/${sub}: sigue limitado, se salta`); continue; }
      await dormir(25_000); // ritmo sostenible medido el 2026-08-05
    }
    posts.push(...parseFeed(xml, sub));
  }

  const ahora = Date.now();
  const candidatos = posts
    .map((p) => ({ ...p, ...puntuar(p, ahora) }))
    .filter((p) => p.puntos > 0 && p.edadH <= ventanaH)
    .sort((a, b) => b.puntos - a.puntos);

  const dir = join(CONTENT_OPS_ROOT, 'replies');
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${hoy}-reddit-candidatos.json`);
  writeFileSync(out, JSON.stringify({ generado: new Date().toISOString(), ventanaH, candidatos: candidatos.slice(0, 12) }, null, 2));

  console.log(`\n${posts.length} posts leídos · ${candidatos.length} candidatos en ${ventanaH}h`);
  for (const c of candidatos.slice(0, 8)) {
    console.log(`  ${String(c.puntos).padStart(4)}  r/${c.sub}  ${c.edadH.toFixed(1)}h  ${c.titulo.slice(0, 62)}`);
    console.log(`        ${c.temas.slice(0, 5).join(', ')}`);
  }
  console.log(`\n→ ${out}`);
}

if (process.argv[1] && process.argv[1].endsWith('reddit-radar.mjs')) {
  main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
}
