// One command for everything: make sure the environment exists, then render both posters,
// validate, and build the per-channel hand-off pack. Deterministic — no LLM involvement.
//   node src/build.js events/<event>.json
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ev = process.argv[2];
if (!ev) { console.error('Usage: npm run build events/<event>.json'); process.exit(2); }

const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' }); if (r.status) process.exit(r.status); };

// ---- environment self-check (idempotent, cheap when already set up) ----
const major = +process.versions.node.split('.')[0];
if (major < 20) { console.error(`Node ${process.versions.node} found; need Node 20+ (https://nodejs.org)`); process.exit(2); }
if (!fs.existsSync(path.join(ROOT, 'node_modules/playwright'))) { console.log('[env] installing npm dependencies…'); run('npm', ['ci', '--no-audit', '--no-fund']); }
const pwCache = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library/Caches/ms-playwright')
  : process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'ms-playwright') : path.join(os.homedir(), '.cache/ms-playwright'));
const hasChromium = fs.existsSync(pwCache) && fs.readdirSync(pwCache).some(d => d.startsWith('chromium'));
if (!hasChromium) { console.log('[env] downloading Chromium for Playwright (one-off, ~100 MB)…'); run('npx', ['playwright', 'install', 'chromium']); }
for (const f of ['Arimo-Regular.ttf', 'Arimo-Bold.ttf', 'NotoSansSC-Regular.otf', 'NotoSansSC-Bold.otf']) {
  if (!fs.existsSync(path.join(ROOT, 'assets/fonts', f))) { console.error(`[env] missing font assets/fonts/${f} — the repo checkout is incomplete`); process.exit(2); }
}

// ---- pipeline ----
for (const step of ['src/steps/1-render-posters.js', 'src/steps/2-validate-posters.js', 'src/steps/3-write-copy.js']) run('node', [step, ev]);
