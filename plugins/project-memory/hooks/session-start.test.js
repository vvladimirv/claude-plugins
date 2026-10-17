const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildContext, trimStatus } = require('./session-start.js');

const HOOK = path.join(__dirname, 'session-start.js');

function runHook(cwd, projectDir) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR; // projekat je samo input.cwd, ne sesija iz koje se testovi pokreću
  if (projectDir) env.CLAUDE_PROJECT_DIR = projectDir;
  const out = execFileSync('node', [HOOK], { input: JSON.stringify({ cwd }), encoding: 'utf8', env });
  return out ? JSON.parse(out) : null;
}

test('korijen projekta: CLAUDE_PROJECT_DIR ima prednost nad cwd (kao u project-guard)', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  fs.writeFileSync(path.join(project, 'STATUS.md'), '# STATUS\n- korijen sesije');
  const sub = path.join(project, 'src');
  fs.mkdirSync(sub);
  const res = runHook(sub, project);
  assert.match(res.hookSpecificOutput.additionalContext, /korijen sesije/);
});

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

test('uz stanje projekta ide i pravilo o sljedećem koraku', () => {
  const ctx = buildContext({ statusText: '# STATUS', gitLog: '', uncommitted: 0 });
  assert.match(ctx, /Vođenje korisnika/);
  assert.match(ctx, /Sljedeće:/);
});

test('napredak iz blueprinta ulazi u kontekst', () => {
  const ctx = buildContext({ statusText: '', gitLog: '', uncommitted: 0, progress: '## Napredak\nNapredak: MVP gotov' });
  assert.match(ctx, /Napredak: MVP gotov/);
});
