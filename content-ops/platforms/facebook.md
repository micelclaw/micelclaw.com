# Platform: Facebook Page

**Audience:** **non-technical** (regular users). **Angle:** everyday benefit — "what it solves for you". Zero
jargon. Read it as if to someone who has never heard the word "self-hosted".

## Mechanism (Graph API — robust once set up)

Text/link post:
```
POST https://graph.facebook.com/{META_GRAPH_VERSION}/{FACEBOOK_PAGE_ID}/feed
{ "message": "<text>", "link": "https://micelclaw.com/blog/<slug>", "access_token": "{PAGE_TOKEN}" }
```
Photo post:
```
POST https://graph.facebook.com/{v}/{FACEBOOK_PAGE_ID}/photos
{ "caption": "<text>", "url": "<public image url>", "access_token": "{PAGE_TOKEN}" }
```

If `FACEBOOK_PAGE_ID` / `FACEBOOK_PAGE_ACCESS_TOKEN` are empty, `post-facebook.mjs` **skips with a notice** (it
does not error) so the rest of the day still publishes.

## Setup (the heavy one — shared with Instagram)

This is a multi-day process gated on Meta review. Do it once, together with Instagram:

1. **Meta for Developers** → create an app (type: Business).
2. Connect your **Facebook Page** and (for IG) an **Instagram Business/Creator** account linked to the Page.
3. Request permissions and pass **App Review**: `pages_manage_posts`, `pages_read_engagement`,
   `pages_show_list`, `public_profile` (+ IG: `instagram_content_publish`, `instagram_basic`).
4. Complete **Business Verification**.
5. Mint a **long-lived Page Access Token** (short user token → long user token → non-expiring Page token) and
   store it as `FACEBOOK_PAGE_ACCESS_TOKEN`. Get the Page id → `FACEBOOK_PAGE_ID`.

## Format

- 1–2 short paragraphs + a clear CTA ("See how it works →"). Benefit-first headline. 0–2 hashtags.
- Always attach an image (the composed visual). Links render a preview card.

## Publish command

```bash
node scripts/post-facebook.mjs --file queue/<date>/facebook.md
```

## Native video (added 2026-07-25)

A `video:` (local file) or `video_url:` line posts to `/{PAGE_ID}/videos` with the text as
`description`, landing in both the feed and the Page's video tab. Reels proper (`/video_reels`)
need a 3-step resumable upload and aren't wired up — a single vertical clip works fine here.
