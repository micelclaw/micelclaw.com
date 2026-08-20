# 📊 content-ops — tablero de estado

> Generado por `scripts/status.mjs` el 2026-08-20 18:13. **No editar a mano** (se regenera). Fuente: `queue/`, `posted/posted.jsonl`, `src/content/blog/`, `ROADMAP.md`, `video/projects/`.

## 🗓️ Programación

- **Semana**: **Lunes → Domingo** (hasta el 2026-08-02 era Mié→Mar).
- **Generación**: Lunes **06:57** (Europe/Madrid) — la revisas en la sesión de Claude Code. El mismo
  lunes, tras tu revisión, se **publica el Blog A** (lanzamiento completo en todas las redes).
- **Publicación**: diaria **09:33**. Interruptor: `LIVE=1 → EN VIVO`.
- **Aprobación**: por lote semanal — cada día publica solo si su `meta.json` tiene `approved:true`.
- **Cron**: este tablero **no puede comprobarlo** (los crons viven en la sesión de Claude Code, no en
  el sistema). Míralo con `/crons`; si no hay ninguno, cada día se publica a mano.

| Día | Publica |
|---|---|
| **Lun** | *Generación 06:57* + **Blog A — lanzamiento completo**: blog + dev.to · Mastodon · Bluesky · Telegram · Facebook · Instagram · TikTok *(borrador)* · X *(borrador)* |
| **Mar** | Mastodon · Telegram · X *(borrador)* — standalone técnico |
| **Mié** | Facebook · Instagram — standalone no técnico |
| **Jue** | **Blog B** + dev.to · Mastodon · Bluesky · Telegram · X *(borrador)* |
| **Vie** | Facebook · Instagram · Bluesky — B no técnico |
| **Sáb** | Bluesky · Mastodon — standalone puente (hueco del episodio de vídeo) |
| **Dom** | Instagram · Facebook · Telegram — recap |

## 📦 Generado, SIN publicar — **TODO** (aprobado o no), post a post

**7 piezas** generadas esperando salir. Aprobado ✅ = saldrá solo a su hora; ❌ = bloqueado por el gate hasta que lo apruebes.

| Fecha | Día | Red | Item | Aprobado | Cuándo sale |
|---|---|---|---|---|---|
| 2026-08-20 | Jue | bluesky | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | devto | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | facebook | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | instagram | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | mastodon | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | telegram | unified-drive | ✅ | hoy 2026-08-20 09:33 |
| 2026-08-20 | Jue | **X** | unified-drive | ✅ | ✍️ a mano (2026-08-20) |

> ✍️ Las de **X** las publicas tú a mano (no hay API); el texto sale en el aviso diario.


## ✍️ Serie de blog

| # | Slug | Título | Estado | Fecha |
|---|---|---|---|---|
| 12 | `process-manager` | The process manager: running services on demand without a mess | ☑ publicado | 2026-07-22 |
| 13 | `mcp-facade` | The MCP facade: how agents talk to the backend without curl | ☑ publicado | 2026-07-23 |
| 14 | `agent-identity` | Deterministic agent identity: a before_tool_call hook | ☑ publicado | 2026-07-26 |
| 15 | `multi-agent-topology` | 7 agents per user, delegation, and the failure modes *(seq #07)* | ☑ publicado | 2026-07-29 |
| 16 | `agent-token-budget` | Fitting agents into small local models (−45% catalog) *(seq #07)* | ☑ publicado | 2026-08-02 |
| 17 | `native-accounting` | Three ways to look at your money. Pick the one that's you *(product post)* | ☑ publicado | 2026-08-03 |
| 18 | `inventory-ledger` | Photograph a receipt, and your inventory fills itself in *(product post)* | ☑ publicado | 2026-08-06 |
| 19 | `unified-drive` | Your files, and the two questions a folder can't answer *(product post)* | ◐ en cola | 2026-08-20 |
| 20 | `nas-on-zfs` | Building a NAS on ZFS: snapshots as "previous versions" | ☐ pendiente | — |
| 21 | `unified-messaging` | Unifying Telegram/WhatsApp/Signal: the bridge gotchas | ☐ pendiente | — |
| 22 | `n8n-gates` | Agents that build automations: turning each LLM error into a gate | ☐ pendiente | — |
| 23 | `studio-app-builder` | Studio: an app builder driven by a governed conversation | ☐ pendiente | — |
| 24 | `sleep-time-compute-2` | What your AI does while you sleep: digest + notifications *(seq #09)* | ☐ pendiente | — |
| 25 | `knowledge-graph-3d` | Your knowledge graph, now in 3D and queryable by your AI *(seq #04)* | ☐ pendiente | — |
| 26 | `hybrid-search-rrf-2` | Hybrid search with 4-signal RRF, revisited *(seq #08)* | ☐ pendiente | — |
| 27 | `webchat-session-ledger` | The webchat session ledger: JSONL as source of truth | ☐ pendiente | — |

Leyenda: ☑ publicado · ◐ en cola (redactado, sin push) · ☐ pendiente de generar.

## ✅ Publicado (ledger)

| Item | Fecha | Redes publicadas | Ejemplo |
|---|---|---|---|
| weekly-recap | 2026-08-09 | telegram · facebook · instagram | [link](https://facebook.com/986769277864129_122122632296915397) |
| inventory-standalone | 2026-08-08 | mastodon · bluesky | [link](https://mastodon.social/@micelclaw/117070335069113613) |
| inventory-standalone | 2026-08-07 | bluesky · facebook · instagram | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mshtnkajeq2n) |
| inventory-ledger | 2026-08-06 | devto · mastodon · bluesky · telegram · x | [link](https://dev.to/micelclaw/photograph-a-receipt-and-your-inventory-fills-itself-in-22eb) |
| accounting-standalone | 2026-08-05 | facebook · instagram | [link](https://facebook.com/986769277864129_122122115312915397) |
| accounting-standalone | 2026-08-04 | mastodon · telegram · x | [link](https://mastodon.social/@micelclaw/117037994724581953) |
| ep2-calendar | 2026-08-04 | telegram · mastodon · bluesky · facebook · instagram · tiktok | [link](https://mastodon.social/@micelclaw/117037833438470634) |
| native-accounting | 2026-08-03 | devto · mastodon · bluesky · telegram · facebook · instagram · x | [link](https://dev.to/micelclaw/three-ways-to-look-at-your-money-pick-the-one-thats-you-32f2) |
| agent-token-budget | 2026-08-02 | devto · mastodon · bluesky · telegram · facebook · instagram | [link](https://dev.to/micelclaw/a-45-cut-and-two-things-i-was-wrong-about-27hj) |
| agents-standalone | 2026-08-01 | bluesky · telegram | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3msansjtl2g2n) |
| agents-standalone | 2026-07-31 | facebook · instagram | [link](https://facebook.com/986769277864129_122122022402915397) |
| agents-standalone | 2026-07-30 | mastodon · telegram | [link](https://mastodon.social/@micelclaw/117007914794030884) |
| multi-agent-topology | 2026-07-29 | devto · mastodon · bluesky · telegram · facebook · tiktok · instagram | [link](https://dev.to/micelclaw/seven-agents-per-user-delegation-and-every-way-it-broke-5g1m) |
| weekly-recap | 2026-07-28 | telegram · facebook · instagram | [link](https://facebook.com/986769277864129_122121248090915397) |
| agent-identity | 2026-07-27 | bluesky · facebook · instagram · tiktok | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mrmfd2hu7v2w) |
| agent-identity | 2026-07-26 | devto · telegram · mastodon | [link](https://dev.to/micelclaw/deterministic-agent-identity-a-beforetoolcall-hook-fills-the-token-the-model-kept-getting-wrong-3nln) |
| ep1-notes-nomusic | 2026-07-25 | tiktok | — |
| ep1-notes | 2026-07-25 | telegram · mastodon · bluesky · facebook · instagram · tiktok | [link](https://mastodon.social/@micelclaw/116980707154668642) |
| scopes-insight | 2026-07-25 | mastodon · bluesky · x | [link](https://mastodon.social/@micelclaw/116979573255760764) |
| mcp-facade | 2026-07-24 | bluesky · facebook · instagram · tiktok | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mrevauvqsk2n) |
| mcp-facade | 2026-07-23 | devto · mastodon · telegram · x | [link](https://dev.to/micelclaw/the-mcp-facade-how-agents-talk-to-the-backend-without-curl-3pmo) |
| trailer-user | 2026-07-22 | mastodon · bluesky · telegram · facebook · instagram | [link](https://mastodon.social/@micelclaw/116964710358600287) |
| process-manager-portrait | 2026-07-22 | mastodon · bluesky · telegram · facebook | [link](https://mastodon.social/@micelclaw/116962695218150880) |
| process-manager | 2026-07-22 | devto · mastodon · bluesky · telegram · facebook · instagram · tiktok · x | [link](https://dev.to/micelclaw/building-a-process-manager-for-40-services-on-8gb-of-ram-19aa) |
| relaunch-smoke | 2026-07-22 | mastodon · bluesky · telegram · facebook | [link](https://mastodon.social/@micelclaw/116962387538916971) |

## 🎬 Vídeo (pipeline Remotion — ver `video/PLAYBOOK.md`)

### Serie "Module Tours" — los 8 episodios planificados

**1/8 renderizados** · faltan **7**.

| Ep | Módulo | Proyecto | Estado | Corte 9:16 | Notas |
|---|---|---|---|---|---|
| 1 | Notes | `2026-07-ep1-notes` | ☑ renderizado | ☑ | rendered + vertical cut; judged too fast (see VOICE §5 pacing) |
| 2 | Calendar | `ep2-calendar` | ☐ sin empezar | — | already announced as "next" in Ep. 1 |
| 3 | Mail | `ep3-mail` | ☐ sin empezar | — | — |
| 4 | Photos | `ep4-photos` | ☐ sin empezar | — | search-by-content is the hook |
| 5 | Drive (files) | `ep5-drive` | ☐ sin empezar | — | — |
| 6 | Finance (money) | `ep6-finance` | ☐ sin empezar | — | — |
| 7 | Chat + the 7 agents | `ep7-agents` | ☐ sin empezar | — | the deliberation moment |
| 8 | NAS / storage | `ep8-nas` | ☐ sin empezar | — | — |

Leyenda: ☑ renderizado (`exports/` existe) · ◐ en producción (carpeta creada) · ☐ sin empezar.
El plan de los 8 episodios es la tabla "Video series" de `ROADMAP.md`; el orden y los slugs se editan ahí.

### Proyectos en disco (incluye tráiler y cortes verticales)

| Proyecto | Estado | Artefactos |
|---|---|---|
| `2026-07-ep1-notes` | ☑ renderizado | storyboard · subs · copys(PUBLISH+bluesky+facebook+instagram+mastodon+redes+telegram+tiktok+x+youtube) · export(ep1-notes.mp4) |
| `2026-07-ep1-notes-vertical` | ☑ renderizado | storyboard · subs · export(ep1-notes-vertical-nomusic.mp4+ep1-notes-vertical.mp4) |
| `2026-07-short-agents` | ☑ renderizado | storyboard · subs · export(2026-07-short-agents.mp4) |
| `2026-07-short-notes` | ☑ renderizado | storyboard · subs · export(short-notes.mp4) |
| `2026-07-trailer-user` | ☑ renderizado | script · storyboard · subs · copys(bluesky+facebook+instagram+mastodon+redes+telegram+x+youtube) · export(trailer_user_v1-preview.mp4+trailer_user_v1.mp4+trailer_user_v2.mp4) |
| `2026-08-ep2-calendar` | ☑ renderizado | storyboard · subs · copys(PUBLISH+bluesky+facebook+instagram+mastodon+telegram+tiktok+x+youtube) · export(ep2-calendar.mp4) |
| `2026-08-ep2-calendar-vertical` | ☑ renderizado | storyboard · subs · export(ep2-calendar-vertical-nomusic.mp4+ep2-calendar-vertical.mp4) |
| `2026-08-ep3-projects` | ☑ renderizado | script · storyboard · subs · copys(PUBLISH+bluesky+facebook+instagram+mastodon+telegram+tiktok+x+youtube) · export(ep3-projects.mp4) |
| `2026-08-ep3-projects-vertical` | ☑ renderizado | script · storyboard · subs · export(ep3-projects-vertical-nomusic.mp4+ep3-projects-vertical.mp4) |
| `2026-08-ep4-contacts` | ☑ renderizado | storyboard · subs · copys(PUBLISH+bluesky+facebook+instagram+mastodon+telegram+tiktok+x+youtube) · export(2026-08-ep4-contacts.mp4) |
| `2026-08-ep4-contacts-vertical` | ☑ renderizado | storyboard · subs · export(2026-08-ep4-contacts-vertical-nomusic.mp4+2026-08-ep4-contacts-vertical.mp4) |
| `2026-08-ep5-mail` | ☑ renderizado | storyboard · subs · copys(PUBLISH+bluesky+facebook+instagram+mastodon+telegram+tiktok+x+youtube) · export(2026-08-ep5-mail.mp4) |
| `2026-08-ep5-mail-vertical` | ☑ renderizado | storyboard · subs · export(2026-08-ep5-mail-vertical-nomusic.mp4+2026-08-ep5-mail-vertical.mp4) |
