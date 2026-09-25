const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildContext, trimStatus } = require('./session-start.js');

const HOOK = path.join(__dirname, 'session-start.js');

function runHook(cwd) {
  const out = execFileSync('node', [HOOK], { input: JSON.stringify({ cwd }), encoding: 'utf8' });
  return out ? JSON.parse(out) : null;
}

test('bez STATUS.md i bez gita: nema izlaza', () => {
  assert.strictEqual(buildContext({ statusText: '', gitLog: '', uncommitted: 0 }), '');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  assert.strictEqual(runHook(dir), null);
});

test('STATUS.md i git log ulaze u kontekst', () => {
  const ctx = buildContext({ statusText: '# STATUS\n- radi X', gitLog: 'abc123 feat: X\n', uncommitted: 0 });
  assert.match(ctx, /radi X/);
  assert.match(ctx, /abc123 feat: X/);
  assert.doesNotMatch(ctx, /Necommitovano/);
});

test('necommitovani fajlovi se prijave', () => {
  const ctx = buildContext({ statusText: '', gitLog: '', uncommitted: 3 });
  assert.match(ctx, /3 izmijenjenih fajlova/);
});

test('predug STATUS se skrati i to se kaže', () => {
  const long = Array.from({ length: 100 }, (_, i) => `linija ${i}`).join('\n');
  const out = trimStatus(long);
  assert.ok(out.split('\n').length <= 41);
  assert.match(out, /skraćeno/);
});

test('pravi git repo: hook vraća SessionStart JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'STATUS.md'), '# STATUS\n- test stanje');
  g('add', '-A');
  g('commit', '-qm', 'chore: prvi');
  fs.writeFileSync(path.join(dir, 'novo.txt'), 'x');

  const res = runHook(dir);
  assert.strictEqual(res.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(res.hookSpecificOutput.additionalContext, /test stanje/);
  assert.match(res.hookSpecificOutput.additionalContext, /chore: prvi/);
  assert.match(res.hookSpecificOutput.additionalContext, /1 izmijenjenih fajlova/);
});

test('napredak iz blueprinta ulazi u kontekst', () => {
  const ctx = buildContext({ statusText: '', gitLog: '', uncommitted: 0, progress: '## Napredak\nNapredak: MVP gotov' });
  assert.match(ctx, /Napredak: MVP gotov/);
});
