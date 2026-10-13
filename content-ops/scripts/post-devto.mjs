#!/usr/bin/env node
// post-devto.mjs — publish an article to dev.to (Forem API). Skips with a notice if no API key.
// The queue file is a full dev.to-format markdown (YAML front matter + body). The front matter should set
// published: true, a `canonical_url` back to micelclaw.com, tags (comma-separated, max 4) and cover_image.
// Usage: node scripts/post-devto.mjs --file queue/2026-07-22/devto.md [--item slug] [--date YYYY-MM-DD]
import { readFileSync } from 'node:fs';
import { basename, resolve, isAbsolute } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}
function titleOf(md) {
  const m = md.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1] : '(untitled)';
}

const PLATFORM = 'devto';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const body_markdown = readFileSync(filePath, 'utf8');
  if (!body_markdown.trim()) throw new Error(`empty article in ${args.file}`);
  const title = titleOf(body_markdown);

  if (!/canonical_url:/i.test(body_markdown)) {
    console.warn('[warn] no canonical_url in the front matter — SEO credit will go to dev.to, not micelclaw.com');
  }

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['DEVTO_API_KEY']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — Settings → Extensions → DEV API Keys (platforms/devto.md)`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → dev.to\n--- "${title}" (${body_markdown.length} chars, front matter drives tags/canonical) ---`);
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': env('DEVTO_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ article: { body_markdown, published: true } }),
  });
  const data = await res.json();
  if (!res.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(data).slice(0, 300) });
    throw new Error(`dev.to post failed: ${JSON.stringify(data)}`);
  }
  console.log(`[ok] dev.to → ${data.url}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: String(data.id), url: data.url });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
