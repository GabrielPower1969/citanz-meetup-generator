// STEP 0 (before anything else) — rank the topic backlog against what past events actually produced.
// Usage: node src/steps/0-pick-topics.js            → output/topics/选题-<today>.md
// Nothing is invented: every candidate's evidence is a path into some event's `results`, and it is resolved here.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from '../lib/event.js';
import { fill as fillTpl } from '../lib/template.js';
import { loadPastEvents, rank, harvestSeeds, harvestQuestions, audienceFacts, loadProfile } from '../lib/topics.js';

const fill = (t, ctx) => fillTpl(t, ctx, () => '—');
const cfg = readJson('config/topics.json');
const org = readJson('config/citanz.json');
const backlog = readJson('topics/backlog.json');
const events = loadPastEvents();
const profile = loadProfile();

// `npm run topics -- --track personal` ranks my own creator topics instead of CITANZ meetup topics.
const ti = process.argv.indexOf('--track');
const track = ti > -1 ? process.argv[ti + 1] : 'meetup';
const { ranked, unranked, delivered } = rank(backlog, events, cfg, new Date(), profile, track);
const speakerLine = (c) => c.speaker?.name ? `${c.speaker.name}（${c.speaker.status}）` : (c.speaker?.status && c.speaker.status !== 'none' ? c.speaker.status : '无');
const decorate = (c, i) => ({
  ...c, rank: i + 1,
  format: c.format || 'talk',
  speaker_line: speakerLine(c),
  blockers_line: c.blockers.join('；'),
});

// A 复盘 may propose a topic that never reached the backlog — say so instead of silently dropping it.
const norm = (s) => String(s).toLowerCase().replace(/[\s\p{P}]/gu, '');
const similar = (a, b) => { const A = new Set(norm(a)), B = new Set(norm(b)); const hit = [...A].filter(c => B.has(c)).length; return hit / Math.max(A.size, B.size, 1); };
const known = (backlog.candidates || []).map(c => c.topic);
const orphanSeeds = harvestSeeds(events).filter(s => !known.some(k => similar(k, s.topic) > 0.7));

const top = ranked.slice(0, cfg.shortlist.top_n).map(decorate);
const rest = ranked.slice(cfg.shortlist.top_n).map(decorate);
const questions = harvestQuestions(events);
const audience = audienceFacts(events, cfg);

const ctx = {
  org_name_zh: org.org_name_zh,
  report_date: new Date().toLocaleDateString('en-CA'),
  event_count: events.length,
  track,
  profile_window: profile ? `${profile.window.bilibili}（B站） · ${profile.window.youtube}（YouTube）` : '',
  top_n: cfg.shortlist.top_n,
  unranked_title: cfg.evidence.unranked_section_title,
  top, rest, questions, audience, delivered,
  unranked: unranked.map(decorate),
  speakers: (backlog.speakers || []).map(s => ({ ...s, topics_line: (s.topics || []).join('、') })),
  no_rest: !rest.length, no_unranked: !unranked.length, no_questions: !questions.length,
  no_audience: !audience.length, no_speakers: !(backlog.speakers || []).length, no_delivered: !delivered.length,
};

const dir = path.join(ROOT, 'output', 'topics');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `选题-${track}-${ctx.report_date}.md`);
fs.writeFileSync(file, fill(fs.readFileSync(path.join(ROOT, 'templates/copy/topics.md'), 'utf8'), ctx).replace(/\n{3,}/g, '\n\n'));

console.log(`wrote ${path.relative(ROOT, file)}`);
console.log(`  ${ranked.length} ranked · ${unranked.length} unverified · ${delivered.length} delivered · from ${events.length} event(s) with results`);
for (const c of top) console.log(`  ${c.rank}. ${c.total.toString().padStart(4)}  ${c.topic}${c.blockers.length ? `  ← 缺：${c.blockers.join('；')}` : ''}`);
if (orphanSeeds.length) {
  console.log(`  ${orphanSeeds.length} 条 复盘 里的 next_topics 还没进 backlog：`);
  for (const s of orphanSeeds) console.log(`    · ${s.topic}  (${s.origin})`);
}
if (!ranked.length) console.log('  没有可排名的候选——每个候选至少要有一条能解析的 evidence，见 topics/schema.json');
