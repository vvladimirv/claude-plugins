const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('../guard');
const patch = (root, text, sid = 'A') => h.pre(root, 'apply_patch', { command: `*** Begin Patch\n${text}\n*** End Patch` }, sid);

test('portable: Codex add/update/delete/move provjerava sve putanje, i uz pauzu', () => {
  const root = h.project({ marker: true });
  for (const text of ['*** Add File: .env\n+DEMO=example', '*** Delete File: data/private.csv',
    '*** Update File: a.txt\n*** Move to: .env\n@@\n-a\n+b']) {
    assert.equal(h.decision(run(patch(root, text))), 'deny');
  }
  h.pause(true);
  try { assert.equal(h.decision(run(patch(root, '*** Delete File: .env'))), 'deny'); }
  finally { h.pause(false); }
});

test('portable: isti limit za Claude Write i Codex patch, stari veliki fajl smije se smanjiti', () => {
  const root = h.project({ marker: true, files: { '.claude/granice.json': '{"maks":3}', 'x.js': 'a\nb\nc\nd\n' } });
  assert.equal(h.decision(run(h.pre(root, 'Write', { file_path: path.join(root, 'new.js'), content: 'a\nb\nc\nd\n' }))), 'deny');
  assert.equal(h.decision(run(patch(root, '*** Add File: new.js\n+a\n+b\n+c\n+d'))), 'deny');
  assert.equal(run(patch(root, '*** Update File: x.js\n@@\n a\n b\n c\n-d')), null);
  assert.equal(fs.readFileSync(path.join(root, 'x.js'), 'utf8'), 'a\nb\nc\nd\n');
});

test('portable: patch poštuje bravu druge sesije i kapiju novog projekta', () => {
  const root = h.project({ git: true, marker: true });
  assert.equal(run(patch(root, '*** Add File: a.js\n+x', 'A')), null);
  assert.equal(h.decision(run(patch(root, '*** Add File: b.js\n+x', 'B'))), 'deny');
  assert.equal(h.decision(run(patch(h.project({ git: true }), '*** Add File: x.js\n+x'))), 'deny');
});

test('portable: Codex novi folder dobija podržan deny, ne ask; neispravan patch je vidljiv', () => {
  const root = h.project({ marker: true, files: { 'docs/ARHITEKTURA.md': '# Arhitektura\nsrc/' } });
  assert.equal(h.decision(run(patch(root, '*** Add File: unexpected/a.js\n+x'))), 'deny');
  const out = run(h.pre(root, 'apply_patch', { command: 'not a patch' }));
  assert.equal(h.decision(out), 'deny');
});

test('portable: patch sa više hunkova, pomjeranjem i UTF-8 daje stvarnu projekciju', () => {
  const { parsePatch, projectContent } = require('../lib/portable');
  const root = h.project({ files: { 'a.txt': 'č\nb\nc\nd\n' } });
  const [op] = parsePatch('*** Begin Patch\n*** Update File: a.txt\n*** Move to: b.txt\n@@\n č\n-b\n+B\n@@\n c\n-d\n+D\n*** End Patch');
  assert.equal(projectContent(op, root), 'č\nB\nc\nD\n');
});

test('portable: PostToolUse obrađuje stvarni rezultat, više fajlova i upozorenje o boji', () => {
  const root = h.project({ marker: true, files: { 'docs/DIZAJN-SISTEM.md': '# DS', 'style.css': 'body{color:#123456}\n' } });
  const input = patch(root, '*** Add File: style.css\n+body{color:#123456}');
  const out = run({ ...input, hook_event_name: 'PostToolUse' });
  assert.match(out.hookSpecificOutput.additionalContext, /hardkodovana boja/);
});

test('portable: nepodržan format ne može tiho preskočiti zaštitu, duplikati se odbijaju', () => {
  const { parsePatch } = require('../lib/portable');
  assert.throws(() => parsePatch('*** Begin Patch\n*** Add File: a.js\n+x\n*** Update File: a.js\n@@\n-x\n+y\n*** End Patch'));
});

test('portable: novi manifest kroz patch dobija isti podsjetnik o zavisnosti', () => {
  const root = h.project({ git: true, commit: true, marker: true,
    files: { 'package.json': '{"dependencies":{}}', 'docs/adr/0001.md': '# Node' } });
  h.write(root, 'package.json', '{"dependencies":{"new-lib":"1"}}');
  const input = patch(root, '*** Update File: package.json\n@@\n-{"dependencies":{}}\n+{"dependencies":{"new-lib":"1"}}');
  const out = run({ ...input, hook_event_name: 'PostToolUse' });
  assert.match(out.hookSpecificOutput.additionalContext, /new-lib/);
});

test('portable: stara boja iz konteksta patcha nije nova hardkodovana boja', () => {
  const root = h.project({ marker: true, files: { 'docs/DIZAJN-SISTEM.md': '# DS', 'style.css': 'body{color:#123456}\np{margin:0}\n' } });
  const input = patch(root, '*** Update File: style.css\n@@\n body{color:#123456}\n-p{margin:1px}\n+p{margin:0}');
  assert.equal(run({ ...input, hook_event_name: 'PostToolUse' }), null);
});
