// Nalazi iz probe /kickstart (budzet): lažna uzbuna za secrets.js i pravila za ciljni, a ne za folder sesije.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../guard');
const { rootFor, projectRoot } = require('../lib/common');

test('tajne: kod koji se zove secrets.js nije tajna, secrets.json jeste', () => {
  const root = h.project({ marker: true });
  assert.strictEqual(run(h.pre(root, 'Read', { file_path: path.join(root, 'hooks/lib/secrets.js') })), null);
  assert.strictEqual(run(h.pre(root, 'Edit', { file_path: path.join(root, 'src/credentials.ts') })), null);
  assert.strictEqual(h.decision(run(h.pre(root, 'Read', { file_path: path.join(root, 'config/secrets.json') }))), 'deny');
  assert.strictEqual(h.decision(run(h.pre(root, 'Read', { file_path: path.join(root, 'credentials') }))), 'deny');
});

test('rootFor: fajl u sesiji, u drugom git repou, u novom folderu pod korijenom', () => {
  const session = h.project({ outside: true });
  const other = h.project({ git: true });
  const fresh = path.join(h.DEV, 'potpuno-nov');
  assert.strictEqual(rootFor({ tool_input: { file_path: path.join(session, 'a.js') } }, session), session);
  assert.strictEqual(rootFor({ tool_input: { file_path: path.join(other, 'src', 'a.js') } }, session), other);
  assert.strictEqual(rootFor({ tool_input: { file_path: path.join(fresh, 'src', 'a.js') } }, session), fresh);
  assert.strictEqual(rootFor({ tool_input: { command: 'ls' } }, session), session);
});

test('kapija i brava važe za ciljni projekat i kad je sesija otvorena drugdje', () => {
  const session = h.project({ outside: true });
  const fresh = path.join(h.DEV, 'nova-tema');
  const w = (file, sid = 'A') => run(h.pre(session, 'Write', { file_path: file, content: 'x' }, sid));
  assert.strictEqual(h.decision(w(path.join(fresh, 'src', 'app.js'))), 'deny');
  assert.strictEqual(w(path.join(fresh, 'docs', 'VIZIJA.md')), null);

  const locked = h.project({ git: true, marker: true });
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(locked, '.agent-lock.json'), JSON.stringify({ agent: 'claude', session_id: 'B', since: now, heartbeat: now }));
  assert.strictEqual(h.decision(w(path.join(locked, 'a.js'))), 'deny');
});

test('worktree unutar projekta ima svoju bravu, iako aplikacija daje CLAUDE_PROJECT_DIR glavnog repoa', (t) => {
  const main = h.project({ commit: true, marker: true });
  const wt = path.join(main, '.claude', 'worktrees', 'pomocna');
  h.git(main, 'worktree', 'add', '-q', wt, '-b', 'pomocna');
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(main, '.agent-lock.json'), JSON.stringify({ agent: 'claude', session_id: 'GLAVNA', since: now, heartbeat: now }));
  process.env.CLAUDE_PROJECT_DIR = main;
  t.after(() => delete process.env.CLAUDE_PROJECT_DIR);

  assert.strictEqual(projectRoot({ cwd: wt }), wt);
  assert.strictEqual(projectRoot({ cwd: path.join(wt, 'src') }), wt);
  assert.strictEqual(projectRoot({ cwd: path.join(main, 'src') }), main);
  assert.strictEqual(projectRoot({}), main);

  const inWt = (sid, toolInput, tool = 'Write') => run({ ...h.pre(wt, tool, toolInput, sid) });
  assert.strictEqual(inWt('POMOCNA', { file_path: path.join(wt, 'a.js'), content: 'x' }), null, 'pomoćna piše u svoj worktree');
  assert.strictEqual(inWt('POMOCNA', { command: 'git commit -am x' }, 'Bash'), null);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(wt, '.agent-lock.json'), 'utf8')).session_id, 'POMOCNA');
  assert.strictEqual(h.decision(inWt('POMOCNA', { file_path: path.join(main, 'a.js'), content: 'x' })), 'deny',
    'glavni folder i dalje čuva brava glavne sesije');
  const start = run({ hook_event_name: 'SessionStart', cwd: wt, session_id: 'POMOCNA' });
  assert.ok(!start || !/druga sesija/.test(start.hookSpecificOutput.additionalContext), 'pomoćna ne dobija upozorenje o bravi');
});
