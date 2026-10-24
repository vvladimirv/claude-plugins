// Sinhronizacija: repo koji se promijenio ispod dugo otvorene sesije.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { run } = require('../guard');
const { commandDir } = require('../lib/common');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
const write = (root, sid, rel = 'src/a.js') => run(h.pre(root, 'Write', { file_path: path.join(root, rel), content: 'x' }, sid));
const post = (root, sid, command) => run({ hook_event_name: 'PostToolUse', cwd: root, session_id: sid, tool_name: 'Bash', tool_input: { command } });

function withRemote() {
  const bare = path.join(h.BASE, `remote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.git`);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  const a = h.project({ commit: true, marker: true });
  git(a, 'remote', 'add', 'origin', bare);
  git(a, 'push', '-q', '-u', 'origin', 'main');
  const b = path.join(h.BASE, `klon-${path.basename(a)}`);
  execFileSync('git', ['clone', '-q', bare, b]);
  git(b, 'config', 'user.email', 't@t');
  git(b, 'config', 'user.name', 't');
  return { a, b };
}

function pushFromOther(b) {
  fs.writeFileSync(path.join(b, 'drugi.txt'), 'x');
  git(b, 'add', '-A');
  git(b, 'commit', '-qm', 'rad sa drugog računara');
  git(b, 'push', '-q');
}

test('iza GitHuba, čist repo: start sesije ga sam povuče (fast-forward)', () => {
  const { a, b } = withRemote();
  pushFromOther(b);
  const start = run({ hook_event_name: 'SessionStart', cwd: a, session_id: 'S1' });
  assert.match(start.hookSpecificOutput.additionalContext, /1 commit iza GitHuba, pa je povučen/);
  assert.ok(fs.existsSync(path.join(a, 'drugi.txt')), 'novi fajl je stigao');
  assert.strictEqual(write(a, 'S1'), null);
});

test('iza GitHuba, ali druga sesija drži bravu: start ne povlači', () => {
  const { a, b } = withRemote();
  pushFromOther(b);
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(a, '.agent-lock.json'), JSON.stringify({ agent: 'claude', session_id: 'X', since: now, heartbeat: now }));
  const start = run({ hook_event_name: 'SessionStart', cwd: a, session_id: 'S1' });
  assert.match(start.hookSpecificOutput.additionalContext, /1 commit iza GitHuba \(/);
  assert.ok(!fs.existsSync(path.join(a, 'drugi.txt')));
});

test('iza GitHuba sa lokalnim izmjenama: pisanje čeka pull, pull prolazi, poslije pulla pisanje radi', () => {
  const { a, b } = withRemote();
  pushFromOther(b);
  fs.writeFileSync(path.join(a, 'README.md'), '# p\nnesnimljeno\n'); // lokalna izmjena: bez automatskog povlačenja

  const start = run({ hook_event_name: 'SessionStart', cwd: a, session_id: 'S1' });
  assert.match(start.hookSpecificOutput.additionalContext, /1 commit iza GitHuba/);
  const d = write(a, 'S1');
  assert.strictEqual(h.decision(d), 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /git pull --ff-only/);

  assert.strictEqual(run(h.pre(a, 'Bash', { command: 'git pull --ff-only' }, 'S1')), null);
  git(a, 'pull', '-q', '--ff-only');
  post(a, 'S1', 'git pull --ff-only');
  assert.strictEqual(write(a, 'S1'), null);
});

test('grana na GitHubu se čita iz fajlova isto kao git @{u}, i u worktreeu', () => {
  const { readHead, readUpstream } = require('../lib/sync');
  const { a, b } = withRemote();
  const rev = (cwd, ref) => execFileSync('git', ['rev-parse', ref], { cwd, encoding: 'utf8' }).trim();
  assert.strictEqual(readUpstream(a), rev(a, '@{u}'));
  pushFromOther(b);
  git(a, 'fetch', '-q');
  git(a, 'pack-refs', '--all');
  assert.strictEqual(readUpstream(a), rev(a, '@{u}'), 'i iz packed-refs');
  assert.notStrictEqual(readUpstream(a), readHead(a));

  const wt = path.join(h.BASE, `wt-${path.basename(a)}`);
  git(a, 'worktree', 'add', '-q', '-b', 'zadatak', wt, 'origin/main');
  assert.strictEqual(readHead(wt), rev(wt, 'HEAD'));
  assert.strictEqual(readUpstream(wt), rev(wt, '@{u}'));
});

test('tokom rada: fetch donese tuđi commit → pisanje čeka pull', () => {
  const { a, b } = withRemote();
  run({ hook_event_name: 'SessionStart', cwd: a, session_id: 'S1' });
  assert.strictEqual(write(a, 'S1'), null);
  pushFromOther(b);
  git(a, 'fetch', '-q');
  const d = write(a, 'S1');
  assert.strictEqual(h.decision(d), 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /1 commit iza GitHuba/);
});

test('druga lokalna sesija commitovala: prva izmjena staje jednom, sa listom commitova', () => {
  const root = h.project({ commit: true, marker: true });
  assert.strictEqual(write(root, 'S1'), null);
  h.write(root, 'tudje.txt', 'x');
  git(root, 'add', 'tudje.txt');
  git(root, 'commit', '-qm', 'feat: rad druge sesije');

  const d = write(root, 'S1');
  assert.strictEqual(h.decision(d), 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /feat: rad druge sesije/);
  assert.strictEqual(write(root, 'S1'), null, 'drugi put prolazi');
});

test('vlastiti commit se ne prijavljuje kao tuđi', () => {
  const root = h.project({ commit: true, marker: true });
  assert.strictEqual(write(root, 'S1'), null);
  h.write(root, 'moje.txt', 'x');
  git(root, 'add', 'moje.txt');
  git(root, 'commit', '-qm', 'feat: moje');
  post(root, 'S1', 'git add moje.txt && git commit -m "feat: moje"');
  assert.strictEqual(write(root, 'S1'), null);
});

test('commandDir: cd, Set-Location i git -C', () => {
  const win = process.platform === 'win32';
  assert.strictEqual(commandDir('cd /c/dev/budzet && git commit -m x'), win ? 'c:/dev/budzet' : '/c/dev/budzet');
  assert.strictEqual(commandDir('git -C "C:/dev/x y" status'), 'C:/dev/x y');
  assert.strictEqual(commandDir('Set-Location C:\\dev\\z; git add .'), 'C:\\dev\\z');
  assert.strictEqual(commandDir('npm test'), null);
});

test('brava važi i za `cd <repo> && git commit` iz sesije otvorene drugdje', () => {
  const session = h.project({ outside: true });
  const locked = h.project({ git: true, marker: true });
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(locked, '.agent-lock.json'), JSON.stringify({ agent: 'claude', session_id: 'B', since: now, heartbeat: now }));
  const d = run(h.pre(session, 'Bash', { command: `cd "${locked}" && git commit -am x` }, 'A'));
  assert.strictEqual(h.decision(d), 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /Brava/);
});
