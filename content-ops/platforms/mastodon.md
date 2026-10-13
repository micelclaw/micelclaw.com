# Platform: Mastodon

**Audience:** technical / community (fediverse — self-hosting, privacy, FOSS). **Angle:** sharp technical
takeaway + community tone. Hashtags matter here for discovery.

## Mechanism (API — trivial, free, no ban risk)

```
POST {MASTODON_INSTANCE}/api/v1/statuses
Authorization: Bearer {MASTODON_ACCESS_TOKEN}
Content-Type: application/json
{ "status": "<text>", "visibility": "public", "language": "en" }
```

Media (optional): upload first to `POST /api/v2/media` (multipart) → get `id` → include `"media_ids": [id]`.
Always set the media `description` (alt-text) — the fediverse expects it.

## Setup

1. Log in to your instance → **Preferences → Development → New application**.
2. Scopes: `write` (or at least `write:statuses`, `write:media`).
3. Copy the **access token** → `.env.local` as `MASTODON_ACCESS_TOKEN`, and set `MASTODON_INSTANCE`
   (e.g. `https://mastodon.social` or your own).

No OAuth dance needed for your own account — the token is enough.

## Format

- 1–2 toots, ≤ **500 chars** each. If it needs 2, post the second as a reply (`in_reply_to_id`).
- **Link as a bare URL** (`https://micelclaw.com/blog/…`) — Mastodon auto-linkifies bare URLs but renders
  `[label](url)` markdown **literally**. No link penalty like X.
- Add 2–4 hashtags: `#selfhosted #privacy #AI #PostgreSQL` etc. Alt-text required on every image.

## Publish command

```bash
node scripts/post-mastodon.mjs --file queue/<date>/mastodon.md
# DRY_RUN=1 prints the payload; LIVE=1 + DRY_RUN=0 actually toots.
```

The `.md` file: first line(s) = the toot text; an optional `image:` line (path under `assets/` or `public/images`)
and `alt:` line for the picture.

## Native video (added 2026-07-25)

A `video:` line (local file) attaches an MP4 instead of an image. The MIME type is sent explicitly
(without it Mastodon rejects the file), and because the media endpoint answers **202 while
transcoding**, the script polls `/api/v1/media/:id` until it returns 200 before posting the status —
posting with an unprocessed id fails. mastodon.social currently allows up to **99 MiB** per video
(verified via `/api/v2/instance`). `alt:` still applies and is still required.
