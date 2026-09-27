// The topic backlog: evidence must resolve, scoring must be reproducible, and nothing unverified may be ranked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../src/lib/event.js';
import { resolvePath, checkEvidence, scoreCandidate, recencyPenalty, rank, harvestSeeds } from '../src/lib/topics.js';

const cfg = readJson('config/topics.json');
const EVENTS = [{
  slug: '2026-01-01-demo-speaker',
  topic: 'demo', title: 'A Demo Talk',
  results: {
    meetup: { rsvps: 20, checked: '2026-01-05', source: 'meetup.com → Attendees' },
    qa_questions: [{ q: 'how do I start?', theme: 'onboarding' }],
    next_topics: [{ topic: 'Follow-up', why: 'asked twice', evidence: 'qa_questions[0]' }],
  },
}];
const PROFILE = { consumption: { career_finish_pct: 69, checked: '2026-09-27', source: 'bilibili export' }, loose: 1 };

test('resolvePath walks objects and array indices', () => {
  assert.equal(resolvePath(EVENTS[0].results, 'meetup.rsvps'), 20);
  assert.equal(resolvePath(EVENTS[0].results, 'qa_questions[0].q'), 'how do I start?');
  assert.equal(resolvePath(EVENTS[0].results, 'qa_questions[9].q'), undefined);
});

test('evidence grading: A needs checked+source, B resolves without them, D does not resolve', () => {
  assert.equal(checkEvidence('2026-01-01-demo-speaker:meetup.rsvps', EVENTS).grade, 'A');
  assert.equal(checkEvidence('2026-01-01-demo-speaker:qa_questions[0].q', EVENTS).grade, 'B');
  assert.equal(checkEvidence('2026-01-01-demo-speaker:meetup.nope', EVENTS).grade, 'D');
  assert.equal(checkEvidence('no-such-event:meetup.rsvps', EVENTS).grade, 'D');
  assert.equal(checkEvidence('just a claim', EVENTS).grade, 'D');
});

test('me: refs resolve against the self-profile and are graded the same way', () => {
  assert.equal(checkEvidence('me:consumption.career_finish_pct', EVENTS, PROFILE).grade, 'A');
  assert.equal(checkEvidence('me:loose', EVENTS, PROFILE).grade, 'B');
  assert.equal(checkEvidence('me:consumption.missing', EVENTS, PROFILE).grade, 'D');
  assert.equal(checkEvidence('me:anything', EVENTS, null).grade, 'D');
});

test('a candidate with no resolvable evidence is never ranked', () => {
  const c = scoreCandidate({ topic: 'Vibes', evidence: ['I think it would be cool'] }, EVENTS, cfg);
  assert.equal(c.rankable, false);
  assert.ok(c.blockers.includes('没有可核实的证据'));
  const { ranked, unranked } = rank({ candidates: [{ topic: 'Vibes', evidence: ['gut feeling'] }] }, EVENTS, cfg);
  assert.equal(ranked.length, 0);
  assert.equal(unranked.length, 1);
});

test('score = Σ(raw × weight) and every component shows its inputs', () => {
  const c = scoreCandidate({
    topic: 'Something New', format: 'workshop',
    evidence: ['2026-01-01-demo-speaker:meetup.rsvps', '2026-01-01-demo-speaker:qa_questions[0].q'],
    audience_fit: 4, audience_fit_why: 'because', channel_pull: 2, channel_pull_why: 'because',
    speaker: { name: 'X', status: 'confirmed' },
  }, EVENTS, cfg, new Date('2026-09-27'));
  assert.equal(c.verified_count, 2);
  assert.equal(c.total, c.components.reduce((s, x) => s + x.points, 0));
  for (const comp of c.components) {
    assert.equal(comp.points, Number((comp.raw * comp.weight).toFixed(1)));
    assert.ok(comp.note, `${comp.key} must explain itself`);
  }
  assert.equal(c.components.find(x => x.key === 'speaker').raw, cfg.speaker_points.confirmed);
  assert.equal(c.components.find(x => x.key === 'effort').raw, cfg.effort_points.workshop);
});

test('a topic close to a recent event is penalised; an unrelated one is not', () => {
  const near = recencyPenalty({ topic: 'A Demo Talk about demo things' }, EVENTS, cfg, new Date('2026-02-01'));
  assert.ok(near.points < 0 && near.why.includes('2026-01-01-demo-speaker'));
  assert.equal(recencyPenalty({ topic: 'Knitting for beginners' }, EVENTS, cfg, new Date('2026-02-01')).points, 0);
});

test('next_topics written in a 复盘 are harvested as seeds that keep their origin', () => {
  const seeds = harvestSeeds(EVENTS);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0].origin, '2026-01-01-demo-speaker:next_topics[0]');
});

test('the real backlog is well-formed: every candidate cites evidence and declared scores carry a reason', () => {
  const backlog = readJson('topics/backlog.json');
  for (const c of backlog.candidates) {
    assert.ok(c.topic, 'candidate needs a topic');
    assert.ok(Array.isArray(c.evidence) && c.evidence.length, `${c.topic}: evidence is required`);
    if (c.audience_fit) assert.ok(c.audience_fit_why, `${c.topic}: audience_fit needs audience_fit_why`);
    if (c.channel_pull) assert.ok(c.channel_pull_why, `${c.topic}: channel_pull needs channel_pull_why`);
    if (c.status && c.status !== 'candidate') assert.ok(c.event || c.dropped_why, `${c.topic}: ${c.status} needs event or dropped_why`);
  }
});
