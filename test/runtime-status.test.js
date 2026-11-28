const h = require('../plugins/project-guard/hooks/test/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../plugins/project-guard/hooks/guard');
const { inspect } = require('../plugins/project-guard/hooks/lib/runtime-status');
const b = require('../plugins/project-guard/hooks/lib/branches');

test('zdravlje: bilježi stvarno opaženo izvršavanje Claude hooka', () => {
  const root = h.project({ marker: true });
  run(h.pre(root, 'Read', { file_path: 'a.js' }));
  const rows = inspect(h.HOME);
  assert.deepStrictEqual(rows.map(r => r.runtime), ['claude']);
  assert.ok(rows.every(r => r.observed && r.fresh && r.version));
});
test('preporuka: Codex ne dobija zahtjev da pređe na Claude model', () => {
  const text = b.describe('codex/test', { zadatak: 'refaktor' }, 'gpt-6.1-sol');
  assert.doesNotMatch(text, /Opus|Sonnet|Haiku|izabere/);
  assert.match(text, /effort visok/);
});
