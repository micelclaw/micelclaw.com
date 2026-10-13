# Platform: Blog (micelclaw.com/blog)

**Audience:** technical — engineers, self-hosters. **Angle:** deep internals, real decisions, code.

## Mechanism

The blog is Astro 6 + MDX content collections. "Publishing" = write a markdown file + `git push`.

- **Location:** `src/content/blog/<slug>.md` (or `.mdx`). NOT `blog/` at repo root.
- **Images:** `public/images/<name>.png|webp`, referenced as `/images/<name>.png`.
- **Deploy:** push to `main` on `git@github.com:micelclaw/micelclaw.com.git` → Cloudflare Pages builds.
  (One-time: confirm Pages auto-deploy is wired to this repo.)

## Frontmatter (exact schema — `src/content.config.ts`)

```yaml
---
title: "#12 — Title: subtitle"          # REQUIRED
description: "One-paragraph hook that also serves as the meta description and social summary."  # REQUIRED
date: 2026-07-22                          # REQUIRED (YYYY-MM-DD)
author: "Víctor"                          # optional (default "Victor" — always set the accented one)
tags: ["postgresql", "architecture", "ai", "search"]   # optional, use 4
image: "/images/heat-scoring-graph.png"  # optional (absolute /images/ path)
draft: false                              # optional
---
```

Tag vocabulary in use: `ai architecture postgresql selfhosted search llm optimization privacy security nlp
typescript api database knowledgegraph pgvector ollama`.

## Format

- 2,000–2,800 words. Structure: cold open → `##` sections → real code → tables → numbers →
  `## What I'd do differently` → `## The takeaway` → `---` + *italic teaser for the next post*.
- `##` renders UPPERCASE via CSS. Images get a click-to-zoom lightbox for free (`BlogPost.astro`).
- Every post chains to the next via the teaser.

## Publish command

The agent writes the file directly (no script). Verify before pushing:

```bash
cd /home/victor/Projects/web/micelclaw.com
pnpm build            # must compile with 0 errors
# then commit + push ONLY on the user's go-ahead (no-push-until-validated)
```

## Checklist

- [ ] Slug matches the topic (`process-manager`, `mcp-facade`…).
- [ ] Frontmatter valid; `image` file exists in `public/images/` if referenced.
- [ ] `pnpm build` green.
- [ ] dev.to mirror queued with `canonical_url` (see `devto.md`).
- [ ] Social derivatives queued (see `STATUS.md`).
