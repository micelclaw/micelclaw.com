# ROADMAP.md — editorial calendar

> 📊 **Estado de un vistazo → [`STATUS.md`](./STATUS.md)** (tablero generado por `scripts/status.mjs`: cola sin
> publicar, programación, serie de blog, publicado, vídeo). Este ROADMAP es el plan; STATUS.md es el estado real.

Living plan. The **weekly generation** run reads this, picks the current week's blog topic, and derives the
social pieces; the **daily publish** run reads the queue. Update statuses as things ship.

Schedule (from 2026-08-03): **the week runs Monday→Sunday** and generation is **Mondays 06:57 Europe/Madrid**
(reviewed in-session, no bot notification). Blogs **2/week — Monday (full launch) + Thursday**; each social
network 3–4/week — see `VOICE.md` §3. Content language: English. **Approval gate (weekly batch):** nothing
publishes until each day's `queue/<date>/meta.json` has `approved:true` (set on the user's OK, when the blogs
are also pushed).

> Until 2026-08-02 the week ran **Wed→Tue** with generation on Wednesdays and Blog B on Sundays. The change to
> Mon→Sun took effect with the 2026-08-03 batch; the day map below is the one that governs.

> **Return after a publishing pause — Thu 2026-08-20.** The Drive batch drafted for 10–12 August was not approved or published. It resumes as a single current launch today: Blog #19 plus its full social set. The duplicate-file standalone follows on Friday; the repaired eight-part Drive Stories launch on Saturday; Sunday is a short recap. The normal Monday→Sunday generation rhythm resumes on 24 August. Do not backfill the old dates as if the posts were current.

**Monday is a full launch day, not just generation.** Same morning it generates the week, it also publishes
**Blog A** (the technical blog, "part A") across **all networks** at once — blog + dev.to + Mastodon + Bluesky +
Telegram + Facebook + Instagram + TikTok *(draft, only if there's a short)* + X *(María)*, merging what used to
be the separate "blog A" and "A non-technical" days. **Blog B lands on Thursday**, which is the widest spacing
two blogs can get inside a Mon→Sun week.

| Day | What | Networks |
|---|---|---|
| **Mon** | *generation 06:57* + **Blog A — full launch** | blog · dev.to · Mastodon · Bluesky · Telegram · Facebook · Instagram · TikTok *(draft)* · X *(María)* |
| **Tue** | standalone **technical** | Mastodon · Telegram · X *(María)* |
| **Wed** | standalone **plain** | Facebook · Instagram |
| **Thu** | **Blog B + derivatives** | blog · dev.to · Mastodon · Bluesky · Telegram · X *(María)* |
| **Fri** | **B non-technical** | Facebook · Instagram · Bluesky |
| **Sat** | standalone **bridge** (video-episode slot) | Bluesky · Mastodon · TikTok *(draft, when an episode ships)* |
| **Sun** | **recap** of the week | Instagram · Facebook · Telegram |

Legend: ☐ pending · ◐ drafted/queued · ☑ published.

---

## Blog series (resume + new) — one per week

The series resumed at **#12** and is now live through **#16**. **In flight: #17 (Mon 2026-08-03) and #18 (Thu 2026-08-06)** — then sequels to #01–#11 + new material from the expanded product.

| # | Slug | Title (working) | Source / notes | Status |
|---|---|---|---|---|
| 12 | `process-manager` | The process manager: running services on demand without a mess | published 2026-07-22 | ☑ |
| 13 | `mcp-facade` | The MCP facade: how agents talk to the backend without curl | `micelclaw-os/docs/architecture/16_mcp-facade.md` | ☑ |
| 14 | `agent-identity` | Deterministic agent identity: a before_tool_call hook | `docs/reference/agent-identity-hook.md`, ADR-11 | ☑ 2026-07-26 |
| 15 | `multi-agent-topology` | 7 agents per user, delegation, and the failure modes *(seq #07)* | `reference/multiagent-*`, `claw-delegation/SKILL.md`, SP8-2 | ☑ 2026-07-29 |
| 16 | `agent-token-budget` | Fitting agents into small local models (−45% catalog) *(seq #07)* | memory `project_agent_context_optimization` | ☑ 2026-08-02 |
| 17 | `native-accounting` | Three ways to look at your money. Pick the one that's you *(product post)* | the module itself — screens in `public/images/finance-*` | ☑ 2026-08-03 |
| 18 | `inventory-ledger` | Photograph a receipt, and your inventory fills itself in *(product post)* | the module itself — screens in `public/images/inventory-*` | ☑ 2026-08-06 |
| 19 | `unified-drive` | Your files, and the two questions a folder can't answer *(product post)* | the module itself — screens in `public/images/drive-*` | ◐ Mon 2026-08-10 |
| 20 | `nas-on-zfs` | Building a NAS on ZFS: snapshots as "previous versions" | `docs/modules/storage.md`, `research/storage-nas-master-plan.md` | ⛔ **blocked** |
| 21 | `unified-messaging` | Unifying Telegram/WhatsApp/Signal: the bridge gotchas | memory `project_messaging_bidirectional` | ☐ |
| 22 | `n8n-gates` | Agents that build automations: turning each LLM error into a gate | `docs/integrations/n8n.md`, memory `project_n8n_workflow_success_patterns` | ☐ |
| 23 | `studio-app-builder` | Studio: an app builder driven by a governed conversation | `docs/studio/v3-architecture.md`, ADR-12/17 | ☐ |
| 24 | `sleep-time-compute-2` | What your AI does while you sleep: digest + notifications *(seq #09)* | memory `project_notifications_redesign` | ☐ |
| 25 | `knowledge-graph-3d` | Your knowledge graph, now in 3D and queryable by your AI *(seq #04)* | `docs/reference/knowledge-graph.md`, memory `project_graph_3d_toggle` | ☐ |
| 26 | `hybrid-search-rrf-2` | Hybrid search with 4-signal RRF, revisited *(seq #08)* | existing `hybrid-search-rrf.md` + advanced weights | ☐ |
| 27 | `webchat-session-ledger` | The webchat session ledger: JSONL as source of truth | memory `project_webchat_session_ledger` | ☐ |

> **#20 `nas-on-zfs` is blocked, and it isn't a scheduling problem.** The ZFS half of the Storage
> module is a **client-side simulation** (`dash/src/modules/storage/zfs-demo.ts` — "fabricated
> environment so you can see every interface without bare-metal"; the module paints its own
> `DemoModeBanner` saying the disks and pools are fake). Under the §1b rule a product post stands on
> real screenshots, and every screenshot here would be of invented data. It reopens when the NAS
> exists on real hardware.
>
> **Photos is deferred by the user's own call (2026-08-10)** — they want it polished before it ships
> as a post. Verified while scoping it: search-by-content works and is genuinely the hook (a query
> whose words appear in no filename returns the right pictures, 180/211 photos described by local
> models), but **face clustering is broken** — 74 "people", all but one holding a single photo, and
> one photo alone spawning fourteen separate "people" — and **Déjà Vu returns an empty list**. Those
> two legs can't be screenshotted until the clustering threshold is fixed.

---

## Video series "Module Tours" — 8 episodes (SSOT of the plan)

Order = the one the trailer announces, and it honours the `next: "Ep. 2 — Calendar"` already shipped inside
Ep. 1. Format/rules in `VOICE.md` §5; pipeline in `video/PLAYBOOK.md`. `scripts/status.mjs` parses this table
to show which episodes are still pending, so **keep the slug column matching `video/projects/<slug>`**.

| Ep | Module | Project slug (`video/projects/`) | Notes |
|---|---|---|---|
| 1 | Notes | `2026-07-ep1-notes` | rendered + vertical cut; judged too fast (see VOICE §5 pacing) |
| 2 | Calendar | `ep2-calendar` | already announced as "next" in Ep. 1 |
| 3 | Mail | `ep3-mail` | |
| 4 | Photos | `ep4-photos` | search-by-content is the hook |
| 5 | Drive (files) | `ep5-drive` | |
| 6 | Finance (money) | `ep6-finance` | |
| 7 | Chat + the 7 agents | `ep7-agents` | the deliberation moment |
| 8 | NAS / storage | `ep8-nas` | |

Ep. 0 = the trailer (`2026-07-trailer-user`). Every episode also gets a **9:16 vertical cut** (30-45s) as a
`-vertical` sibling project.

---

## Derivation model (per blog post → social pieces)

Each blog post spawns pieces, each **started from its audience angle** (see `VOICE.md` §2), not a shrink of the
same text:

- **dev.to**: mirror, same day, `canonical_url`.
- **Mastodon**: the sharp technical takeaway (≤500), 2–4 hashtags.
- **Bluesky**: the idea explained accessibly (≤300), bridge tone.
- **Telegram**: "new post: …" announcement + link.
- **Facebook**: the everyday benefit, 1–2 plain paragraphs + composed visual.
- **Instagram**: visual-first (quote-card / UI screenshot) + plain caption + hashtags.
- **X** *(draft)*: 3–6 tweet thread → `queue/<date>/x.md` for manual posting.

Between blog posts, fill the social cadence with **standalone pieces**: a single insight, a tip, a screenshot of
a feature, a "did you know" — same audience rules per network.

---

## Week-by-week schedule (first block — fill dates as we go)

> `date` at generation time sets the concrete dates. Template for the weekly run to expand:

| Week | Blogs | Mastodon | Bluesky | Telegram | Facebook | Instagram | X (draft) |
|---|---|---|---|---|---|---|---|
| W1 · Wed 2026-07-22 | #12 process-manager | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ thread |
| W2 · Wed 2026-07-23 | #13 mcp-facade | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ thread |
| W3 · Sun 2026-07-26 | #14 agent-identity | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ thread |
| W4 · Wed 2026-07-29 | #15 multi-agent + #16 token-budget | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ ×3 threads |
| **W5 · Mon 2026-08-03** *(first Mon→Sun week)* | #17 native-accounting + #18 inventory-ledger | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ ×3 threads |
| **W6 · Thu 2026-08-20** *(re-entry: Drive)* | #19 unified-drive + Drive follow-ups | ◐ ×2 | ◐ | ◐ | ◐ ×2 | ◐ ×2 | ◐ ×2 threads |
| … | … | | | | | | |

> **W6 is a recovery week on purpose.** The user asked for Drive only, holding Photos back until it looks
> the way they want. The 10–12 August drafts were held during a publishing pause and are rephased from
> 20 August rather than backfilled.

**Cadence targets/week:** Blog 2 · dev.to 2 · X 3–4 (lo publica María, avisada por Telegram) · Mastodon 3–4 · Bluesky 3–4 · Telegram 3–4 ·
Facebook 3–4 · Instagram 3–4 · **TikTok 3** (1 episodio + 2 cortos de 5-20 s; borrador que
publica María). (Slots beyond the blog derivatives are standalone pieces.
Monday's full launch already hits every network once, so IG/FB/Telegram run a touch higher.
TikTok only fills its slots when a short or an episode actually got produced — no short, no `tiktok.md`.)

---

## Docs track (separate cadence — see `platforms/`… no: see the plan's docs section)

Not daily. Run `/docs-audit` first, then `/docs-fill` per phase. Phase order (from the audit):
1. Onboarding (fixes the broken hero) → 2. Self-hosting/Ops → 3. API reference (~26 domains) →
4. Integrations + AI → 5. Apps/skills SDK + architecture.
