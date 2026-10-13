#!/usr/bin/env node
// post-bluesky.mjs — publish a Bluesky post (AT Protocol). Rich-text facets for [label](url) links.
// Usage: node scripts/post-bluesky.mjs --file queue/2026-07-22/bluesky.md [--item slug] [--date YYYY-MM-DD]
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

// Build display text + rich-text facets from markdown links and bare URLs. Byte offsets are UTF-8.
function buildRichText(src) {
  const facets = [];
  let out = '';
  let last = 0;
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out += src.slice(last, m.index);
    const label = m[1] || m[3];
    const uri = m[2] || m[3];
    const byteStart = Buffer.byteLength(out, 'utf8');
    out += label;
    const byteEnd = Buffer.byteLength(out, 'utf8');
    facets.push({ index: { byteStart, byteEnd }, features: [{ $type: 'app.bsky.richtext.facet#link', uri }] });
    last = m.index + m[0].length;
  }
  out += src.slice(last);
  return { text: out.trim(), facets };
}

const PLATFORM = 'bluesky';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error('--file is required');
  const filePath = isAbsolute(args.file) ? args.file : resolve(CONTENT_OPS_ROOT, args.file);
  const item = args.item || basename(args.file).replace(/\.md$/, '');
  const date = args.date || new Date().toISOString().slice(0, 10);

  const { text: raw, meta } = parseQueueFile(readFileSync(filePath, 'utf8'));
  const { text, facets } = buildRichText(raw);
  if (!text) throw new Error(`empty post in ${args.file}`);
  if ([...text].length > 300) console.warn(`[warn] post is ~${[...text].length} chars (>300)`);

  if (alreadyPosted(PLATFORM, item, date)) {
    console.log(`[skip] already posted ${PLATFORM}/${item}/${date}`);
    return;
  }

  const { ok, missing } = requireEnv(['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD']);
  if (!ok) {
    console.log(`[skip] ${PLATFORM}: missing ${missing.join(', ')} — see platforms/bluesky.md`);
    record({ platform: PLATFORM, item, date, status: 'skipped', note: `missing ${missing.join(',')}` });
    return;
  }

  const service = env('BLUESKY_SERVICE', 'https://bsky.social').replace(/\/$/, '');
  const image = resolveImage(meta.image);
  const alt = meta.alt || '';

  if (!shouldPublish()) {
    console.log(`[dry] ${PLATFORM}/${item} → ${service}\n--- post (${[...text].length} chars, ${facets.length} link facets) ---\n${text}` +
      (image ? `\n[image] ${image} alt="${alt}"` : ''));
    record({ platform: PLATFORM, item, date, status: 'dry', note: DRY_RUN ? 'DRY_RUN' : 'not LIVE' });
    return;
  }

  // 1) session
  const sres = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: env('BLUESKY_HANDLE'), password: env('BLUESKY_APP_PASSWORD') }),
  });
  const session = await sres.json();
  if (!sres.ok) throw new Error(`bluesky session failed: ${JSON.stringify(session)}`);
  const auth = { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' };

  // 2) embed: external link card (preferred when meta.link present; thumb = meta.image) or plain image
  let embed;
  const uploadBlob = async (path) => {
    const buf = readFileSync(path);
    const mime = /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg';
    const bres = await fetch(`${service}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': mime }, body: buf,
    });
    const bdata = await bres.json();
    if (!bres.ok) throw new Error(`bluesky blob upload failed: ${JSON.stringify(bdata)}`);
    return bdata.blob;
  };
  if (meta.link) {
    let thumb;
    if (image) { try { thumb = await uploadBlob(image); } catch { /* card without thumb still works */ } }
    embed = { $type: 'app.bsky.embed.external', external: {
      uri: meta.link, title: meta.link_title || meta.link, description: meta.link_desc || '',
      ...(thumb ? { thumb } : {}),
    } };
  } else if (image) {
    embed = { $type: 'app.bsky.embed.images', images: [{ alt, image: await uploadBlob(image) }] };
  }

  const record_ = {
    $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString(), langs: ['en'],
    ...(facets.length ? { facets } : {}), ...(embed ? { embed } : {}),
  };
  const pres = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record: record_ }),
  });
  const pdata = await pres.json();
  if (!pres.ok) {
    record({ platform: PLATFORM, item, date, status: 'error', note: JSON.stringify(pdata).slice(0, 300) });
    throw new Error(`bluesky post failed: ${JSON.stringify(pdata)}`);
  }
  const rkey = (pdata.uri || '').split('/').pop();
  const url = `https://bsky.app/profile/${env('BLUESKY_HANDLE')}/post/${rkey}`;
  console.log(`[ok] bluesky → ${url}`);
  record({ platform: PLATFORM, item, date, status: 'posted', id: pdata.uri, url });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
