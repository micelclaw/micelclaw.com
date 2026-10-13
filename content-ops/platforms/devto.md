# Platform: dev.to

**Audience:** technical (same as blog). **Angle:** mirror the blog post, with a canonical link back.

## Mechanism

dev.to publishes via the **Forem API** (`POST https://dev.to/api/articles`) with an `api-key` header, OR by
pasting markdown in the editor. For V1 this is **draft-assist**: the agent produces the dev.to markdown into the
queue; publishing can be manual (paste) or automated later with an API key.

The critical piece is the **`canonical_url`** pointing to the micelclaw.com post, so SEO credit stays on our
domain and Google doesn't treat dev.to as the original.

## Front matter (dev.to flavor — note: comma-separated tags, different from the blog)

```yaml
---
title: "Title: subtitle"
published: true
description: "One-line description."
tags: ai, architecture, postgresql, selfhosted     # comma-separated, max 4
canonical_url: https://micelclaw.com/blog/<slug>
cover_image: https://micelclaw.com/images/<name>.png
---
```

## Format

- Same body as the blog post (technical, long-form). dev.to renders GitHub-flavored markdown + liquid tags.
- Publish **the same day** as the blog (or a day later once the canonical is live and indexed).
- Historical note: the Windows drafts (`blog-XX-*.md`) already use dev.to front matter — reuse that shape.

## Setup (optional automation)

- dev.to → Settings → Extensions → **DEV Community API Keys** → generate. Store as `DEVTO_API_KEY` in
  `.env.local` if/when you want the agent to publish automatically. Not required for V1.

## Checklist

- [ ] `canonical_url` set to the live blog URL.
- [ ] `cover_image` is an absolute URL (dev.to can't read `/images/...`).
- [ ] Tags mirror the blog's 4 tags.
