# 📊 content-ops — tablero de estado

> Generado por `scripts/status.mjs` el 2026-09-28 18:23. **No editar a mano** (se regenera). Fuente: `queue/`, `posted/posted.jsonl`, `src/content/blog/`, `video/projects/`.

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

### Calendario semanal — W6 a W13

| Semana | Fechas | Blogs / piezas principales | Vídeo | Estado |
|---|---|---|---|---|---|
| W6 | 20–23 Aug | Drive re-entry: #19 unified-drive | No episode; recover the regular rhythm | ☑ launch published 20 Aug |
| W7 | 24–30 Aug | #21 unified-messaging (Mon) + #22 n8n-gates (Thu) | Ep. 3 Projects — YouTube and social derivatives published | ☑ published 20 Aug |
| W8 | 31 Aug–6 Sep | Planned #23 Studio + #24 Sleep Time; not published | Contacts slot slipped | ↷ moved after publishing pause |
| W9 | 7–13 Sep | Planned #25 Knowledge Graph + #26 Hybrid Search; not published | Mail slot slipped | ↷ moved after publishing pause |
| W10 | 14–20 Sep | Planned #27 Webchat Ledger + another topic; not published | Photos production/release not completed | ↷ moved after publishing pause |
| W11 | 21–27 Sep | Re-entry with one topic across networks: Contacts | Ep. 4 Contacts — social launch 25 Sep; YouTube episode + Short and link announcements 28 Sep; TikTok PUBLISH_COMPLETE verified | ☑ published; X confirmation and YouTube native Related video pending |
| W12 | 28 Sep–4 Oct | #24 Sleep Time/Digest — blog/dev.to and social launch approved and published 28 Sep; stories and X tracked in ledger | Ep. 5 Mail — YouTube long + Short, Instagram and link announcements live 28 Sep; TikTok inbox pending mobile publish; Related video, IG caption edit, Bluesky text propagation and X live confirmation pending | ◐ Mail launch partly complete; manual steps pending |
| W13 | 5–11 Oct | Next approved product topic | Ep. 6 Photos — production/release target after Mail | ☐ pending production and approval |

> Los temas y fechas futuras son un plan editorial: no se publican hasta que el lote tenga `approved:true`. #20 NAS/ZFS sigue bloqueado porque la pantalla usa datos simulados.

## 📦 Generado, SIN publicar — **TODO** (aprobado o no), post a post

**4 piezas** generadas esperando salir. Aprobado ✅ = saldrá solo a su hora; ❌ = bloqueado por el gate hasta que lo apruebes.

| Fecha | Día | Red | Item | Aprobado | Cuándo sale |
|---|---|---|---|---|---|
| 2026-07-22 | Mié | bluesky | process-manager | ❌ no | ⏸ en espera de aprobación (2026-07-22) |
| 2026-07-22 | Mié | facebook | process-manager | ❌ no | ⏸ en espera de aprobación (2026-07-22) |
| 2026-07-22 | Mié | mastodon | process-manager | ❌ no | ⏸ en espera de aprobación (2026-07-22) |
| 2026-07-22 | Mié | telegram | process-manager | ❌ no | ⏸ en espera de aprobación (2026-07-22) |



## ✍️ Serie de blog

### Publicados

- **#12 — The process manager: running services on demand without a mess** (`process-manager`) · 2026-07-22 · published 2026-07-22
- **#13 — The MCP facade: how agents talk to the backend without curl** (`mcp-facade`) · 2026-07-23 · architecture/16_mcp-facade.md
- **#14 — Deterministic agent identity: a before_tool_call hook** (`agent-identity`) · 2026-07-26 · agent-identity hook + ADR-11
- **#15 — 7 agents per user, delegation, and the failure modes** (`multi-agent-topology`) · 2026-07-29 · multi-agent reference + delegation skill
- **#16 — Fitting agents into small local models** (`agent-token-budget`) · 2026-08-02 · agent-context optimisation
- **#17 — Three ways to look at your money. Pick the one that's you** (`native-accounting`) · 2026-08-03 · Finance product screens
- **#18 — Photograph a receipt, and your inventory fills itself in** (`inventory-ledger`) · 2026-08-06 · Inventory product screens
- **#19 — Your files, and the two questions a folder can't answer** (`unified-drive`) · 2026-08-20 · Drive product screens
- **#24 — While you sleep: a quieter way to catch up** (`sleep-time-compute-2`) · 2026-09-28 · published 2026-09-28; labeled editorial English digest translation; local detail/date limitations disclosed; publication evidence in specs/sleep-time-compute-2-review.md

### Próximos y pendientes

- **#20 — Building a NAS on ZFS: snapshots as previous versions** (`nas-on-zfs`) · BLOCKED: Storage ZFS is a client-side simulation · ☐ pendiente
- **#21 — Unifying Telegram, WhatsApp and Signal: the bridge gotchas** (`unified-messaging`) · Messaging bidirectional research · ☐ pendiente
- **#22 — Agents that build automations: turning each LLM error into a gate** (`n8n-gates`) · docs/integrations/n8n.md · ☐ pendiente
- **#23 — Studio: an app builder driven by a governed conversation** (`studio-app-builder`) · Studio v3 architecture + ADR-12/17 · ☐ pendiente
- **#25 — Your knowledge graph, now in 3D and queryable by your AI** (`knowledge-graph-3d`) · knowledge-graph reference · ☐ pendiente
- **#26 — Hybrid search with 4-signal RRF, revisited** (`hybrid-search-rrf-2`) · Hybrid search RRF · ☐ pendiente
- **#27 — The webchat session ledger: JSONL as source of truth** (`webchat-session-ledger`) · Webchat session ledger · ☐ pendiente

> El tema #20 sigue bloqueado: no se programa hasta que Storage/ZFS deje de ser una simulación. Los demás temas se convierten en una fecha concreta al aprobar su lote.

## 🔒 Subidas privadas — no publicadas

_(ninguna registrada)_

## ✅ Publicado (ledger)

| Item | Fecha | Canales registrados | Ejemplo |
|---|---|---|---|
| ep5-mail-short | 2026-09-28 | youtube | [link](https://youtu.be/356e5p0NepM) |
| ep5-mail | 2026-09-28 | youtube · instagram · facebook · telegram · mastodon · bluesky · x | [link](https://youtu.be/2tE-EroGaTQ) |
| sleep-time-compute-2#f5 | 2026-09-28 | instagram_stories | — |
| sleep-time-compute-2#f4 | 2026-09-28 | instagram_stories | — |
| sleep-time-compute-2#f3 | 2026-09-28 | instagram_stories | — |
| sleep-time-compute-2#f2 | 2026-09-28 | instagram_stories | — |
| sleep-time-compute-2#f1 | 2026-09-28 | instagram_stories | — |
| sleep-time-compute-2 | 2026-09-28 | blog · devto · mastodon · bluesky · telegram · facebook · instagram · x | [link](https://micelclaw.com/blog/sleep-time-compute-2) |
| ep4-contacts-youtube-launch | 2026-09-28 | mastodon · bluesky · telegram · facebook · x | [link](https://mastodon.social/@micelclaw/117348144341270513) |
| ep4-contacts-short | 2026-09-28 | youtube | [link](https://youtube.com/shorts/qG5_fepWRZ4) |
| ep4-contacts | 2026-09-28 | youtube | [link](https://youtu.be/T-YhWeZwYuI) |
| ep4-contacts | 2026-09-25 | mastodon · bluesky · telegram · facebook · instagram · tiktok · x | [link](https://mastodon.social/@micelclaw/117330623507329003) |
| ep3-projects-short | 2026-08-20 | youtube | [link](https://youtube.com/shorts/Lj-DQytfETk?feature=share) |
| ep3-projects | 2026-08-20 | youtube · mastodon · bluesky · telegram · facebook · instagram · x · tiktok | [link](https://youtu.be/J2LdfMXvyq0) |
| unified-drive | 2026-08-20 | devto · mastodon · bluesky · telegram · facebook · instagram · x | [link](https://dev.to/micelclaw/your-files-and-the-two-questions-a-folder-cant-answer-25ia) |
| weekly-recap | 2026-08-09 | telegram · facebook · instagram | [link](https://facebook.com/986769277864129_122122632296915397) |
| inventory-standalone | 2026-08-08 | mastodon · bluesky | [link](https://mastodon.social/@micelclaw/117070335069113613) |
| inventory-standalone | 2026-08-07 | bluesky · facebook · instagram | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mshtnkajeq2n) |
| inventory-ledger | 2026-08-06 | devto · mastodon · bluesky · telegram · x | [link](https://dev.to/micelclaw/photograph-a-receipt-and-your-inventory-fills-itself-in-22eb) |
| accounting-standalone | 2026-08-05 | facebook · instagram | [link](https://facebook.com/986769277864129_122122115312915397) |
| ep2-calendar | 2026-08-04 | telegram · mastodon · bluesky · facebook · instagram · tiktok | [link](https://mastodon.social/@micelclaw/117037833438470634) |
| accounting-standalone | 2026-08-04 | mastodon · telegram · x | [link](https://mastodon.social/@micelclaw/117037994724581953) |
| native-accounting | 2026-08-03 | devto · mastodon · bluesky · telegram · facebook · instagram · x | [link](https://dev.to/micelclaw/three-ways-to-look-at-your-money-pick-the-one-thats-you-32f2) |
| agent-token-budget | 2026-08-02 | devto · mastodon · bluesky · telegram · facebook · instagram | [link](https://dev.to/micelclaw/a-45-cut-and-two-things-i-was-wrong-about-27hj) |
| agents-standalone | 2026-08-01 | bluesky · telegram | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3msansjtl2g2n) |
| agents-standalone | 2026-07-31 | facebook · instagram | [link](https://facebook.com/986769277864129_122122022402915397) |
| agents-standalone | 2026-07-30 | mastodon · telegram | [link](https://mastodon.social/@micelclaw/117007914794030884) |
| multi-agent-topology | 2026-07-29 | devto · mastodon · bluesky · telegram · facebook · instagram · tiktok | [link](https://dev.to/micelclaw/seven-agents-per-user-delegation-and-every-way-it-broke-5g1m) |
| weekly-recap | 2026-07-28 | telegram · facebook · instagram | [link](https://facebook.com/986769277864129_122121248090915397) |
| agent-identity | 2026-07-27 | bluesky · facebook · instagram · tiktok | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mrmfd2hu7v2w) |
| agent-identity | 2026-07-26 | devto · mastodon · telegram | [link](https://dev.to/micelclaw/deterministic-agent-identity-a-beforetoolcall-hook-fills-the-token-the-model-kept-getting-wrong-3nln) |
| ep1-notes-nomusic | 2026-07-25 | tiktok | — |
| ep1-notes | 2026-07-25 | telegram · mastodon · bluesky · facebook · instagram · tiktok | [link](https://mastodon.social/@micelclaw/116980707154668642) |
| scopes-insight | 2026-07-25 | mastodon · bluesky · x | [link](https://mastodon.social/@micelclaw/116979573255760764) |
| mcp-facade | 2026-07-24 | bluesky · facebook · instagram · tiktok | [link](https://bsky.app/profile/micelclaw.bsky.social/post/3mrevauvqsk2n) |
| mcp-facade | 2026-07-23 | devto · mastodon · telegram · x | [link](https://dev.to/micelclaw/the-mcp-facade-how-agents-talk-to-the-backend-without-curl-3pmo) |
| trailer-user | 2026-07-22 | mastodon · bluesky · telegram · facebook · instagram | [link](https://mastodon.social/@micelclaw/116964710358600287) |
| process-manager-portrait | 2026-07-22 | mastodon · bluesky · telegram · facebook | [link](https://mastodon.social/@micelclaw/116962695218150880) |
| process-manager | 2026-07-22 | devto · instagram · tiktok · x | [link](https://dev.to/micelclaw/building-a-process-manager-for-40-services-on-8gb-of-ram-19aa) |
| relaunch-smoke | 2026-07-22 | mastodon · bluesky · telegram · facebook | [link](https://mastodon.social/@micelclaw/116962387538916971) |

> En el ledger, X significa **hilo entregado a María**, no publicación confirmada. TikTok
> puede figurar tras aceptar la subida aunque siga en procesamiento o pendiente de publicar
> desde el móvil; revisa la nota del episodio antes de darlo por público.

## 🎬 Vídeo (pipeline Remotion — ver `video/PLAYBOOK.md`)

### Serie "Module Tours" — los 8 episodios planificados

**5/8 masters renderizados** · **5/8 con publicación registrada** · faltan **3**.

| Ep | Módulo | Proyecto | Máster | Corte 9:16 | Publicación registrada | Notas |
|---|---|---|---|---|---|---|
| 1 | Notes | `2026-07-ep1-notes` | ☑ renderizado | ☑ renderizado | ☑ telegram · mastodon · bluesky · facebook · instagram · tiktok | published 2026-07-25; original pacing was too fast |
| 2 | Calendar | `2026-08-ep2-calendar` | ☑ renderizado | ☑ renderizado | ☑ telegram · mastodon · bluesky · facebook · instagram · tiktok | published 2026-08-04 |
| 3 | Projects | `2026-08-ep3-projects` | ☑ renderizado | ☑ renderizado | ☑ youtube · mastodon · bluesky · telegram · facebook · instagram · x · tiktok | YouTube and social derivatives published 2026-08-20; TikTok inbox sent, pending manual publish |
| 4 | Contacts | `2026-08-ep4-contacts` | ☑ renderizado | ☑ renderizado | ☑ mastodon · bluesky · telegram · facebook · instagram · tiktok · x · youtube | short published on Instagram/Facebook/TikTok; YouTube episode + Short public 28 Sep with thumbnails/EN captions; full episode links shared 28 Sep; X handed to María, unconfirmed; native Related video pending |
| 5 | Mail | `2026-08-ep5-mail` | ☑ renderizado | ☑ renderizado | ☑ youtube · instagram · facebook · telegram · mastodon · bluesky · x | YouTube long + Short public 28 Sep with English captions; Instagram Reel and link announcements live; TikTok SEND_TO_USER_INBOX, pending María mobile publish; X handed to María, live unconfirmed; Short native Related video and Instagram caption edit pending; Bluesky PDS text corrected but public AppView still stale |
| 6 | Photos | `2026-08-ep6-photos` | ☐ sin empezar | — | — sin registro | next episode after Mail |
| 7 | Drive | `2026-08-ep7-drive` | ☐ sin empezar | — | — sin registro | not started |
| 8 | Finance | `2026-08-ep8-finance` | ☐ sin empezar | — | — sin registro | not started |

Leyenda: ☑ renderizado (hay un MP4 en `_artifacts/video/<proyecto>/exports/`) · ◐ en producción (carpeta creada) · ☐ sin empezar. “Publicación registrada” se calcula exclusivamente desde `posted/posted.jsonl`; no equivale a que el render exista.
El plan de los ocho episodios vive en este tablero y se mantiene en scripts/status.mjs; actualiza ahí el orden, los slugs y las notas.

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
