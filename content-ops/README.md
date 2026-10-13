# content-ops — Micelclaw content & docs automation

Home of the **content-ops agent**: the pipeline that publishes to social networks + the blog, keeps
[docs.micelclaw.com](https://docs.micelclaw.com) alive, and generates the visuals that illustrate both.

Plan of record: `~/.claude/plans/no-quiero-que-me-agile-crown.md`.

## Layout

| Path | What |
|---|---|
| `VOICE.md` | Brand voice + **audience matrix per network** + format rules. Read this before writing any piece. |
| `platforms/*.md` | One "how to post here" guide per network (mechanism, audience, limits, media, setup). |
| `STATUS.md` | Generated editorial plan, publishing status and video pipeline. |
| `queue/<YYYY-MM-DD>/` | Generated pieces awaiting publish (committed, **no secrets**). |
| `posted/posted.jsonl` | Publish ledger — makes `publish-day` idempotent. |
| `assets/` | Final visual artifacts (pretty screenshots, diagrams) reused across blog/social/docs. |
| `scripts/` | Node 22 ESM (native `fetch`, zero deps). Posting + capture/compose + `publish-day`. |
| `.env.local` | **Secrets — gitignored.** Copy from `.env.local.example`. |

## Safety model

- **`LIVE=0`** (default) = shadow mode: generate + queue + notify, publish nothing.
- **`DRY_RUN=1`** (default in the example) = every posting script prints its payload and hits no API.
- Flip `LIVE=1` + `DRY_RUN=0` only after a week of shadow output looks right.
- **X is draft-only**: the agent writes the thread to `queue/.../x.md`; you post it by hand.
- Every publish is recorded in `posted/posted.jsonl` keyed by `(platform, item, date)` → no double-posts.

## Quick commands

```bash
# from content-ops/
node scripts/publish-day.mjs                 # publish today's queued items (respects LIVE/DRY_RUN)
node scripts/post-mastodon.mjs --file queue/2026-07-22/mastodon.md   # one platform, one file
node scripts/capture-ui.mjs --module drive   # capture the Drive UI (Paco session)
node scripts/compose-visual.mjs --shot _artifacts/.../drive.png --title "Your files, one index"
```

The Claude Code side lives in `/home/victor/Projects/.claude/`: agent `content-ops`, skills
`/postear`, `/docs-audit`, `/docs-fill`, `/visual`.
