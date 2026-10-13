# Platform: Instagram

**Audience:** **non-technical** (regular users). **Angle:** **visual first** + everyday benefit, zero jargon.
The image carries the message; the caption supports it.

## Mechanism (Graph API — Content Publishing)

Two steps (image must be a **public URL** Meta can fetch):

1. **Create container:**
   ```
   POST https://graph.facebook.com/{v}/{INSTAGRAM_USER_ID}/media
   { "image_url": "<public url>", "caption": "<caption>", "access_token": "{TOKEN}" }
   → { id: creation_id }
   ```
2. **Publish:**
   ```
   POST https://graph.facebook.com/{v}/{INSTAGRAM_USER_ID}/media_publish
   { "creation_id": "<id>", "access_token": "{TOKEN}" }
   ```
Carousel: create N image containers with `is_carousel_item=true`, then a parent container with
`media_type=CAROUSEL` + `children=[ids]`, then publish. Limit: **25 posts / 24h**.

If `INSTAGRAM_USER_ID` / token are empty, `post-instagram.mjs` **skips with a notice**.

## Setup

- **Requires** an Instagram **Business or Creator** account **linked to the Facebook Page**, plus the same Meta
  app + App Review (`instagram_content_publish`, `instagram_basic`) + Business Verification as `facebook.md`.
  **Do them together.** Without a Business account, IG cannot be posted via API — no workaround (Playwright is
  banned/risky).
- Store `INSTAGRAM_USER_ID`; token = `INSTAGRAM_ACCESS_TOKEN` or falls back to `FACEBOOK_PAGE_ACCESS_TOKEN`.
- **Public image URL — but NOT visible on the site.** IG fetches the image from a URL, so the card must be
  publicly reachable — but it does **not** belong in the blog. Host social cards in a dedicated **`public/social/`**
  folder (e.g. `public/social/<date>/ig-<slug>.jpg`): Astro serves `public/` at the site root, so the file is
  reachable at `https://micelclaw.com/social/<date>/ig-<slug>.jpg`, but **no page links to it → it never shows on
  the blog or anywhere on the site.** Different from the 1–2 technical images a blog post carries (those live in
  `public/images/` and are referenced inline). Push = Cloudflare Pages deploys it. Or use a bucket (set the host
  in `.env.local`).

## Format

- **Image/carousel required** — **1080×1350 vertical, the single card format we use on every network**
  (see `../VOICE.md` §3; `compose-visual.mjs --preset social`). Big, legible text on the visual; no jargon.
- Caption ≤ 2,200 chars: one plain sentence about the benefit + a soft CTA. **Links aren't clickable** → say
  "link in bio". 5–10 hashtags at the end (`#selfhosted #privacy #productivity #homelab #AI` …).

## Publish command

```bash
node scripts/post-instagram.mjs --file queue/<date>/instagram.md   # needs image_url in the file or --image
```

## Reels — native video (added 2026-07-25)

A `video_url:` line publishes a **Reel** (`media_type: REELS` + `share_to_feed`) instead of a photo.
Same constraint as images: the URL must be **public** (host it under `public/social/<date>/` and push
— Cloudflare Pages serves files up to 25 MB). Reels transcode asynchronously, so the script polls
`status_code` until `FINISHED` before publishing; that takes anywhere from seconds to a couple of
minutes. Requirements: MP4 h264+aac, 3 s-15 min, 9:16 recommended.

```
video_url: https://micelclaw.com/social/2026-07-26/clip.mp4
```
