# Platform: Bluesky (AT Protocol)

**Audience:** **half technical / half normal.** **Angle:** the bridge — explain the interesting idea
accessibly. Neither an academic paper nor pure marketing. Assume a smart reader who isn't necessarily an
engineer.

## Mechanism (AT Protocol — free, no ban risk)

Two calls:

1. **Session:**
   ```
   POST {BLUESKY_SERVICE}/xrpc/com.atproto.server.createSession
   { "identifier": "{BLUESKY_HANDLE}", "password": "{BLUESKY_APP_PASSWORD}" }
   → { accessJwt, did }
   ```
2. **Post:**
   ```
   POST {BLUESKY_SERVICE}/xrpc/com.atproto.repo.createRecord
   Authorization: Bearer {accessJwt}
   {
     "repo": "{did}",
     "collection": "app.bsky.feed.post",
     "record": {
       "$type": "app.bsky.feed.post",
       "text": "<text>",
       "createdAt": "<ISO8601>",
       "facets": [ /* rich-text: link byteStart/byteEnd → uri */ ],
       "langs": ["en"]
     }
   }
   ```

**Links need facets.** Bluesky does not auto-linkify. To make a URL clickable, add a `facet` with the byte range
of the link text and `features: [{ $type: "app.bsky.richtext.facet#link", uri }]`. The posting script computes
byte offsets (UTF-8) for the `[label](url)` in the source.

**Images (optional):** `POST /xrpc/com.atproto.repo.uploadBlob` → embed as `app.bsky.embed.images` with alt-text.

## Setup

- bsky.app → **Settings → Privacy and Security → App Passwords → Add App Password**.
- Store `BLUESKY_HANDLE` (e.g. `micelclaw.bsky.social`) and `BLUESKY_APP_PASSWORD` in `.env.local`.
  `BLUESKY_SERVICE` defaults to `https://bsky.social`. **Never** use your real password.

## Format

- ≤ **300 graphemes**. One clear idea. Bridge tone: a technical concept in plain words, with just enough depth
  to be interesting to the technical half.
- 0–2 hashtags (Bluesky culture uses them lightly).
- Link inline (as a facet).

## Publish command

```bash
node scripts/post-bluesky.mjs --file queue/<date>/bluesky.md
```

Source `.md`: text with an optional `[label](https://…)` for the clickable link; optional `image:`/`alt:` lines.
