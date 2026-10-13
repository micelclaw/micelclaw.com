// env.mjs — load content-ops/.env.local (no deps) and expose helpers.
// process.env overrides the file (so cron/CI can inject). Zero external dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // .../content-ops/scripts/lib
export const CONTENT_OPS_ROOT = resolve(HERE, '..', '..'); // .../content-ops
export const REPO_ROOT = resolve(CONTENT_OPS_ROOT, '..'); // .../web/micelclaw.com

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      // Strip a trailing inline comment on unquoted values (" #..."). Tokens/URLs here never contain " #".
      const h = val.indexOf(' #');
      if (h !== -1) val = val.slice(0, h).trim();
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = parseEnvFile(join(CONTENT_OPS_ROOT, '.env.local'));
// Merge: file first, then real process.env wins.
const merged = { ...fileEnv, ...process.env };

export function env(key, fallback = '') {
  const v = merged[key];
  return v === undefined || v === '' ? fallback : v;
}

export function bool(key, fallback = false) {
  const v = env(key, fallback ? '1' : '0').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// Publishing switches. DRY_RUN forces no-API regardless of LIVE.
export const DRY_RUN = bool('DRY_RUN', true); // safe default: dry
export const LIVE = bool('LIVE', false); // safe default: shadow

// Should we actually hit the network? Only when explicitly LIVE and not DRY_RUN.
export function shouldPublish() {
  return LIVE && !DRY_RUN;
}

export function requireEnv(keys) {
  const missing = keys.filter((k) => !env(k));
  return { ok: missing.length === 0, missing };
}
