// `claude --cloud` bez GitHub remotea ili sa necommitovanim izmjenama: jedna blokada po sesiji.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../guard');
const { createsCloudSession } = require('../lib/cloud');

const reason = (out) => (out && out.hookSpecificOutput ? out.hookSpecificOutput.permissionDecisionReason : '');

function repo({ github = false, dirty = false, env = false } = {}) {
  const root = h.project({ commit: true, marker: true });
  if (github) h.git(root, 'remote', 'add', 'origin', 'https://github.com/primjer/repo.git');
  if (env) {
    h.write(root, '.env', 'KLJUC=x\n');
    h.git(root, 'add', '.env');
    h.git(root, 'commit', '-qm', 'env');
  }
  if (dirty) fs.writeFileSync(path.join(root, 'README.md'), '# izmjena\n');
  return root;
}

test('prepoznavanje: nova cloud sesija da, poruka postojećoj i druge komande ne', () => {
  for (const cmd of [
    'claude --cloud "popravi testove"',
    'claude --remote "popravi testove"',
    'claude --cloud',
    'claude --cloud=popravi',
    'cd app && claude --cloud "x"',
    '& "C:\\Users\\a\\.local\\bin\\claude.exe" --cloud "zadatak"',
    'git status; claude --model opus --cloud "zadatak sa razmacima"',
  ]) assert.ok(createsCloudSession(cmd), cmd);
  for (const cmd of [
    'claude -p "poruka" --cloud session_01AbCdEf23GhIjKl',
    'claude -p "poruka" --cloud 3f2b9c1e-1111-4a2b-9c3d-0123456789ab',
    'claude --cloud https://claude.ai/code/session_01AbCdEf23GhIjKl',
    'claude --remote-control',
    'claude --teleport session_01AbCdEf23GhIjKl',
    'git commit -m "docs: claude --cloud upozorenje"',
    'echo claude --cloud x',
    'node scripts/test.mjs',
  ]) assert.ok(!createsCloudSession(cmd), cmd);
});

test('bez GitHub remotea: prva komanda blokirana, ista druga prolazi', () => {
  const root = repo();
  const cmd = { command: 'claude --cloud "popravi testove"' };
  const first = run(h.pre(root, 'Bash', cmd, 'C1'));
  assert.strictEqual(h.decision(first), 'deny');
  assert.match(reason(first), /nema `origin`/);
  assert.match(reason(first), /Na Windowsu/);
  assert.match(reason(first), /GitHub App/);
  assert.strictEqual(h.decision(run(h.pre(root, 'Bash', cmd, 'C1'))), undefined);
  assert.strictEqual(h.decision(run(h.pre(root, 'PowerShell', cmd, 'C2'))), 'deny', 'nova sesija opet dobija upozorenje');
});

test('GitHub remote i čist repo: prolazi', () => {
  const root = repo({ github: true });
  assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command: 'claude --cloud "x"' }, 'C3'))), undefined);
});

test('GitHub remote, necommitovane izmjene i praćen .env: blokira i navodi .env', () => {
  const root = repo({ github: true, dirty: true, env: true });
  const out = run(h.pre(root, 'PowerShell', { command: 'claude --remote "x"' }, 'C4'));
  assert.strictEqual(h.decision(out), 'deny');
  assert.match(reason(out), /1 praćen fajl ima necommitovane izmjene/);
  assert.match(reason(out), /`\.env`/);
  assert.doesNotMatch(reason(out), /KLJUC/, 'sadržaj tajne se ne čita');
});

test('poruka postojećoj cloud sesiji se ne blokira ni bez remotea', () => {
  const root = repo({ dirty: true });
  const out = run(h.pre(root, 'Bash', { command: 'claude -p "nastavi" --cloud session_01AbCdEf23GhIjKl' }, 'C5'));
  assert.strictEqual(h.decision(out), undefined);
});

test('pauza pravila gasi upozorenje', () => {
  const root = repo();
  h.pause(true);
  try {
    assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command: 'claude --cloud "x"' }, 'C6'))), undefined);
  } finally {
    h.pause(false);
  }
});
