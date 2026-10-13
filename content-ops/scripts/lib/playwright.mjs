// playwright.mjs — resolve Chromium from the dash's Playwright install (WSL2: direct Chromium, NOT the
// Firefox MCP which is broken here). Override with PLAYWRIGHT_PKG in .env.local if the dash path changes.
import { createRequire } from 'node:module';
import { readdirSync, existsSync } from 'node:fs';
import { env } from './env.mjs';

function resolvePlaywrightPkg() {
  const override = env('PLAYWRIGHT_PKG');
  if (override && existsSync(override)) return override;
  const pnpmDir = '/home/victor/Projects/dash/node_modules/.pnpm';
  if (existsSync(pnpmDir)) {
    const match = readdirSync(pnpmDir).find((d) => /^playwright@/.test(d));
    if (match) {
      const p = `${pnpmDir}/${match}/node_modules/playwright`;
      if (existsSync(p)) return p;
    }
  }
  const direct = '/home/victor/Projects/dash/node_modules/playwright';
  if (existsSync(direct)) return direct;
  throw new Error('playwright not found — set PLAYWRIGHT_PKG in content-ops/.env.local');
}

export function getChromium() {
  const pkg = resolvePlaywrightPkg();
  const require = createRequire(pkg + '/package.json');
  const { chromium } = require(pkg);
  return chromium;
}
