// Testovi pre-commit šablona: pravi repo, prava `git commit` komanda.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const HOOKS = path.join(__dirname, '..', 'skills', 'kickstart', 'templates', 'githooks');
const BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-'));
let n = 0;

function env(extra = {}) {
  const e = { ...process.env, ...extra };
  for (const k of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID']) if (!(k in extra)) delete e[k];
  return e;
}

function repo() {
  const root = path.join(BASE, `r${++n}`);
  fs.mkdirSync(path.join(root, '.githooks'), { recursive: true });
  for (const f of ['pre-commit', 'pre-commit.mjs']) fs.copyFileSync(path.join(HOOKS, f), path.join(root, '.githooks', f));
  // Kao faza 6 kickstarta: bez izvršnog bita git na Linuxu i Macu preskoči hook.
  fs.chmodSync(path.join(root, '.githooks', 'pre-commit'), 0o755);
  const g = (...a) => execFileSync('git', a, { cwd: root, stdio: 'ignore' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  g('config', 'core.hooksPath', '.githooks');
  return root;
}

function commit(root, files, extraEnv) {
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  spawnSync('git', ['add', '-A'], { cwd: root });
  const r = spawnSync('git', ['commit', '-qm', 'x'], { cwd: root, env: env(extraEnv), encoding: 'utf8' });
  return { ok: r.status === 0, err: r.stderr || '' };
}

const big = (k) => Array.from({ length: k }, (_, i) => `const a${i} = ${i};`).join('\n') + '\n';

test('običan commit prolazi', () => {
  assert.ok(commit(repo(), { 'src/a.js': 'x\n' }).ok);
});

test('tajne: .env, data/ i ključ u kodu su odbijeni', () => {
  const r = repo();
  assert.match(commit(r, { '.env': 'A=1' }).err, /Tajne\/podaci: \.env/);
  const r2 = repo();
  assert.ok(commit(r2, { '.env.example': 'A=' }).ok);
  assert.match(commit(repo(), { 'data/k.csv': 'x' }).err, /data\/k\.csv/);
  const fakeKey = 'AKIA' + 'Z'.repeat(16);
  assert.match(commit(repo(), { 'src/cfg.js': `const k = "${fakeKey}";\n` }).err, /liči na ključ/);
  assert.match(commit(repo(), { 'k.txt': '-----BEGIN ' + 'PRIVATE KEY-----\n' }).err, /liči na ključ/);
});

test('veličina: nov fajl preko 500 linija je odbijen, granice.json ga dozvoljava', () => {
  assert.match(commit(repo(), { 'src/big.js': big(600) }).err, /600 linija/);
  const r = repo();
  assert.ok(commit(r, { '.claude/granice.json': '{"iskljuci":["legacy/**"]}', 'legacy/big.js': big(600) }).ok);
});

test('brava: tuđa svježa brava odbija, vlastita i zastarjela ne', () => {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 3600000).toISOString();
  const lock = (sid, t, agent = 'claude') => JSON.stringify({ agent, session_id: sid, since: t, heartbeat: t });

  const r = repo();
  fs.writeFileSync(path.join(r, '.git', 'info', 'exclude'), '.agent-lock.json\n');
  fs.writeFileSync(path.join(r, '.agent-lock.json'), lock('S1', now));
  assert.match(commit(r, { 'a.js': '1' }).err, /Brava/);
  assert.match(commit(r, { 'a.js': '2' }, { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'S2' }).err, /Brava/);
  assert.ok(commit(r, { 'a.js': '3' }, { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'S1' }).ok);

  fs.writeFileSync(path.join(r, '.agent-lock.json'), lock('C1', now, 'codex'));
  assert.match(commit(r, { 'a.js': '4' }, { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'S1' }).err, /Brava/);
  assert.ok(commit(r, { 'a.js': '5' }).ok);

  fs.writeFileSync(path.join(r, '.agent-lock.json'), lock('S1', old));
  assert.ok(commit(r, { 'a.js': '6' }).ok);
});

test('testovi: crveni scripts/test.mjs odbija commit, zeleni ga pušta', () => {
  const r = repo();
  assert.match(commit(r, { 'scripts/test.mjs': 'process.exit(1)\n' }).err, /Testovi/);
  assert.ok(commit(r, { 'scripts/test.mjs': 'process.exit(0)\n' }).ok);
});

// Na Windowsu PowerShell uvijek postoji, pa se slučaj bez PowerShella provjerava samo na Linuxu i Macu bez pwsh.
const noPwsh = process.platform !== 'win32' && spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']).error !== undefined;

test('testovi: scripts/test.ps1 bez PowerShella kaže da se ne može pokrenuti', { skip: !noPwsh && 'treba Linux ili Mac bez pwsh' }, () => {
  const err = commit(repo(), { 'scripts/test.ps1': 'exit 0\n' }).err;
  assert.match(err, /se ne može pokrenuti \(nema `pwsh`/);
  assert.doesNotMatch(err, /nije prošao/);
});
