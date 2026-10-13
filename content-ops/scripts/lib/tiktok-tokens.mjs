// tiktok-tokens.mjs — TikTok OAuth token store + refresh. Tokens rotate; we persist the new refresh token
// every time or the 365-day chain snaps. Token file is gitignored (.tiktok-tokens.json).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { env, CONTENT_OPS_ROOT } from './env.mjs';

const TOKEN_PATH = join(CONTENT_OPS_ROOT, '.tiktok-tokens.json');
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

export function loadTokens() {
  if (!existsSync(TOKEN_PATH)) return null;
  try { return JSON.parse(readFileSync(TOKEN_PATH, 'utf8')); } catch { return null; }
}
export function saveTokens(t) {
  writeFileSync(TOKEN_PATH, JSON.stringify(t, null, 2));
}

export function buildAuthUrl(state = 'micelclaw') {
  const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
  u.searchParams.set('client_key', env('TIKTOK_CLIENT_KEY'));
  u.searchParams.set('scope', env('TIKTOK_SCOPE', 'video.upload,user.info.basic'));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', env('TIKTOK_REDIRECT_URI'));
  u.searchParams.set('state', state);
  return u.toString();
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (data.error || !data.access_token) throw new Error(`tiktok token error: ${JSON.stringify(data.error || data)}`);
  return data;
}

function persist(d) {
  const now = Date.now();
  const t = {
    access_token: d.access_token,
    access_expires_at: now + (d.expires_in || 0) * 1000,
    refresh_token: d.refresh_token,
    refresh_expires_at: now + (d.refresh_expires_in || 0) * 1000,
    open_id: d.open_id,
    scope: d.scope,
  };
  saveTokens(t);
  return t;
}

// One-time: swap the authorization code (from the redirect) for tokens.
export async function exchangeCode(code) {
  return persist(await tokenRequest({
    client_key: env('TIKTOK_CLIENT_KEY'),
    client_secret: env('TIKTOK_CLIENT_SECRET'),
    code,
    grant_type: 'authorization_code',
    redirect_uri: env('TIKTOK_REDIRECT_URI'),
  }));
}

// Returns a valid access token, refreshing (and persisting the rotated refresh token) when near expiry.
export async function ensureFreshAccessToken() {
  let t = loadTokens();
  if (!t) throw new Error('no TikTok tokens — run `node scripts/tiktok-auth.mjs` first');
  if (Date.now() >= t.access_expires_at - 60_000) {
    if (Date.now() >= t.refresh_expires_at) {
      throw new Error('TikTok refresh token expired (365d) — re-authorize with `node scripts/tiktok-auth.mjs`');
    }
    t = persist(await tokenRequest({
      client_key: env('TIKTOK_CLIENT_KEY'),
      client_secret: env('TIKTOK_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token,
    }));
  }
  return t.access_token;
}
