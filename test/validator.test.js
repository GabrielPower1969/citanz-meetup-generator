// The typography validator must reject text that is too long or wraps badly — and say "reword", not squeeze.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, readJson } from '../src/lib/event.js';

function buildWith(mutate) {
  const ev = readJson('events/example.json');
  mutate(ev);
  const tmp = path.join(ROOT, 'events', `zz-test-${process.pid}.json`);
  ev.slug = '2099-01-01-test-case';
  fs.writeFileSync(tmp, JSON.stringify(ev));
  try {
    const r = spawnSync('node', ['src/steps/1-render-posters.js', tmp], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return spawnSync('node', ['src/steps/2-validate-posters.js', tmp], { cwd: ROOT, encoding: 'utf8' });
  } finally {
    fs.rmSync(tmp, { force: true });
    fs.rmSync(path.join(ROOT, 'output', '2099-01-01-test-case'), { recursive: true, force: true });
  }
}

test('an 85-char title is rejected as too long (shrink beyond 15%) or too many lines — never silently squeezed', () => {
  const r = buildWith(ev => { ev.title = 'Building Production-Grade AI Agents in New Zealand: Lessons From Shipping Real Products To Real Customers'; });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shorten|reword|needs \d+ lines/);
});

test('a title that wraps into an orphan word is rejected with a reword message', () => {
  const r = buildWith(ev => { ev.zh.title = '区块链到底是什么？这场分享\n只讲技术，不聊币\n价'; /* manual break leaves one character alone, like the original Canva draft */ });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /orphan|ragged|reword/);
});

test('a missing speaker photo fails before rendering', () => {
  const ev = readJson('events/example.json'); ev.speaker.photo = 'assets/speakers/nobody.png'; ev.slug = '2099-01-01-no-photo';
  const tmp = path.join(os.tmpdir(), 'no-photo.json'); fs.writeFileSync(tmp, JSON.stringify(ev));
  const r = spawnSync('node', ['src/steps/1-render-posters.js', tmp], { cwd: ROOT, encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /speaker photo/);
});
