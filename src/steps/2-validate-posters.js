// STEP 2 — Check rendered posters: assets exist, text does not overflow, blocks don't collide, typography rules hold.
// Usage: node src/steps/2-validate-posters.js events/example.json [--template landscape|portrait|all]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, loadEvent, readJson } from '../lib/event.js';
import { listTemplates } from './1-render-posters.js';

const args = process.argv.slice(2);
const ev = loadEvent(args.find(a => !a.startsWith('--')));
const ti = args.indexOf('--template');
const which = ti >= 0 ? args[ti + 1] : 'all';
const problems = [];
const SHRINK_MIN = 0.85; // auto-fit may shrink a block at most 15%; beyond that the text is simply too long
const ORPHAN_MIN = 0.4; // typography rule: every line of a wrapped block must be >= 40% of its widest line

for (const p of [ev.speaker.photo, ev.qr, ...(ev.sponsors || []).map(s => s.logo)].filter(Boolean)) {
  if (!fs.existsSync(path.resolve(ROOT, p))) problems.push(`missing asset: ${p}`);
}

const browser = await chromium.launch();
for (const template of which === 'all' ? listTemplates() : [which]) {
  const meta = readJson(path.join(ROOT, 'templates/posters', template, 'meta.json'));
  const stem = path.join(ROOT, 'output', ev.slug, `${ev.slug}.${template}`);
  if (!fs.existsSync(stem + '.html')) { problems.push(`${template}: run render first (${stem}.html not found)`); continue; }

  const page = await browser.newPage({ viewport: { width: meta.width, height: meta.height } });
  // Offline guarantee: the poster must render from the local file alone. Anything else is a bug.
  await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : (console.error(`blocked network request: ${r.request().url()}`), r.abort()));
  await page.goto('file://' + stem + '.html');
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  const report = await page.evaluate(() => {
    const poster = document.getElementById('poster').getBoundingClientRect();
    const out = [];
    for (const el of document.querySelectorAll('#poster > *')) {
      if (el.tagName === 'IMG') continue; // decorative images may bleed off-canvas on purpose
      const r = el.getBoundingClientRect();
      out.push({
        id: el.id || el.className, right: Math.round(r.right), bottom: Math.round(r.bottom),
        overflow: r.right > poster.right + 0.5 || r.bottom > poster.bottom + 0.5 || r.left < poster.left - 0.5,
        clipped: el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible',
        lines: el.dataset.lines ? +el.dataset.lines : null, max: el.dataset.maxLines ? +el.dataset.maxLines : null,
        last: el.dataset.lastLineRatio ? +el.dataset.lastLineRatio : null,
        minLine: el.dataset.minLineRatio ? +el.dataset.minLineRatio : null,
        shrink: el.dataset.shrink ? +el.dataset.shrink : null,
      });
    }
    const blocks = [...document.querySelectorAll('[data-block]')].map(e => ({ i: e.id, r: e.getBoundingClientRect() }));
    const overlaps = [];
    for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++) {
      const A = blocks[a].r, B = blocks[b].r;
      const dy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (A.left < B.right && B.left < A.right && dy > 4) overlaps.push(`${blocks[a].i}/${blocks[b].i}`);
    }
    // text must not sit on top of the avatar
    const av = document.querySelector('.avatar')?.getBoundingClientRect();
    const onAvatar = av ? blocks.filter(({ r }) => r.left < av.right && av.left < r.right && r.top < av.bottom && av.top < r.bottom).map(b => b.i) : [];
    const imgs = [...document.images].map(i => ({ src: i.alt || i.className, ok: i.complete && i.naturalWidth > 0 }));
    return { out, overlaps, onAvatar, imgs };
  });
  await page.close();

  const P = (m) => problems.push(`${template}: ${m}`);
  for (const e of report.out) {
    if (e.overflow) P(`${e.id} overflows the canvas (right=${e.right}, bottom=${e.bottom})`);
    if (e.clipped) P(`${e.id} text is clipped`);
    if (e.shrink != null && e.shrink < SHRINK_MIN) P(`${e.id} had to shrink to ${Math.round(e.shrink * 100)}% to fit - too long, shorten the text (do not squeeze)`);
    if (e.max != null && e.lines > e.max) P(`${e.id} needs ${e.lines} lines, max ${e.max} - shorten the text`);
    if (e.lines > 1 && e.minLine != null && e.minLine < ORPHAN_MIN) P(`${e.id}: one line is only ${Math.round(e.minLine * 100)}% as wide as the widest (orphan / ragged wrap) - reword or move the line break, do not squeeze`);
  }
  for (const o of report.overlaps) P(`text blocks overlap: ${o}`);
  for (const b of report.onAvatar) P(`${b} overlaps the speaker photo`);
  for (const i of report.imgs) if (!i.ok) P(`image failed to load: ${i.src}`);

  if (fs.existsSync(stem + '.png')) {
    const buf = fs.readFileSync(stem + '.png');
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (Math.abs(w / h - meta.width / meta.height) > 0.002) P(`png aspect ${w}x${h} is not ${meta.width}:${meta.height}`);
    else console.log(`${template}: png ${w}x${h} ok`);
  } else P('png not found');
}
await browser.close();

if (problems.length) { console.error('FAIL\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('OK: no overflow, no clipping, no overlaps, all images loaded');
