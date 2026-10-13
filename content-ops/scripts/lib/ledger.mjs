// ledger.mjs — append-only publish ledger. Makes publishing idempotent.
// One JSON object per line in content-ops/posted/posted.jsonl.
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CONTENT_OPS_ROOT } from './env.mjs';

const LEDGER_PATH = join(CONTENT_OPS_ROOT, 'posted', 'posted.jsonl');

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

// Stable idempotency key. `item` = roadmap slug or a content hash; `date` = YYYY-MM-DD.
export function ledgerKey(platform, item, date) {
  return `${platform}::${item}::${date}`;
}

export function readLedger() {
  if (!existsSync(LEDGER_PATH)) return [];
  return readFileSync(LEDGER_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function alreadyPosted(platform, item, date) {
  const key = ledgerKey(platform, item, date);
  return readLedger().some((e) => e.key === key && e.status === 'posted');
}

// entry: { platform, item, date, status: 'posted'|'skipped'|'dry'|'draft'|'error', url?, id?, note?, ts }
export function record(entry) {
  ensureDir(LEDGER_PATH);
  const key = ledgerKey(entry.platform, entry.item, entry.date);
  const row = { key, ...entry, ts: entry.ts || new Date().toISOString() };
  appendFileSync(LEDGER_PATH, JSON.stringify(row) + '\n');
  return row;
}
