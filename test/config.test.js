import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../src/lib/event.js';

const cfg = readJson('config/citanz.json');
const platforms = readJson('config/platforms.json');
const schema = readJson('events/schema.json');
const example = readJson('events/example.json');

test('every hand-off channel has a poster kind, an owner and a file-name label', () => {
  for (const [ch, h] of Object.entries(cfg.handoff)) {
    assert.ok(h.owner, `${ch}.owner`);
    assert.ok(h.poster, `${ch}.poster`);
  }
  for (const key of ['linkedin', 'xiaohongshu', 'meetup', 'teams', 'wechat_member', 'wechat_public', 'wechat_national'])
    assert.ok(cfg.handoff_naming.channel_labels[key], `channel label ${key}`);
  assert.match(cfg.handoff_naming.pattern, /\{channel\}-post-\{topic\}-\{date\}\.md/);
});

test('wechat group variants: local groups carry #接龙 + venue, national group neither', () => {
  const g = cfg.wechat_groups;
  assert.equal(g.member.hashtag, true); assert.equal(g.member.show_venue, true);
  assert.equal(g.public.hashtag, true); assert.equal(g.public.show_venue, true);
  assert.match(g.public.fee_line, /\$5/);
  assert.equal(g.national.hashtag, false); assert.equal(g.national.show_venue, false);
  assert.ok(g.national.venue_replacement);
});

test('base 小红书 topics leave room for per-event topics under the platform cap', () => {
  assert.ok(cfg.hashtags.xiaohongshu_base.length <= platforms.xiaohongshu.copy.topics_max - 3);
  assert.ok(cfg.hashtags.xiaohongshu_base.length + example.hashtags_zh.length <= platforms.xiaohongshu.copy.topics_max);
});

test('platform specs carry provenance (source + checked date) and sane limits', () => {
  for (const [name, p] of Object.entries(platforms)) {
    if (name.startsWith('$')) continue;
    assert.ok(p.source, `${name}.source`);
    assert.match(p.checked, /^\d{4}-\d{2}-\d{2}$/, `${name}.checked`);
  }
  assert.equal(platforms.xiaohongshu.copy.title_max_chars, 20);
  assert.equal(platforms.xiaohongshu.copy.body_max_chars, 1000);
  assert.equal(platforms.xiaohongshu.copy.topics_max, 10);
  assert.ok(platforms.linkedin.copy.recap_house_limit < platforms.linkedin.copy.post_max_chars);
});

test('schema documents every top-level field used by the example event', () => {
  for (const k of Object.keys(example)) assert.ok(schema.properties[k], `schema.properties.${k}`);
});
