// Topic backlog: harvest signals from every past event, verify each candidate's evidence, score, rank.
// Shared by src/steps/0-pick-topics.js and the tests. No judgement here — only things a machine can check.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from './event.js';

/** The self-profile (topics/profile.json): what I watch, work on and have already published. Optional. */
export function loadProfile() {
  try { return readJson('topics/profile.json'); } catch { return null; }
}

/** Every events/*.json that has a `results` block, newest first. Raw read: real events are git-ignored and may lack assets. */
export function loadPastEvents() {
  const dir = path.join(ROOT, 'events');
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'schema.json')
    .map(f => { try { return { file: `events/${f}`, ...readJson(`events/${f}`) }; } catch { return null; } })
    .filter(ev => ev && ev.slug && ev.results)
    .sort((a, b) => b.slug.localeCompare(a.slug));
}

/** Resolve "qa_questions[3].q" inside a results object. Returns undefined if any step is missing. */
export function resolvePath(results, p) {
  return p.split('.').reduce((o, seg) => {
    if (o == null) return undefined;
    const m = seg.match(/^([\w$]+)(?:\[(\d+)\])?$/);
    if (!m) return undefined;
    const v = o[m[1]];
    return m[2] === undefined ? v : (Array.isArray(v) ? v[Number(m[2])] : undefined);
  }, results);
}

const asText = (v) => v == null ? '' : (typeof v === 'object' ? (v.q || v.quote || v.topic || JSON.stringify(v)) : String(v));

/**
 * Verify one evidence ref. Returns { ref, grade, text, event, ok }.
 *   A = resolves and the results block it sits in carries checked + source
 *   B = resolves, but that block has no provenance metadata (qa_questions / feedback / observations)
 *   D = does not resolve — free text, treated as an unverified claim
 */
export function checkEvidence(ref, events, profile = null) {
  const i = String(ref).indexOf(':');
  if (i < 0) return { ref, grade: 'D', text: String(ref), event: null, ok: false };
  const slug = ref.slice(0, i).trim(), p = ref.slice(i + 1).trim();

  // `me:` resolves into the self-profile — the other half of the flywheel: what I consume, build and have already published.
  if (slug === 'me') {
    if (!profile) return { ref, grade: 'D', text: 'topics/profile.json 不存在', event: 'me', ok: false };
    const value = resolvePath(profile, p);
    if (value === undefined) return { ref, grade: 'D', text: `profile 里没有 ${p}`, event: 'me', ok: false };
    const blk = profile[p.split(/[.[]/)[0]];
    const prov = blk && typeof blk === 'object' && blk.checked && blk.source;
    return { ref, event: 'me', ok: true, grade: prov ? 'A' : 'B', text: asText(value), checked: prov ? blk.checked : '', source: prov ? blk.source : '' };
  }

  const ev = events.find(e => e.slug === slug);
  if (!ev) return { ref, grade: 'D', text: `未知活动 ${slug}`, event: slug, ok: false };
  const value = resolvePath(ev.results, p);
  if (value === undefined) return { ref, grade: 'D', text: `${slug} 的 results 里没有 ${p}`, event: slug, ok: false };
  const block = ev.results[p.split(/[.[]/)[0]];
  const hasProvenance = block && !Array.isArray(block) && typeof block === 'object' && block.checked && block.source;
  return {
    ref, event: slug, ok: true,
    grade: hasProvenance ? 'A' : 'B',
    text: asText(value),
    checked: hasProvenance ? block.checked : (ev.results.notion_qa_url ? '逐字稿' : ''),
    source: hasProvenance ? block.source : '',
  };
}

const GRADE_RANK = { A: 3, B: 2, D: 0 };
const words = (s, stop) => [...new Set(String(s).toLowerCase().match(/[a-z]{3,}|[一-龥]{2,}/g) || [])].filter(w => !stop.includes(w));

/** -5 (scaled by age) if a past event already covered this, so the backlog cannot quietly repeat itself. */
export function recencyPenalty(candidate, events, cfg, today = new Date()) {
  const { window_months, min_overlap, penalty, stopwords } = cfg.recency;
  const mine = words(`${candidate.topic} ${candidate.angle || ''}`, stopwords);
  let worst = { points: 0, why: '' };
  for (const ev of events) {
    const months = (today - new Date(ev.slug.slice(0, 10))) / (1000 * 60 * 60 * 24 * 30.4);
    if (months < 0 || months > window_months) continue;
    const theirs = words(`${ev.topic || ''} ${(ev.title || '').replace(/\n/g, ' ')}`, stopwords);
    const shared = mine.filter(w => theirs.includes(w));
    if (shared.length < min_overlap) continue;
    const points = penalty * (1 - months / window_months);
    if (points < worst.points) worst = { points, why: `与 ${ev.slug}（${Math.round(months)} 个月前）重合：${shared.join('、')}` };
  }
  return worst;
}

/** Score one candidate. Every component records the inputs it used, so the shortlist can print the arithmetic. */
export function scoreCandidate(candidate, events, cfg, today = new Date(), profile = null) {
  const evidence = (candidate.evidence || []).map(ref => checkEvidence(ref, events, profile));
  const verified = evidence.filter(e => GRADE_RANK[e.grade] >= GRADE_RANK[cfg.evidence.min_grade_to_rank]);

  const demand = Math.min(5, verified.length);
  const speakerStatus = candidate.speaker?.status || 'none';
  const speaker = cfg.speaker_points[speakerStatus] ?? 0;
  const effort = cfg.effort_points[candidate.format] ?? 0;
  const rec = recencyPenalty(candidate, events, cfg, today);
  const fit = Number(candidate.audience_fit ?? 0);
  const pull = Number(candidate.channel_pull ?? 0);

  const components = [
    { key: 'demand', label: '需求信号', raw: demand, weight: cfg.weights.demand, note: `${verified.length} 条可核实证据（上限 5）` },
    { key: 'audience_fit', label: '受众匹配', raw: fit, weight: cfg.weights.audience_fit, note: candidate.audience_fit_why || '未说明，按 0 计' },
    { key: 'channel_pull', label: '渠道拉力', raw: pull, weight: cfg.weights.channel_pull, note: candidate.channel_pull_why || '未说明，按 0 计' },
    { key: 'speaker', label: '讲者', raw: speaker, weight: cfg.weights.speaker, note: `${speakerStatus}${candidate.speaker?.name ? ` · ${candidate.speaker.name}` : ''}` },
    { key: 'effort', label: '组织成本', raw: effort, weight: cfg.weights.effort, note: candidate.format || 'talk' },
    { key: 'recency', label: '重复惩罚', raw: Number(rec.points.toFixed(1)), weight: cfg.weights.recency, note: rec.why || '近 12 个月没讲过相近主题' },
  ].map(c => ({ ...c, points: Number((c.raw * c.weight).toFixed(1)) }));

  const total = Number(components.reduce((s, c) => s + c.points, 0).toFixed(1));
  const blockers = [];
  if (!verified.length) blockers.push('没有可核实的证据');
  if (speaker === 0) blockers.push('没有讲者人选');
  if (!candidate.audience_fit_why) blockers.push('没写受众匹配的理由');

  return { ...candidate, evidence, verified_count: verified.length, components, total, rankable: verified.length > 0, blockers };
}

/**
 * Pull candidate seeds out of past events' results.next_topics so nothing written in a 复盘 is lost.
 * Each seed carries where it came from; matching is by topic text, so re-running never duplicates.
 */
export function harvestSeeds(events) {
  const seeds = [];
  for (const ev of events) {
    (ev.results.next_topics || []).forEach((t, i) => seeds.push({
      topic: t.topic,
      angle: t.why || '',
      origin: `${ev.slug}:next_topics[${i}]`,
      evidence: [`${ev.slug}:next_topics[${i}].evidence`, ...(t.evidence_refs || [])],
      raw_evidence: t.evidence || '',
    }));
  }
  return seeds;
}

/** Signals the shortlist shows as raw material: what the room actually asked, newest event first. */
export function harvestQuestions(events) {
  return events.flatMap(ev => (ev.results.qa_questions || []).map((q, i) => ({
    q: q.q, theme: q.theme || '', event: ev.slug, ref: `${ev.slug}:qa_questions[${i}].q`,
  })));
}

/** The measured audience, so a topic is judged against who turns up rather than who we imagine. */
export function audienceFacts(events, cfg) {
  const facts = [];
  for (const ev of events) {
    for (const key of cfg.audience_profile_source.keys) {
      const block = ev.results[key];
      if (!block || typeof block !== 'object') continue;
      for (const [k, v] of Object.entries(block)) {
        if (k.startsWith('$') || ['checked', 'source', 'url'].includes(k) || typeof v === 'object') continue;
        facts.push({ event: ev.slug, block: key, metric: k, value: v, checked: block.checked || '—', source: block.source || '—' });
      }
    }
  }
  return facts;
}

export function rank(backlog, events, cfg, today = new Date(), profile = null, track = null) {
  const scored = (backlog.candidates || [])
    .filter(c => (c.status || 'candidate') === 'candidate')
    .filter(c => !track || (c.track || 'meetup') === track)
    .map(c => scoreCandidate(c, events, cfg, today, profile));
  const ranked = scored.filter(c => c.rankable).sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
  const unranked = scored.filter(c => !c.rankable);
  const delivered = (backlog.candidates || [])
    .filter(c => c.status && c.status !== 'candidate')
    .filter(c => !track || (c.track || 'meetup') === track);
  return { ranked, unranked, delivered };
}
