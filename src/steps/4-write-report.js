// STEP 4 (post-event, optional) — turn the `results` block of an event JSON into a 复盘 report.
// Usage: node src/steps/4-write-report.js events/<event>.json
// Numbers are never invented: every metric row carries the date it was checked and the page it came from.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadEvent, readJson } from '../lib/event.js';
import { fill as fillTpl } from '../lib/template.js';
const fill = (t, ctx) => fillTpl(t, ctx, () => '—');

const ev = loadEvent(process.argv[2]);
const cfg = readJson('config/citanz.json');
const R = ev.results;
if (!R) { console.error('events/<event>.json has no `results` block yet — see .claude/skills/event-analytics/SKILL.md'); process.exit(2); }


// Flatten results.<channel>.<metric> into table rows; `url` and `checked` are metadata, not metrics.
const metrics = [];
for (const [ch, data] of Object.entries(R)) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
  for (const [k, v] of Object.entries(data)) {
    if (['url', 'checked', 'source'].includes(k) || typeof v === 'object') continue;
    metrics.push({ channel: cfg.handoff_naming.channel_labels[ch] || ch, metric: k, value: v, checked: data.checked || '—', source: data.source || data.url || '—' });
  }
}
const ctx = {
  ...ev, results: R, metrics,
  title_plain: ev.title.replace(/\n/g, ' '),
  speaker_name: ev.speaker.name, speaker_org: ev.speaker.org || '',
  venue_inline: (ev.venue_full || ev.venue).replace(/\n/g, ', '),
  report_date: new Date().toLocaleDateString('en-CA'),
  attendance_rate: R.meetup?.attended && R.meetup?.rsvps ? Math.round(100 * R.meetup.attended / R.meetup.rsvps) : '',
  no_feedback: !(R.feedback && R.feedback.length), no_observations: !(R.observations && R.observations.length),
};
const dir = path.join(ROOT, 'output', ev.slug, 'report'); fs.mkdirSync(dir, { recursive: true });
const topic = ev.topic || ev.slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
const file = path.join(dir, `复盘-post-${topic}-${ev.slug.slice(0, 10)}.md`);
fs.writeFileSync(file, fill(fs.readFileSync(path.join(ROOT, 'templates/copy/report.md'), 'utf8'), ctx).replace(/\n{3,}/g, '\n\n'));
console.log(`wrote ${path.relative(ROOT, file)} (${metrics.length} metric rows, ${(R.feedback || []).length} quotes)`);
