#!/usr/bin/env node
// meta-setup.mjs — one-time helper. Turns a short-lived Graph API Explorer USER token into the
// long-lived Page Access Token + Page ID + Instagram Business user id that Facebook/Instagram posting needs.
//
// Do this once in Meta (manual, only you can):
//   1. developers.facebook.com → Create App → type "Business". Note App ID + App Secret (Settings → Basic).
//   2. Link your IG Business/Creator account to your Facebook Page (Meta Business Suite → Settings → linked accounts).
//   3. Graph API Explorer (developers.facebook.com/tools/explorer): pick your app → "Generate Access Token"
//      with scopes: pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic,
//      instagram_content_publish, business_management. Copy the (short-lived) USER token.
// Then give me the App ID, App Secret and that token; I run this.
//
// Usage:
//   META_APP_ID=.. META_APP_SECRET=.. node scripts/meta-setup.mjs --token <short user token>
//   ... --page <page-id>     # also print the exact .env.local lines for that page
import { env } from './lib/env.mjs';

const V = env('META_GRAPH_VERSION', 'v21.0');
function parseArgs(argv) { const a = {}; for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i]; return a; }
async function g(path, params) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.message} (code ${j.error.code})`);
  return j;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appId = env('META_APP_ID'), secret = env('META_APP_SECRET');
  const shortTok = args.token || env('META_USER_TOKEN');
  if (!appId || !secret || !shortTok) {
    console.error('Need META_APP_ID + META_APP_SECRET (env) and --token <short-lived user token>.');
    process.exit(1);
  }

  // 1) short-lived user token → long-lived user token (~60 days)
  const ll = await g('oauth/access_token', {
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: shortTok,
  });
  const userTok = ll.access_token;
  console.log(`long-lived user token obtained (~${Math.round((ll.expires_in || 0) / 86400)}d).`);

  // 2) pages the user administers, with their (long-lived) page tokens + linked IG account
  const pages = await g('me/accounts', {
    fields: 'name,access_token,instagram_business_account{id,username}', access_token: userTok,
  });
  console.log('\nPages you manage:');
  for (const p of pages.data || []) {
    const ig = p.instagram_business_account
      ? `@${p.instagram_business_account.username || ''} (${p.instagram_business_account.id})`
      : '(no IG Business account linked)';
    console.log(`  - ${p.name}  |  page_id=${p.id}  |  IG=${ig}`);
  }
  if (!(pages.data || []).length) console.log('  (none — is the user an admin of the Page? are the scopes granted?)');

  // 3) if a page is chosen, print the exact env lines (page token is long-lived / non-expiring for a Business app)
  if (args.page) {
    const p = (pages.data || []).find((x) => x.id === args.page);
    if (!p) { console.error('\npage id not found among your pages.'); process.exit(1); }
    console.log('\n--- values for .env.local ---');
    console.log('FACEBOOK_PAGE_ID=' + p.id);
    console.log('FACEBOOK_PAGE_ACCESS_TOKEN=' + p.access_token);
    if (p.instagram_business_account) console.log('INSTAGRAM_USER_ID=' + p.instagram_business_account.id);
    else console.log('# (no IG linked — link it to the Page, then re-run)');
    console.log('-----------------------------');
  } else {
    console.log('\nRe-run with `--page <page_id>` to print the .env.local lines for that page.');
  }
}
main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
