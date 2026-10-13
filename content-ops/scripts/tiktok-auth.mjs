#!/usr/bin/env node
// tiktok-auth.mjs — one-time OAuth. Step 1 prints the authorize URL; Step 2 exchanges the returned code.
// Usage:
//   node scripts/tiktok-auth.mjs                 # prints the authorize URL to open in a browser
//   node scripts/tiktok-auth.mjs --code <CODE>   # exchanges the ?code=... from the redirect for tokens
import { requireEnv } from './lib/env.mjs';
import { buildAuthUrl, exchangeCode, loadTokens } from './lib/tiktok-tokens.mjs';

function parseArgs(argv) { const a = {}; for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i]; return a; }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { ok, missing } = requireEnv(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI']);
  if (!ok) { console.error(`Missing ${missing.join(', ')} in .env.local — see platforms/tiktok.md`); process.exit(1); }

  if (args.code) {
    const t = await exchangeCode(decodeURIComponent(args.code));
    console.log('[ok] TikTok tokens saved to .tiktok-tokens.json');
    console.log(`  open_id: ${t.open_id}`);
    console.log(`  scope:   ${t.scope}`);
    console.log(`  access token valid ~${Math.round((t.access_expires_at - Date.now()) / 3600000)}h, refresh ~${Math.round((t.refresh_expires_at - Date.now()) / 86400000)}d`);
    return;
  }

  const existing = loadTokens();
  if (existing) console.log(`(tokens already present for open_id ${existing.open_id}; re-authorizing will overwrite them)\n`);
  console.log('1) Open this URL in a browser, authorize with the Micelclaw TikTok account:\n');
  console.log('   ' + buildAuthUrl());
  console.log('\n2) After authorizing, TikTok redirects to your callback with ?code=...  Copy that code and run:\n');
  console.log('   node scripts/tiktok-auth.mjs --code <THE_CODE>\n');
}

main().catch((e) => { console.error('[error]', e.message); process.exit(1); });
