import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fill, plainText } from '../src/lib/template.js';

test('fill: nested keys, #if, #each with scalars and objects', () => {
  const out = fill('{{a.b}}|{{#if x}}yes{{/if}}{{#if y}}no{{/if}}|{{#each list}}<{{.}}>{{/each}}|{{#each objs}}[{{name}}]{{/each}}',
    { a: { b: 'B' }, x: 1, y: '', list: ['p', 'q'], objs: [{ name: 'n1' }, { name: 'n2' }] });
  assert.equal(out, 'B|yes|<p><q>|[n1][n2]');
});

test('fill: missing value goes through onMissing and defaults to [TODO key]', () => {
  const seen = [];
  assert.equal(fill('{{gone}}', {}, (k) => { seen.push(k); return `[TODO ${k}]`; }), '[TODO gone]');
  assert.deepEqual(seen, ['gone']);
  assert.equal(fill('{{gone}}', {}), '[TODO gone]');
});

test('plainText: strips editor note, bold title line, \\# escapes and bold markers', () => {
  const md = '*Post date suggestion: x*\n\n---\n\n**Title**\n\nHello **bold** \\#Tag';
  assert.equal(plainText(md), 'Hello bold #Tag');
});
