import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(p) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
}

export function loadEvent(argPath) {
  if (!argPath) throw new Error('Usage: node src/render.js data/<event>.json');
  const ev = readJson(argPath);
  for (const k of ['slug', 'title', 'speaker', 'date', 'time', 'venue']) {
    if (!ev[k]) throw new Error(`event.${k} is required (${argPath})`);
  }
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(ev.slug)) throw new Error(`slug must be <date>-<topic>-<speaker>, e.g. 2026-10-15-agent-security-ke-he (got ${ev.slug})`);
  if (!ev.speaker.photo) throw new Error('speaker.photo is required — every event needs a speaker photo');
  if (!fs.existsSync(path.resolve(ROOT, ev.speaker.photo))) throw new Error(`speaker photo not found: ${ev.speaker.photo}`);
  return ev;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ttf': 'font/ttf' };

/** Inline a file as a data: URI so output/*.html is self-contained. */
export function dataUri(relOrAbs) {
  const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.resolve(ROOT, relOrAbs);
  if (!fs.existsSync(abs)) throw new Error(`missing asset: ${relOrAbs}`);
  const mime = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
}

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
