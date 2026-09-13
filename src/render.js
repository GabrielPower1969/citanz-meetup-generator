// Render one event JSON -> output/<slug>/<slug>.<template>.html + .png
// Usage: node src/render.js data/example.json [--template landscape|portrait|all] [--scale 2]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { ROOT, loadEvent, dataUri, esc, readJson } from './lib.js';

const args = process.argv.slice(2);
const eventPath = args.find(a => !a.startsWith('--'));
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };

export function listTemplates() {
  return fs.readdirSync(path.join(ROOT, 'templates'), { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(ROOT, 'templates', d.name, 'meta.json'))).map(d => d.name);
}

/** Field values a template may reference as {{var}}. Chinese templates read ev.zh.* first. */
async function templateVars(ev, meta) {
  const zh = ev.zh || {};
  const isZh = meta.lang === 'zh';
  const title = isZh ? (zh.title || ev.title) : ev.title;
  const qrSrc = ev.qr_url
    ? await QRCode.toDataURL(ev.qr_url, { margin: 1, width: 408, errorCorrectionLevel: 'M' })
    : dataUri(ev.qr || 'assets/brand/citanz-qr.png');
  const sponsorsHtml = (ev.sponsors || [])
    .map(s => `<img src="${dataUri(s.logo)}" alt="${esc(s.name)}">`).join('');
  return {
    title: esc(title),
    title_plain: esc(title.replace(/\n/g, ' ')),
    speaker_name: esc(ev.speaker.name),
    speaker_org: esc(ev.speaker.org || ''),
    speaker_photo: dataUri(ev.speaker.photo || 'assets/speakers/placeholder.png'),
    date: esc(ev.date),
    time: esc(ev.time),
    date_time: esc(isZh ? (zh.date_time || `${ev.date} ${ev.time}`) : `${ev.date} ${ev.time}`),
    venue: esc(isZh ? (zh.venue || ev.venue) : ev.venue),
    sponsors_html: sponsorsHtml,
    qr_src: qrSrc,
    shared_js: 'data:text/javascript;base64,' + fs.readFileSync(path.join(ROOT, 'templates/fit.js')).toString('base64'),
  };
}

export async function buildHtml(ev, templateName) {
  const dir = path.join(ROOT, 'templates', templateName);
  const meta = readJson(path.join(dir, 'meta.json'));
  let html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
  const vars = await templateVars(ev, meta);
  html = html.replace(/\{\{asset:([^}]+)\}\}/g, (_, p) => dataUri('assets/' + p));
  html = html.replace(/\{\{font:([^}]+)\}\}/g, (_, p) => dataUri('assets/fonts/' + p));
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`template var not provided: ${k}`);
    return vars[k];
  });
  return { html, meta };
}

export async function renderPng(htmlPath, pngPath, { width, height, scale = 2 }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  // Offline guarantee: the poster must render from the local file alone. Anything else is a bug.
  await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : (console.error(`blocked network request: ${r.request().url()}`), r.abort()));
  await page.goto('file://' + htmlPath);
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.locator('#poster').screenshot({ path: pngPath, type: 'png' });
  const fit = await page.evaluate(() =>
    [...document.querySelectorAll('[data-block]')].map(e => ({ id: e.id, lines: +e.dataset.lines, fontSize: +e.dataset.fontSize || null, last: +e.dataset.lastLineRatio, min: +e.dataset.minLineRatio })));
  await browser.close();
  return fit;
}

export async function renderEvent(ev, templateName, scale) {
  const { html, meta } = await buildHtml(ev, templateName);
  const outDir = path.join(ROOT, 'output', ev.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const stem = path.join(outDir, `${ev.slug}.${templateName}`);
  fs.writeFileSync(stem + '.html', html);
  const fit = await renderPng(stem + '.html', stem + '.png', { ...meta, scale });
  console.log(`wrote ${path.relative(ROOT, stem)}.png (${meta.width * scale}x${meta.height * scale})`);
  for (const f of fit) if (f.lines > 1) console.log(`  ${f.id}: ${f.lines} lines${f.fontSize ? `, font ${f.fontSize}px` : ''}, narrowest line ${Math.round(f.min * 100)}% of widest`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ev = loadEvent(eventPath);
  const scale = Number(opt('scale', 2));
  const which = opt('template', 'all');
  for (const t of which === 'all' ? listTemplates() : [which]) await renderEvent(ev, t, scale);
}
