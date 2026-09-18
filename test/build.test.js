// Integration: build the example event end-to-end and check the hand-off pack.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readJson } from '../src/lib/event.js';

const ev = readJson('events/example.json');
const out = path.join(ROOT, 'output', ev.slug);
const platforms = readJson('config/platforms.json');
const pngSize = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

before(() => {
  fs.rmSync(out, { recursive: true, force: true });
  const r = spawnSync('node', ['src/build.js', 'events/example.json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /OK: no overflow/);
});

test('posters exist at the declared canvas sizes (×2 scale)', () => {
  for (const t of ['landscape', 'portrait']) {
    const meta = readJson(`templates/posters/${t}/meta.json`);
    const { w, h } = pngSize(path.join(out, `${ev.slug}.${t}.png`));
    assert.equal(w, meta.width * 2); assert.equal(h, meta.height * 2);
  }
});

test('小红书 export is exactly 3:4 and at least the platform minimum', () => {
  const { w, h } = pngSize(path.join(out, `${ev.slug}.portrait.xhs.png`));
  assert.ok(Math.abs(w / h - 3 / 4) < 0.002, `${w}x${h}`);
  assert.ok(w >= platforms.xiaohongshu.image.min.w && h >= platforms.xiaohongshu.image.min.h);
});

test('hand-off folders: one per channel, named files, right poster, README', () => {
  const cfg = readJson('config/citanz.json');
  const date = ev.slug.slice(0, 10);
  const expect = {
    linkedin: [`领英-post-${ev.topic}-${date}.md`, `领英-post-${ev.topic}-${date}.txt`, `领英-recap-${ev.topic}-${date}.md`, `${ev.slug}.landscape.png`],
    xiaohongshu: [`小红书-post-${ev.topic}-${date}.md`, `小红书-post-${ev.topic}-${date}.txt`, `${ev.slug}.portrait.xhs.png`],
    meetup: [`meetup-post-${ev.topic}-${date}.md`, `meetup-post-${ev.topic}-${date}.txt`, `${ev.slug}.landscape.png`],
    wechat: [`微信-本地会员群-post-${ev.topic}-${date}.md`, `微信-本地非会员群-post-${ev.topic}-${date}.md`, `微信-CITANZ大群-post-${ev.topic}-${date}.md`, `${ev.slug}.portrait.png`],
    teams: [`Teams-post-${ev.topic}-${date}.md`, `${ev.slug}.landscape.png`],
  };
  for (const [ch, files] of Object.entries(expect)) {
    const have = fs.readdirSync(path.join(out, ch));
    for (const f of files) assert.ok(have.includes(f), `${ch}/${f}`);
  }
  assert.ok(fs.existsSync(path.join(out, 'README.md')));
  assert.ok(Object.keys(cfg.handoff).every(ch => fs.existsSync(path.join(out, ch))));
});

test('no [TODO] and no markdown in the paste-ready .txt files', () => {
  for (const f of ['linkedin', 'xiaohongshu', 'meetup'].flatMap(ch => fs.readdirSync(path.join(out, ch)).filter(n => n.endsWith('.txt')).map(n => path.join(out, ch, n)))) {
    const t = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(t, /\[TODO /, f);
    assert.doesNotMatch(t, /\*\*|\\#|^### /m, f);
  }
});

test('WeChat: local groups start with #接龙 and carry the venue; national group has neither', () => {
  const read = (n) => fs.readFileSync(path.join(out, 'wechat', n), 'utf8');
  const date = ev.slug.slice(0, 10);
  const member = read(`微信-本地会员群-post-${ev.topic}-${date}.md`);
  const pub = read(`微信-本地非会员群-post-${ev.topic}-${date}.md`);
  const nat = read(`微信-CITANZ大群-post-${ev.topic}-${date}.md`);
  assert.ok(member.startsWith('#接龙\n')); assert.ok(pub.startsWith('#接龙\n')); assert.ok(!nat.includes('#接龙'));
  assert.ok(member.includes(ev.venue_short)); assert.ok(!nat.includes(ev.venue_short));
  assert.ok(pub.includes('$5')); assert.ok(!member.includes('$5'));
  assert.ok(nat.includes('18:30'));
});

test('小红书 post respects platform limits (title ≤ 20, body ≤ 1000, topics ≤ 10)', () => {
  const date = ev.slug.slice(0, 10);
  const md = fs.readFileSync(path.join(out, 'xiaohongshu', `小红书-post-${ev.topic}-${date}.md`), 'utf8');
  const txt = fs.readFileSync(path.join(out, 'xiaohongshu', `小红书-post-${ev.topic}-${date}.txt`), 'utf8');
  const title = md.split('\n')[0].replace(/\*\*/g, '');
  assert.ok([...title].length <= 20, title);
  assert.ok([...txt].length <= 1000);
  assert.ok((txt.match(/(^|\s)#[^\s#]+/g) || []).length <= 10);
});

test('LinkedIn recap stays under the house limit', () => {
  const date = ev.slug.slice(0, 10);
  const txt = fs.readFileSync(path.join(out, 'linkedin', `领英-recap-${ev.topic}-${date}.txt`), 'utf8');
  assert.ok([...txt].length <= platforms.linkedin.copy.recap_house_limit, [...txt].length);
});

test('copy step wipes channel folders: a stale file does not survive a rerun', () => {
  const stale = path.join(out, 'wechat', 'OLD-venue.md');
  fs.writeFileSync(stale, 'Rarakau');
  const r = spawnSync('node', ['src/steps/3-write-copy.js', 'events/example.json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(stale));
});
