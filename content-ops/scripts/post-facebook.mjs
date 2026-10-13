#!/usr/bin/env node
// post-facebook.mjs — publish to a Facebook Page (Graph API). Skips with a notice if not configured.
// Usage: node scripts/post-facebook.mjs --file queue/2026-07-22/facebook.md [--item slug] [--date YYYY-MM-DD]
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

const PLATFORM = 'facebook';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  if (!text) throw new Error(`empty message in ${args.file}`);

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — complete the Meta setup (platforms/facebook.md)`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  const v = env('META_GRAPH_VERSION', 'v21.0');
  const pageId = env('FACEBOOK_PAGE_ID');
  const token = env('FACEBOOK_PAGE_ACCESS_TOKEN');
  const localImage = resolveImage(meta.image);
  const imageUrl = meta.image_url || '';
  const localVideo = resolveImage(meta.video);
  const videoUrl = meta.video_url || '';
  const link = meta.link || '';

  const mode = localVideo || videoUrl ? 'video' : localImage || imageUrl ? 'photo' : 'feed';
  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → page ${pageId} (${mode})\n--- message ---\n${text}` +
      (link ? `\n[link] ${link}` : '') + (localVideo ? `\n[video file] ${localVideo}` : videoUrl ? `\n[video url] ${videoUrl}` : '') +
      (localImage ? `\n[photo file] ${localImage}` : imageUrl ? `\n[photo url] ${imageUrl}` : ''));
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  let res, data;
  if (mode === 'video') {
    // /videos posts to the Page's video tab and the feed. (Reels live behind /video_reels with a
    // 3-step resumable upload — not worth it while a single vertical clip fits here fine.)
    if (localVideo) {
      const form = new FormData();
      form.append('description', text);
      form.append('access_token', token);
      form.append('source', new Blob([readFileSync(localVideo)]), basename(localVideo));
      res = await fetch(`https://graph.facebook.com/${v}/${pageId}/videos`, { method: 'POST', body: form });
    } else {
      res = await fetch(`https://graph.facebook.com/${v}/${pageId}/videos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, file_url: videoUrl, access_token: token }),
      });
    }
  } else if (mode === 'photo') {
    if (localImage) {
      const form = new FormData();
      form.append('caption', text);
      form.append('access_token', token);
      form.append('source', new Blob([readFileSync(localImage)]), basename(localImage));
      res = await fetch(`https://graph.facebook.com/${v}/${pageId}/photos`, { method: 'POST', body: form });
    } else {
      res = await fetch(`https://graph.facebook.com/${v}/${pageId}/photos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: text, url: imageUrl, access_token: token }),
      });
    }
  } else {
    res = await fetch(`https://graph.facebook.com/${v}/${pageId}/feed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, ...(link ? { link } : {}), access_token: token }),
    });
  }
  data = await res.json();
  if (!res.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(data).slice(0, 300) });
    throw new Error(`facebook post failed: ${JSON.stringify(data)}`);
  }
  const postId = data.post_id || data.id;
  const url = `https://facebook.com/${postId}`;
  console.log(`[ok] facebook → ${url}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: postId, url });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
