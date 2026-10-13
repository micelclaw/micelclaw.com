#!/usr/bin/env node
// post-mastodon.mjs — publish a toot. Text-only or with one image (alt-text required).
// Usage: node scripts/post-mastodon.mjs --file queue/2026-07-22/mastodon.md [--item slug] [--date YYYY-MM-DD]
import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve, isAbsolute, join } from 'node:path';
import { env, requireEnv, shouldPublish, DRY_RUN, CONTENT_OPS_ROOT, REPO_ROOT } from './lib/env.mjs';
import { alreadyPosted, record } from './lib/ledger.mjs';
import { parseQueueFile } from './lib/notify.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}
function resolveImage(p) {
  if (!p) return null;
  for (const base of [null, CONTENT_OPS_ROOT, REPO_ROOT, join(REPO_ROOT, 'public')]) {
    const full = base ? resolve(base, p) : (isAbsolute(p) ? p : null);
    if (full && existsSync(full)) return full;
  }
  return null;
}

const PLATFORM = 'mastodon';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  if (!text) throw new Error(`empty toot in ${args.file}`);
  if (text.length > 500) console.warn(`[warn] toot is ${text.length} chars (>500) — will likely be rejected`);

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['MASTODON_INSTANCE', 'MASTODON_ACCESS_TOKEN']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — see platforms/mastodon.md`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  const instance = env('MASTODON_INSTANCE').replace(/\/$/, '');
  const token = env('MASTODON_ACCESS_TOKEN');
  const image = resolveImage(meta.image);
  const video = resolveImage(meta.video);
  const media = video || image;
  const alt = meta.alt || '';

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → ${instance}\n--- toot (${text.length} chars) ---\n${text}` +
      (video ? `\n[video] ${video} alt="${alt}"` : image ? `\n[image] ${image} alt="${alt}"` : ''));
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  // Optional media upload first.
  let media_ids;
  if (media) {
    const buf = readFileSync(media);
    const form = new FormData();
    // The MIME type must be explicit for video: without it Mastodon rejects the attachment. Animated
    // GIFs need it too — Mastodon turns them into soundless MP4s ("gifv") and sniffing an untyped
    // blob is not worth the risk. Plain stills keep working untyped (Mastodon sniffs them fine).
    // Note: Mastodon caps GIF *dimensions* at 1 MP, which is why compose-gif.mjs emits 864x1080.
    const MIME = { '.mp4': 'video/mp4', '.gif': 'image/gif', '.png': 'image/png', '.webp': 'image/webp' };
    const ext = media.slice(media.lastIndexOf('.')).toLowerCase();
    const type = MIME[ext];
    form.append('file', new Blob([buf], type ? { type } : undefined), basename(media));
    if (alt) form.append('description', alt);
    const mres = await fetch(`${instance}/api/v2/media`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    const mdata = await mres.json();
    if (!mres.ok) throw new Error(`media upload failed: ${JSON.stringify(mdata)}`);
    media_ids = [mdata.id];
    // 202 = accepted but still transcoding. Posting a status with an unprocessed id fails, so
    // poll v1/media/:id until it returns 200 (video only; images come back 200 straight away).
    if (mres.status === 202) {
      const deadline = Date.now() + 180_000;
      process.stdout.write('[..] mastodon transcoding');
      for (;;) {
        await new Promise((r) => setTimeout(r, 4000));
        const p = await fetch(`${instance}/api/v1/media/${mdata.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (p.status === 200) { process.stdout.write(' done\n'); break; }
        if (Date.now() > deadline) { process.stdout.write('\n'); throw new Error('media processing timed out (180s)'); }
        process.stdout.write('.');
      }
    }
  }

  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: text, visibility: 'public', language: 'en', ...(media_ids ? { media_ids } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(data).slice(0, 300) });
    throw new Error(`mastodon post failed: ${JSON.stringify(data)}`);
  }
  console.log(`[ok] mastodon → ${data.url}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: data.id, url: data.url });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
