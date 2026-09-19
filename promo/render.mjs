// Render promo/index.html to MP4 (and optional GIF) frame-by-frame, deterministically.
//   node promo/render.mjs [--w 1080] [--h 1350] [--fps 30] [--out promo/out/promo-4x5.mp4] [--gif] [--from 0] [--to 42] [--stills 0,5,10]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const W = +arg('w', 1080), H = +arg('h', 1350), FPS = +arg('fps', 30);
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(arg('out', path.join(here, 'out', `promo-${W}x${H}.mp4`)));
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'index.html'));
await page.evaluate(() => window.__ready);
await page.evaluate(() => window.__pause());
const total = await page.evaluate(() => window.__duration);
const from = +arg('from', 0), to = +arg('to', total);

if (has('stills')) {                       // quick look: a few PNGs at given seconds
  for (const t of arg('stills', '0').split(',').map(Number)) {
    await page.evaluate(ms => window.__seek(ms), t * 1000);
    await page.screenshot({ path: path.join(here, 'out', `still-${String(t).replace('.', '_')}s.png`) });
  }
  await browser.close(); process.exit(0);
}

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round((to - from) * FPS);
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(ms => window.__seek(ms), (from + i / FPS) * 1000);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % FPS === 0) process.stdout.write(`\r${i}/${frames} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`\nwrote ${path.relative(process.cwd(), out)}  (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${frames} frames @ ${FPS} fps)`);

if (has('gif')) {                          // small looping preview for chat / README
  const gif = out.replace(/\.mp4$/, '.gif');
  await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf',
    `fps=12,scale=${Math.round(W / 2)}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4`, gif], { stdio: 'inherit' }).on('close', r));
  console.log(`wrote ${path.relative(process.cwd(), gif)}  (${(fs.statSync(gif).size / 1e6).toFixed(1)} MB)`);
}
