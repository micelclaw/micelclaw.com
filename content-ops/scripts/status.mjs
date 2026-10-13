#!/usr/bin/env node
// status.mjs — genera content-ops/STATUS.md: el tablero único de estado (a partir de datos reales).
// Lee queue/, posted/posted.jsonl, src/content/blog/ y video/projects/. No publica nada.
// Uso: node scripts/status.mjs   (el cron de generación lo re-ejecuta cada semana)
import { readdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { env, bool, CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';
import { readLedger } from './lib/ledger.mjs';

const QUEUE = join(CONTENT_OPS_ROOT, 'queue');
const BLOGDIR = join(REPO_ROOT, 'src', 'content', 'blog');
const VIDEO = join(CONTENT_OPS_ROOT, 'video', 'projects');
const OUT = join(CONTENT_OPS_ROOT, 'STATUS.md');

const WD = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const weekday = (d) => WD[new Date(d + 'T12:00:00').getDay()];
const ls = (dir) => (existsSync(dir) ? readdirSync(dir) : []);
const readJSON = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } };


// ---------- Plan editorial (fuente del tablero único) ----------
const BLOG_PLAN = [
  { n: 12, slug: "process-manager", title: "The process manager: running services on demand without a mess", source: "published 2026-07-22" },
  { n: 13, slug: "mcp-facade", title: "The MCP facade: how agents talk to the backend without curl", source: "architecture/16_mcp-facade.md" },
  { n: 14, slug: "agent-identity", title: "Deterministic agent identity: a before_tool_call hook", source: "agent-identity hook + ADR-11" },
  { n: 15, slug: "multi-agent-topology", title: "7 agents per user, delegation, and the failure modes", source: "multi-agent reference + delegation skill" },
  { n: 16, slug: "agent-token-budget", title: "Fitting agents into small local models", source: "agent-context optimisation" },
  { n: 17, slug: "native-accounting", title: "Three ways to look at your money. Pick the one that's you", source: "Finance product screens" },
  { n: 18, slug: "inventory-ledger", title: "Photograph a receipt, and your inventory fills itself in", source: "Inventory product screens" },
  { n: 19, slug: "unified-drive", title: "Your files, and the two questions a folder can't answer", source: "Drive product screens" },
  { n: 20, slug: "nas-on-zfs", title: "Building a NAS on ZFS: snapshots as previous versions", source: "BLOCKED: Storage ZFS is a client-side simulation" },
  { n: 21, slug: "unified-messaging", title: "Unifying Telegram, WhatsApp and Signal: the bridge gotchas", source: "Messaging bidirectional research" },
  { n: 22, slug: "n8n-gates", title: "Agents that build automations: turning each LLM error into a gate", source: "docs/integrations/n8n.md" },
  { n: 23, slug: "studio-app-builder", title: "Studio: an app builder driven by a governed conversation", source: "Studio v3 architecture + ADR-12/17" },
  { n: 24, slug: "sleep-time-compute-2", title: "While you sleep: a quieter way to catch up", source: "published 2026-09-28; labeled editorial English digest translation; local detail/date limitations disclosed; publication evidence in specs/sleep-time-compute-2-review.md" },
  { n: 25, slug: "knowledge-graph-3d", title: "Your knowledge graph, now in 3D and queryable by your AI", source: "knowledge-graph reference" },
  { n: 26, slug: "hybrid-search-rrf-2", title: "Hybrid search with 4-signal RRF, revisited", source: "Hybrid search RRF" },
  { n: 27, slug: "webchat-session-ledger", title: "The webchat session ledger: JSONL as source of truth", source: "Webchat session ledger" },
];

const VIDEO_PLAN = [
  { ep: 1, modulo: "Notes", slug: "2026-07-ep1-notes", notes: "published 2026-07-25; original pacing was too fast" },
  { ep: 2, modulo: "Calendar", slug: "2026-08-ep2-calendar", notes: "published 2026-08-04" },
  { ep: 3, modulo: "Projects", slug: "2026-08-ep3-projects", notes: "YouTube and social derivatives published 2026-08-20; TikTok inbox sent, pending manual publish" },
  { ep: 4, modulo: "Contacts", slug: "2026-08-ep4-contacts", notes: "short published on Instagram/Facebook/TikTok; YouTube episode + Short public 28 Sep with thumbnails/EN captions; full episode links shared 28 Sep; X handed to María, unconfirmed; native Related video pending" },
  { ep: 5, modulo: "Mail", slug: "2026-08-ep5-mail", notes: "YouTube long + Short public 28 Sep with English captions; Instagram Reel and link announcements live; TikTok SEND_TO_USER_INBOX, pending María mobile publish; X handed to María, live unconfirmed; Short native Related video and Instagram caption edit pending; Bluesky PDS text corrected but public AppView still stale" },
  { ep: 6, modulo: "Photos", slug: "2026-08-ep6-photos", notes: "next episode after Mail" },
  { ep: 7, modulo: "Drive", slug: "2026-08-ep7-drive", notes: "not started" },
  { ep: 8, modulo: "Finance", slug: "2026-08-ep8-finance", notes: "not started" },
];

// Fechas orientativas: se convierten en publicaciones sólo después del gate approved:true.
const WEEK_PLAN = [
  { week: "W6", dates: "20–23 Aug", plan: "Drive re-entry: #19 unified-drive", video: "No episode; recover the regular rhythm", state: "☑ launch published 20 Aug" },
  { week: "W7", dates: "24–30 Aug", plan: "#21 unified-messaging (Mon) + #22 n8n-gates (Thu)", video: "Ep. 3 Projects — YouTube and social derivatives published", state: "☑ published 20 Aug" },
  { week: "W8", dates: "31 Aug–6 Sep", plan: "Planned #23 Studio + #24 Sleep Time; not published", video: "Contacts slot slipped", state: "↷ moved after publishing pause" },
  { week: "W9", dates: "7–13 Sep", plan: "Planned #25 Knowledge Graph + #26 Hybrid Search; not published", video: "Mail slot slipped", state: "↷ moved after publishing pause" },
  { week: "W10", dates: "14–20 Sep", plan: "Planned #27 Webchat Ledger + another topic; not published", video: "Photos production/release not completed", state: "↷ moved after publishing pause" },
  { week: "W11", dates: "21–27 Sep", plan: "Re-entry with one topic across networks: Contacts", video: "Ep. 4 Contacts — social launch 25 Sep; YouTube episode + Short and link announcements 28 Sep; TikTok PUBLISH_COMPLETE verified", state: "☑ published; X confirmation and YouTube native Related video pending" },
  { week: "W12", dates: "28 Sep–4 Oct", plan: "#24 Sleep Time/Digest — blog/dev.to and social launch approved and published 28 Sep; stories and X tracked in ledger", video: "Ep. 5 Mail — YouTube long + Short, Instagram and link announcements live 28 Sep; TikTok inbox pending mobile publish; Related video, IG caption edit, Bluesky text propagation and X live confirmation pending", state: "◐ Mail launch partly complete; manual steps pending" },
  { week: "W13", dates: "5–11 Oct", plan: "Next approved product topic", video: "Ep. 6 Photos — production/release target after Mail", state: "☐ pending production and approval" },
];
const ledger = readLedger();
// El ledger es append-only: una observación posterior (draft/deleted) corrige el
// estado visible de la misma clave sin borrar la evidencia del intento anterior.
const latestByKey = new Map(ledger.map((e) => [e.key, e]));
const posted = [...latestByKey.values()].filter((e) => e.status === 'posted');
const postedKey = (item, date) => posted.filter((e) => e.item === item && e.date === date);

// ---------- A. datos de la cola ----------
const dates = ls(QUEUE).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
const queueRows = dates.map((date) => {
  const dir = join(QUEUE, date);
  const nets = ls(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));
  const meta = readJSON(join(dir, 'meta.json'), {});
  const item = meta.item || date;
  const approved = meta.approved === true;
  const publicationDate = meta.publication_date || date;
  const pub = postedKey(item, publicationDate);
  const pubPlatforms = [...new Set(pub.map((e) => e.platform))];
  return { date: publicationDate, day: weekday(publicationDate), item, nets, approved, pubCount: pubPlatforms.length, apiTargets: nets.filter((n) => n !== 'x').length };
});

// A2. TODA pieza generada y sin publicar, una fila por post (aprobada o no) — regla del usuario:
// aquí tiene que salir SÍ O SÍ todo lo generado que aún no ha salido, con su fecha de publicación.
const MANUAL = new Set(['x']); // se postea a mano: nunca entra al ledger por API
const postedSet = new Set(posted.map((e) => `${e.platform}::${e.item}::${e.date}`));
const today = new Date().toISOString().slice(0, 10);
const pendingPieces = [];
for (const queueDate of dates) {
  const dir = join(QUEUE, queueDate);
  const meta = readJSON(join(dir, 'meta.json'), {});
  const date = meta.publication_date || queueDate;
  const item = meta.item || date;
  const approved = meta.approved === true;
  for (const f of ls(dir).filter((x) => x.endsWith('.md')).sort()) {
    const platform = f.replace('.md', '');
    if (platform === 'instagram-stories') {
      const frames = (readFileSync(join(dir, f), 'utf8').match(/^frame_url:/gm) || []).length;
      if (frames && Array.from({ length: frames }, (_, i) => `instagram_stories::${item}#f${i + 1}::${date}`).every(k => postedSet.has(k))) continue;
    }
    if (postedSet.has(`${platform}::${item}::${date}`)) continue; // ya publicado → fuera
    const manual = MANUAL.has(platform);
    let cuando;
    if (manual) cuando = `✍️ a mano (${date})`;
    else if (!approved) cuando = `⏸ en espera de aprobación (${date})`;
    else if (date < today) cuando = `⚠️ VENCIDO (era el ${date})`;
    else if (date === today) cuando = `hoy ${date} 09:33`;
    else cuando = `${date} 09:33`;
    pendingPieces.push({ date, day: weekday(date), item, platform, approved, manual, cuando });
  }
}

// ---------- B. serie de blog ----------
const blogRows = BLOG_PLAN.map(({ n, slug, title, source }) => {
  const fileExists = existsSync(join(BLOGDIR, slug + ".md"));
  const isPosted = posted.some((e) => e.item === slug);
  const qDate = queueRows.find((r) => r.item === slug)?.date || "";
  let estado = "☐ pendiente";
  if (isPosted) estado = "☑ publicado";
  else if (fileExists) estado = "◐ en cola";
  return { n, slug, title, source, estado, date: qDate };
});

// ---------- C. publicado (ledger, agrupado por item) ----------
const byItem = new Map();
for (const e of posted) {
  const k = `${e.item}::${e.date}`;
  if (!byItem.has(k)) byItem.set(k, { item: e.item, date: e.date, entries: [] });
  byItem.get(k).entries.push(e);
}
const pubGroups = [...byItem.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- D. vídeo ----------
// Las carpetas `_template-*` son PLANTILLAS, no trabajo en curso: salían como "◐ en producción"
// y ensuciaban la única lista que dice qué está a medias (regla del tablero: nada se oculta, pero
// tampoco se inventa trabajo). Lo mismo con `spike`, que es un banco de pruebas.
const videoRows = ls(VIDEO).filter((p) => {
  if (p.startsWith('_template') || p === 'spike') return false;
  try { return statSync(join(VIDEO, p)).isDirectory(); } catch { return false; }
}).map((slug) => {
  const dir = join(VIDEO, slug);
  const has = (rel) => existsSync(join(dir, rel));
  const copys = ls(join(dir, 'copys')).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));
  // La CARPETA exports existe en cuanto el pipeline la crea; lo que prueba que hay vídeo es un
  // .mp4 dentro. Antes un render abortado a mitad se reportaba como "renderizado".
  const expDir = join('/home/victor/Projects/_artifacts/video', slug, 'exports');
  const mp4s = ls(expDir).filter((f) => f.endsWith('.mp4'));
  const exported = mp4s.length > 0;
  const parts = [];
  if (has('script.md')) parts.push('script');
  if (has('storyboard.json')) parts.push('storyboard');
  if (has('subs/captions.srt')) parts.push('subs');
  if (copys.length) parts.push('copys(' + copys.join('+') + ')');
  if (mp4s.length) parts.push('export(' + mp4s.join('+') + ')');
  return { slug, estado: exported ? '☑ renderizado' : '◐ en producción', parts: parts.join(' · ') || '—' };
});

// D2. Los ocho episodios planificados se cruzan con lo que existe en disco.
// Regla del usuario: los que faltan aparecen como pendientes, no desaparecen del tablero.
const epRows = [];
for (const { ep, modulo, slug, notes } of VIDEO_PLAN) {
  const dir = join(VIDEO, slug);
  const existe = existsSync(dir);
  // An exports directory can exist before rendering; an MP4 proves completion.
  const masterMp4s = ls(join("/home/victor/Projects/_artifacts/video", slug, "exports")).filter((f) => f.endsWith(".mp4"));
  const verticalSlug = `${slug}-vertical`;
  const verticalMp4s = ls(join("/home/victor/Projects/_artifacts/video", verticalSlug, "exports")).filter((f) => f.endsWith(".mp4"));
  const exported = masterMp4s.length > 0;
  const item = slug.replace(/^\d{4}-\d{2}-/, "");
  const pubPlatforms = [...new Set(posted.filter((e) => e.item === item).map((e) => e.platform))];
  let estado = "☐ sin empezar";
  if (exported) estado = "☑ renderizado";
  else if (existe) estado = "◐ en producción";
  epRows.push({
    ep,
    modulo,
    slug,
    estado,
    vertical: verticalMp4s.length ? "☑ renderizado" : "—",
    publicado: pubPlatforms.length ? `☑ ${pubPlatforms.join(" · ")}` : "— sin registro",
    notes,
  });
}

// ---------- salida ----------
const live = bool('LIVE', false);
const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
const B = (arr) => arr.length ? arr : null;

let md = `# 📊 content-ops — tablero de estado

> Generado por \`scripts/status.mjs\` el ${now}. **No editar a mano** (se regenera). Fuente: \`queue/\`, \`posted/posted.jsonl\`, \`src/content/blog/\`, \`video/projects/\`.

## 🗓️ Programación

- **Semana**: **Lunes → Domingo** (hasta el 2026-08-02 era Mié→Mar).
- **Generación**: Lunes **06:57** (Europe/Madrid) — la revisas en la sesión de Claude Code. El mismo
  lunes, tras tu revisión, se **publica el Blog A** (lanzamiento completo en todas las redes).
- **Publicación**: diaria **09:33**. Interruptor: \`LIVE=${live ? '1 → EN VIVO' : '0 → en pausa'}\`.
- **Aprobación**: por lote semanal — cada día publica solo si su \`meta.json\` tiene \`approved:true\`.
- **Cron**: este tablero **no puede comprobarlo** (los crons viven en la sesión de Claude Code, no en
  el sistema). Míralo con \`/crons\`; si no hay ninguno, cada día se publica a mano.

| Día | Publica |
|---|---|
| **Lun** | *Generación 06:57* + **Blog A — lanzamiento completo**: blog + dev.to · Mastodon · Bluesky · Telegram · Facebook · Instagram · TikTok *(borrador)* · X *(borrador)* |
| **Mar** | Mastodon · Telegram · X *(borrador)* — standalone técnico |
| **Mié** | Facebook · Instagram — standalone no técnico |
| **Jue** | **Blog B** + dev.to · Mastodon · Bluesky · Telegram · X *(borrador)* |
| **Vie** | Facebook · Instagram · Bluesky — B no técnico |
| **Sáb** | Bluesky · Mastodon — standalone puente (hueco del episodio de vídeo) |
| **Dom** | Instagram · Facebook · Telegram — recap |

### Calendario semanal — W6 a W13

| Semana | Fechas | Blogs / piezas principales | Vídeo | Estado |
|---|---|---|---|---|---|
${WEEK_PLAN.map((w) => `| ${w.week} | ${w.dates} | ${w.plan} | ${w.video} | ${w.state} |`).join("\n")}

> Los temas y fechas futuras son un plan editorial: no se publican hasta que el lote tenga \`approved:true\`. #20 NAS/ZFS sigue bloqueado porque la pantalla usa datos simulados.

## 📦 Generado, SIN publicar — **TODO** (aprobado o no), post a post

${pendingPieces.length ? `**${pendingPieces.length} piezas** generadas esperando salir. Aprobado ✅ = saldrá solo a su hora; ❌ = bloqueado por el gate hasta que lo apruebes.

| Fecha | Día | Red | Item | Aprobado | Cuándo sale |
|---|---|---|---|---|---|
${pendingPieces.map((p) => `| ${p.date} | ${p.day} | ${p.platform === 'x' ? '**X**' : p.platform} | ${p.item} | ${p.approved ? '✅' : '❌ no'} | ${p.cuando} |`).join('\n')}

${pendingPieces.some((p) => p.cuando.startsWith('⚠️')) ? '> ⚠️ Hay piezas **vencidas** (su fecha ya pasó y no se publicaron): revisa por qué no salieron.\n' : ''}${pendingPieces.some((p) => p.manual) ? '> ✍️ Las de **X** las publicas tú a mano (no hay API); el texto sale en el aviso diario.\n' : ''}` : '_(nada generado pendiente de publicar)_'}

## ✍️ Serie de blog

### Publicados

${blogRows.filter((b) => b.estado.startsWith("☑")).map((b) => `- **#${b.n} — ${b.title}** (\`${b.slug}\`) · ${b.date} · ${b.source}`).join("\n")}

### Próximos y pendientes

${blogRows.filter((b) => !b.estado.startsWith("☑")).map((b) => `- **#${b.n} — ${b.title}** (\`${b.slug}\`) · ${b.source} · ${b.estado}`).join("\n")}

> El tema #20 sigue bloqueado: no se programa hasta que Storage/ZFS deje de ser una simulación. Los demás temas se convierten en una fecha concreta al aprobar su lote.

## 🔒 Subidas privadas — no publicadas

${ledger.filter((e) => e.platform === 'youtube' && e.status === 'draft' && !posted.some((p) => p.platform === e.platform && p.id === e.id)).map((e) => `- ${e.item} · ${e.date} · [vídeo privado](${e.url}) · ${e.note}`).join('\n') || '_(ninguna registrada)_'}

## ✅ Publicado (ledger)

| Item | Fecha | Canales registrados | Ejemplo |
|---|---|---|---|
${pubGroups.map((g) => {
  const plats = [...new Set(g.entries.map((e) => e.platform))];
  const link = g.entries.find((e) => e.url)?.url || '—';
  return `| ${g.item} | ${g.date} | ${plats.join(' · ')} | ${link !== '—' ? `[link](${link})` : '—'} |`;
}).join('\n')}

> En el ledger, X significa **hilo entregado a María**, no publicación confirmada. TikTok
> puede figurar tras aceptar la subida aunque siga en procesamiento o pendiente de publicar
> desde el móvil; revisa la nota del episodio antes de darlo por público.

## 🎬 Vídeo (pipeline Remotion — ver \`video/PLAYBOOK.md\`)

### Serie "Module Tours" — los 8 episodios planificados

${epRows.length ? `**${epRows.filter((e) => e.estado.startsWith("☑")).length}/${epRows.length} masters renderizados** · **${epRows.filter((e) => e.publicado.startsWith("☑")).length}/${epRows.length} con publicación registrada** · faltan **${epRows.filter((e) => !e.estado.startsWith("☑")).length}**.

| Ep | Módulo | Proyecto | Máster | Corte 9:16 | Publicación registrada | Notas |
|---|---|---|---|---|---|---|
${epRows.map((e) => `| ${e.ep} | ${e.modulo} | \`${e.slug}\` | ${e.estado} | ${e.vertical} | ${e.publicado} | ${e.notes} |`).join("\n")}` : "_(sin episodios planificados)_"}

Leyenda: ☑ renderizado (hay un MP4 en \`_artifacts/video/<proyecto>/exports/\`) · ◐ en producción (carpeta creada) · ☐ sin empezar. “Publicación registrada” se calcula exclusivamente desde \`posted/posted.jsonl\`; no equivale a que el render exista.
El plan de los ocho episodios vive en este tablero y se mantiene en scripts/status.mjs; actualiza ahí el orden, los slugs y las notas.

### Proyectos en disco (incluye tráiler y cortes verticales)

${videoRows.length ? `| Proyecto | Estado | Artefactos |
|---|---|---|
${videoRows.map((v) => `| \`${v.slug}\` | ${v.estado} | ${v.parts} |`).join('\n')}` : '_(sin proyectos de vídeo)_'}
`;

writeFileSync(OUT, md);
console.log(`[ok] ${OUT}`);
console.log(`  piezas sin publicar: ${pendingPieces.length} · blogs: ${blogRows.length} · publicados(grupos): ${pubGroups.length} · vídeo: ${videoRows.length}`);
