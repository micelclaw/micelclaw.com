#!/usr/bin/env node
// unpublish.mjs — retract a published post via each platform's delete API. Reusable safety tool so the
// agent (or you) can pull a bad post. Verifies the target first, then deletes only when LIVE.
// Usage:
//   node scripts/unpublish.mjs --platform mastodon --id 116962559033376543 [--item slug --date YYYY-MM-DD]
//   node scripts/unpublish.mjs --platform bluesky  --id at://did:plc:.../app.bsky.feed.post/<rkey>
//   node scripts/unpublish.mjs --platform telegram --id 6 [--chat -1003809632664]
//   node scripts/unpublish.mjs --platform facebook --id 986769277864129_1221206...
// Guarded by the same LIVE/DRY_RUN switch as posting; --dry (or LIVE!=1) only verifies.
import { env, requireEnv, shouldPublish, DRY_RUN } from './lib/env.mjs';
import { record } from './lib/ledger.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
  return a;
}

async function verifyMastodon(instance, token, id) {
  const r = await fetch(`${instance}/api/v1/statuses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { ok: false, note: `GET ${r.status}` };
  const s = await r.json();
  const m = s.media_attachments?.[0]?.meta?.original;
  const dims = m ? `${m.width}x${m.height}` : 'no-media';
  return { ok: true, note: `"${(s.content || '').replace(/<[^>]+>/g, '').slice(0, 60)}…" [img ${dims}]` };
}
async function deleteMastodon(instance, token, id) {
  const r = await fetch(`${instance}/api/v1/statuses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`mastodon delete failed: ${r.status} ${JSON.stringify(d)}`);
  return true;
}

function parseAtUri(uri) {
  // at://did:plc:xxx/app.bsky.feed.post/<rkey>
  const m = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri || '');
  if (!m) return null;
  return { repo: m[1], collection: m[2], rkey: m[3] };
}
async function bskySession(service) {
  const r = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: env('BLUESKY_HANDLE'), password: env('BLUESKY_APP_PASSWORD') }),
  });
  const s = await r.json();
  if (!r.ok) throw new Error(`bluesky session failed: ${JSON.stringify(s)}`);
  return s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.platform || !args.id) throw new Error('--platform and --id are required');
  const platform = args.platform;
  const id = args.id;
  const item = args.item || 'manual';
  const date = args.date || new Date().toISOString().slice(0, 10);
  const live = shouldPublish() && !args.dry;

  let verify = { ok: true, note: '(no pre-check for this platform)' };

  if (platform === 'mastodon') {
    const { ok, missing } = requireEnv(['MASTODON_INSTANCE', 'MASTODON_ACCESS_TOKEN']);
    if (!ok) throw new Error(`missing ${missing.join(',')}`);
    const instance = env('MASTODON_INSTANCE').replace(/\/$/, ''); const token = env('MASTODON_ACCESS_TOKEN');
    verify = await verifyMastodon(instance, token, id);
    console.log(`[verify] mastodon ${id} → ${verify.note}`);
    if (!live) { console.log(`[dry] would DELETE mastodon/${id}`); record({ platform, item, date, status: 'dry', note: 'unpublish dry' }); return; }
    await deleteMastodon(instance, token, id);
  } else if (platform === 'bluesky') {
    const { ok, missing } = requireEnv(['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD']);
    if (!ok) throw new Error(`missing ${missing.join(',')}`);
    const service = env('BLUESKY_SERVICE', 'https://bsky.social').replace(/\/$/, '');
    const parts = parseAtUri(id);
    if (!parts) throw new Error(`bluesky --id must be an at:// URI, got ${id}`);
    const session = await bskySession(service);
    const gr = await fetch(`${service}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(parts.repo)}&collection=${encodeURIComponent(parts.collection)}&rkey=${encodeURIComponent(parts.rkey)}`);
    const grd = await gr.json().catch(() => ({}));
    verify = { ok: gr.ok, note: gr.ok ? `"${(grd.value?.text || '').slice(0, 60)}…"` : `getRecord ${gr.status}` };
    console.log(`[verify] bluesky ${parts.rkey} → ${verify.note}`);
    if (!live) { console.log(`[dry] would DELETE bluesky/${parts.rkey}`); record({ platform, item, date, status: 'dry', note: 'unpublish dry' }); return; }
    const dr = await fetch(`${service}/xrpc/com.atproto.repo.deleteRecord`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: parts.repo, collection: parts.collection, rkey: parts.rkey }),
    });
    if (!dr.ok) { const e = await dr.json().catch(() => ({})); throw new Error(`bluesky delete failed: ${JSON.stringify(e)}`); }
  } else if (platform === 'telegram') {
    const { ok, missing } = requireEnv(['TELEGRAM_BOT_TOKEN']);
    if (!ok) throw new Error(`missing ${missing.join(',')}`);
    const token = env('TELEGRAM_BOT_TOKEN'); const chat = args.chat || env('TELEGRAM_CHAT_ID');
    console.log(`[verify] telegram msg ${id} in ${chat} (no GET API; deleting by id)`);
    if (!live) { console.log(`[dry] would DELETE telegram msg ${id}`); record({ platform, item, date, status: 'dry', note: 'unpublish dry' }); return; }
    const r = await fetch(`https://api.telegram.org/bot${token}/deleteMessage?chat_id=${encodeURIComponent(chat)}&message_id=${encodeURIComponent(id)}`);
    const d = await r.json();
    if (!d.ok) throw new Error(`telegram delete failed: ${JSON.stringify(d)}`);
  } else if (platform === 'facebook') {
    const { ok, missing } = requireEnv(['FACEBOOK_PAGE_ACCESS_TOKEN']);
    if (!ok) throw new Error(`missing ${missing.join(',')}`);
    const token = env('FACEBOOK_PAGE_ACCESS_TOKEN'); const gv = env('META_GRAPH_VERSION', 'v21.0');
    const g = await fetch(`https://graph.facebook.com/${gv}/${id}?fields=message,created_time&access_token=${encodeURIComponent(token)}`);
    const gd = await g.json().catch(() => ({}));
    verify = { ok: g.ok, note: g.ok ? `"${(gd.message || '').slice(0, 60)}…" (${gd.created_time || ''})` : `GET ${g.status}` };
    console.log(`[verify] facebook ${id} → ${verify.note}`);
    if (!live) { console.log(`[dry] would DELETE facebook/${id}`); record({ platform, item, date, status: 'dry', note: 'unpublish dry' }); return; }
    const r = await fetch(`https://graph.facebook.com/${gv}/${id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.success === false) throw new Error(`facebook delete failed: ${JSON.stringify(d)}`);
  } else {
    throw new Error(`unknown platform: ${platform}`);
  }

  console.log(`[ok] deleted ${platform}/${id}`);
  record({ platform, item, date, status: 'deleted', id, note: `unpublish (was: ${verify.note})` });
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
