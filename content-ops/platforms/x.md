# Platform: X / Twitter — HANDED TO THE PUBLISHER

**Audience:** **non-technical** (prosumers). **Angle:** product and visual — what the screen shows and what it
saves you. **No jargon, no code, no schemas** (changed 2026-08-04; see `VOICE.md` §1b and the §2 matrix).

## Mechanism: NONE (manual by decision) — but the manual work is DELEGATED

The agent does not post to X. The X API v2 is pay-per-use in 2026 ($0.015/post, $0.20 with a link) and its
automation rules are strict (ban-waves). No credentials, no script, no cost, no ban risk.

**Who does it changed on 2026-08-05.** Until then the thread was dumped into the operator's daily summary for
the *user* to copy by hand — and ten threads piled up unpublished between 22 July and 4 August. Now:

- The agent **writes the thread into `queue/<date>/x.md`**, with an optional `image:` line.
- `publish-day.mjs` **hands it to the publisher (María) over Telegram**, the same way TikTok already worked.
- **One tweet per Telegram message.** Copying a message in Telegram copies it whole, so each tweet pastes
  into X with one tap. A single block would force her to select text by hand — the exact work being removed.
- The image, if any, goes in the **last** message, so it doesn't split the run of tweets.
- The handover is **recorded in the ledger** (`platform: 'x'`, status `posted`, with a note). That is what
  stops a second run of the same day from sending her the thread again — same class of bug as the duplicate
  TikTok notice of 2026-07-29.

Code: `scripts/lib/x-handoff.mjs`. Test: `tests/content-ops/_x-handoff-verify.mjs`.

> **Consequence for the board:** X never lands in the ledger by itself (no API), so an undelivered thread shows
> as pending forever. If a thread is deliberately *not* going to be published, move it to
> `queue/_x-descartados/` — don't fake a `posted` row.

## Format the agent should produce

- A thread of **3–6 tweets**, ≤ 280 chars each, numbered `1/`, `2/`, …
- Tweet 1 = the hook (the surprising number or the problem). Middle = the payoff/how. Last = CTA.
- **Put the blog link in the LAST tweet or as a reply**, not tweet 1 (links in the first tweet suppress reach).
- **Hashtags: 1–2 NICHE tags on the LAST tweet only** (next to the link) — never a stack, never in tweet 1.
  X de-emphasizes hashtags, so a block of 4–5 reads as spam; but one or two tags a real community follows
  (`#selfhosted`, `#homelab`, `#AIagents`, `#LocalLLM`, `#degoogle`) still surface in those niche feeds.
  Reuse the same niche as that day's Mastodon post, trimmed (Mastodon = 3–5; X = 1–2). CamelCase multi-word tags.
- Optionally note which composed visual to attach (`assets/<name>.png`).

## File shape (`queue/<date>/x.md`)

```
1/ Your AI agent is wasting 90% of its tokens on field names. Here's the fix. 🧵
2/ We measured a single list response: ~17,500 tokens. Most of it? Repeated JSON keys.
3/ ...
6/ Full write-up (with the numbers): https://micelclaw.com/blog/<slug>
[visual: assets/compact-format-hero.png]
```

If you later decide to automate X, add an `X_*` token block to `.env.local` and a `post-x.mjs`; the queue file
shape already matches.
