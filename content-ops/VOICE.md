# VOICE.md — brand voice, audience per network, format rules

The single source of truth for **how Micelclaw content sounds** and **how it changes per network**.
Read this before writing any piece. The posting scripts don't enforce it — the agent does.

Language: **English** across all networks (the blog and audience are English). Author byline: **Víctor**.

---

## 1. Base voice (from the blog)

The blog is the anchor. Its voice:

- **First person plural** — "we", "our system". Reserve "I" for retrospective/opinion beats.
- **An engineer telling a real decision**, not a marketer. Open with a concrete problem we actually hit
  ("Here's something that bothered us early on…", "We built X and felt good. Then we measured.").
- **Grounded in real numbers and real names** — `record_heat`, 137 migrations, a 168h half-life, −45% catalog.
  Never vague ("blazing fast"); always specific ("under 1ms, one SQL query").
- **Honest about mistakes.** We say what we'd do differently. This is the credibility engine.
- **Dry humor, no hype.** No "revolutionary", "game-changing", "unleash". Show, don't sell.
- Titles: `#NN — Hook: subtitle` for blog posts (e.g. `#05 — Heat scoring: teaching your data to forget`).

What Micelclaw *is* (one line, for bios/intros): **"Your self-hosted AI productivity OS."** It runs on your
own hardware; your data never leaves home; an AI agent works across all of it.

### 1b. THE TOPIC FILTER — read this before choosing what to write about

Decided 2026-08-04, after a whole week's batch was rejected for being "very technical and not interesting".
This rule overrides any impulse to write an engineering autopsy.

**The technical axis is the OPERATING SYSTEM ITSELF** — its architecture, how the databases are laid out, how
the modules and the agents fit together. That is legitimately interesting, and dev.to is where it belongs.

**The internals of a BUSINESS DOMAIN are not.** How double-entry bookkeeping balances to the cent, how an
inventory ledger derives a quantity, how a rounding tolerance works: readers assume that part works. Writing
about it reads as navel-gazing. If the subject is "how our accounting engine is built", stop and ask what the
user *sees* instead.

**What people want to see is the dashboard**: what it looks like, how obvious it is, how little you have to
learn. Screens are the argument. The engine gets at most one paragraph, and only as reassurance
("underneath it's real accounting, so your accountant can work with it — you never have to look at it").

Quick test before writing: *could I make this post out of screenshots?* If not, it's probably the wrong topic
for everything except dev.to.

Taglines by audience (from go-to-market): prosumers → *"All your data. One brain. Your hardware."* ·
techies → *"Like Synology DSM, but with an AI brain."* · NAS users → *"Turn any PC into an intelligent NAS."*

---

## 2. Audience matrix — this governs the ANGLE, not just the format

The same topic is framed differently depending on **who each network talks to**. On technical networks we tell
**"how we built it"** (the engineering, the why, the code). On non-technical networks we tell
**"what it does for you"** (the everyday benefit, zero jargon, visual). Bluesky is the bridge.

| Network | Audience | Angle / tone | Jargon | Start the draft from… |
|---|---|---|---|---|
| **Blog** | Technical (engineers, self-hosters) | deep internals, architecture decisions, code | high | the engineering decision |
| **dev.to** | **Technical — the only one** | the OS architecture, in depth. Keep the style the series already has: real decisions, real code, honest mistakes | high | the engineering decision |
| **Mastodon** | Technical / community (fediverse: self-hosting, privacy) | one interesting thing the product *does*, told to people who self-host. Architecture OK, domain internals not | low-medium | what the screen shows, then why it's built that way |
| **Bluesky** | **Half technical / half normal** | **bridge**: the idea in plain words, one screenshot | low | the interesting idea, plainly |
| **X** *(via publisher)* | **Non-technical** (prosumers) | product and visual. **No jargon, no code, no schemas** | none | the screen + what it saves you |
| **Telegram** | Mixed / channel followers (early adopters) | "here's what's new", close/personal, always with a visual | none | what changed, in plain words |
| **Facebook Page** | **Non-technical** (regular users) | everyday benefit, "what it solves for you" | none | the benefit / use case |
| **Instagram** | **Non-technical** (regular users) | **visual first** + everyday benefit | none | the visual, then one plain sentence |

> **Operating rule (revised 2026-08-04):** only **dev.to** is genuinely technical. The **blog** is technical
> *only when the subject is the OS's own architecture* (see §1b) — otherwise it's a product story told with
> screenshots. **Everything else is product and visual**: what it looks like, what it does for you, how little
> you have to learn. On Instagram, Facebook, X, Telegram and TikTok: **nothing technical at all.**
>
> Never shrink the same technical paragraph for all networks. And never derive a social piece from a
> paragraph about how something is implemented — derive it from what the user sees.

**Jargon translation** (technical → normal), for IG/FB/Bluesky-lite:

| Technical | Normal-audience phrasing |
|---|---|
| "knowledge graph + pgvector hybrid search" | "it actually finds what you mean, not just keyword matches" |
| "heat scoring / exponential decay" | "recent stuff floats to the top; old stuff quietly steps aside" |
| "MCP facade, deny-by-default scopes" | "the AI can only touch what you allow" |
| "self-hosted on your hardware" | "everything lives on your own computer — nothing goes to the cloud" |
| "double-entry ledger, PGC/IRPF" | "real accounting for your money, taxes included" |

---

## 3. Format rules per network (quick reference; full guide in `platforms/*.md`)

| Network | Format | Limit | Link | Media | Hashtags |
|---|---|---|---|---|---|
| **Blog** | Shape A (product) **1,200–1,800 words** — the screens carry it, don't pad · Shape B (architecture) 2,000–2,800 | — | — | **screenshots required** for Shape A (`/images/`) | — |
| **dev.to** | mirror + `canonical_url` | — | canonical | same as blog | 4 tags |
| **X** *(via publisher)* | thread 3–6 tweets: hook + points + link. Handed to María over Telegram, one tweet per message | 280/tweet | in a reply | 1 image opt. (`image:` line) | 0–1 |
| **Mastodon** | 1–2 toots, technical/community | 500 | inline | alt-text required | 2–4 (matter for discovery) |
| **Bluesky** | accessible-but-substantive; rich-text facet for the link | 300 | inline (facet) | image opt. (blob) | 0–2 |
| **Telegram** | channel post, markdown, medium-long | ~4096 | preview on | image/diagram | 0 |
| **Facebook** | 1–2 accessible paragraphs + CTA | — | inline | image recommended | 0–2 |
| **Instagram** | **visual required**: carousel / quote-card / screenshot; caption + hashtags | caption 2,200 | in bio (not clickable) | image/carousel **required** | 5–10 |

> **Visual card — SAME proportions for every network (1080×1350 vertical JPEG), but the CONTENT varies by
> audience.** Don't reuse one file everywhere — make **2–3 variants at the same 1080×1350** and match each to
> the network's audience (§2).
>
> **DEFAULT = a real screen of the dashboard, cropped.** The user's verdict on the 2026-08-03 batch was
> explicit: the pieces that worked were the ones showing the actual module; the hand-made diagram cards with
> code and abstract claims did not. So: **screenshots first**. A diagram card is the exception, allowed only
> when there is genuinely no screen to show, and never on Instagram, Facebook or X.
> - **Technical** (Mastodon, dev.to): the screen + the decision behind it.
> - **Bridge** (Bluesky, Telegram): the screen + the idea in plain terms.
> - **Non-technical** (IG, FB, X): the screen, and make it look good. Nothing else.
> - **Non-technical** (Instagram, Facebook, TikTok): the benefit, zero jargon — e.g. "40 apps, one quiet server".
> - **TikTok en concreto** (audio-first, vertical): 9:16 con VOZ, gancho de 4-8 palabras en el
>   frame 1, una sola idea, 5-20 s en los cortos. Nunca el MP4 mudo del GIF — spec y lista negra
>   en `platforms/tiktok.md`.
>
> Same branded template (dark canvas, amber kicker, title/subtitle, full-bleed screenshot `cover` + top).
> Generate with `compose-visual.mjs --preset social` (every preset = 1080×1350; landscape 1200×675 retired for
> social). **No empty bands:** capture the content tight (`capture-ui.mjs --selector "<main panel>"`, not the
> full padded page) so the screenshot has no dead dark strip above the toolbar or below the content — it must
> fill the frame edge-to-edge; verify the final card before publishing. Nuance: Mastodon/X home timelines may
> crop very tall images to ~16:9 with click-to-expand, but 4:5 (0.8) barely clips. `blog`/`docs` keep their own
> inline/hero images — a separate family, not this card.

### Blog post structure — TWO shapes, pick by topic (§1b)

**Shape A · PRODUCT post (the default).** The subject is a module and what it's like to use.

1. **Cold open** — the moment the screen saves you something, or the question the module answers.
2. `## H2` sections (the CSS renders them UPPERCASE), one per view or per task.
3. **Screenshots carry the argument** — a real, cropped screen for nearly every section, in `/images/`.
   Show the click path: what you see, what you press, what happens.
4. **Plain language.** No schemas, no code. Spell out what a term means the first time.
5. **At most one paragraph** on how it works underneath, and only where it buys trust.
6. **`## What it doesn't do yet`** — honest about the gaps. This replaces the engineering post-mortem.
7. **`## The takeaway`** — one memorable line about what you no longer have to do.
8. `---` + an *italic* teaser for the next post.

**Shape B · ARCHITECTURE post (only when §1b allows it — the OS itself).** The old shape, unchanged:
cold open → real abundant code → metric tables → concrete numbers → `## What I'd do differently` →
`## The takeaway` → teaser. This is the shape dev.to gets, and the one the series is known for.

Blog frontmatter (exact — see `platforms/blog.md`): `title`, `description`, `date` required;
`author: "Víctor"`, `tags: [...]` (4), `image`, `draft` optional.

---

## 4. Global rules

- **English, always.** No emojis in the blog; sparse and purposeful elsewhere (never in FB/IG headlines that
  should read as clean marketing — decide per piece).
- **One idea per social piece.** Don't cram a whole blog post into a toot.
- **Every visual explains the text** — see `../VOICE.md` §format + the visual pipeline. IG/FB pieces are
  visual-first; the caption supports the image, not the other way around.
- **Link discipline:** X puts the link in a reply (algorithm). Instagram can't link in captions → "link in bio".
- **Never invent numbers.** If a stat isn't real, don't use it. Honesty is the brand.
- **Accessibility:** Mastodon requires alt-text; add it everywhere images appear.
- **Cross-link the blog:** each social piece points back to the canonical blog post when there is one.

---

## 5. Video (YouTube series "Module Tours")

- **Formats:** Ep. 0 = trailer (85-90s). Episodes = **2:30–3:00 module tours** (user rule
  2026-08-10; before that the floor was ~2:30 flat), fixed 6-beat
  template (cold open → series card → tour → **"Now, from the chat"** signature segment →
  connections → outro). A **9:16 vertical cut (30-45s)** derives from every episode for
  Reels/Shorts. **TikTok sigue siendo borrador** (el buzón exige tocar la notificación en el
  móvil), pero **quien lo publica es María**, no el operador: `publish-day.mjs` le manda la
  acción y la descripción en un mensaje aparte. Ver `platforms/tiktok.md`.
- **Pacing (user rule, 2026-07-23):** same content as a 2:00 cut, told calmly — hold 2-3s on each
  interesting element after an action so the viewer can actually look at it. Ep. 1 (Notes, 1:40)
  was judged too fast; don't repeat that.
- **Voice = the brand voice, spoken.** Kokoro `am_michael`, calm engineer, first-person plural,
  zero hype, no invented numbers. Narration lines are short; punctuation drives the pauses.
  Pronunciation: "Micelclaw" → `My-cell-claw` (storyboard `pronounce`).
- **The signature segment is non-negotiable:** every episode shows a record created/changed from the
  chat, the tool pills, the **chip appearing, and the CLICK on the chip navigating to the module** —
  on camera.
- **Slot:** Saturday (the standalone slot). Derivatives Sun-Mon; Tuesday recap links the episode.
  Gate `approved:true` applies to video like everything else.
- **Mechanics:** produced with `content-ops/video/` (PLAYBOOK.md). Episode template:
  `video/projects/_template-episode/`. Music CC-BY Kevin MacLeod → attribution ALWAYS in the
  YouTube description (assets/LICENSES.md).
