const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const checks = require('../plugins/project-guard/scripts/checks');
const runner = path.resolve(__dirname, '../plugins/project-guard/scripts/checks.js');

function fixture(t, code = 'process.exit(0)') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-checks-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', dir]);
  fs.writeFileSync(path.join(dir, 'a.js'), code);
  fs.writeFileSync(path.join(dir, '.agent-checks.json'), JSON.stringify({ checks: [{ name: 'test', command: process.execPath, args: ['a.js'] }] }));
  return dir;
}
const execute = root => spawnSync(process.execPath, [runner, '--root', root], { encoding: 'utf8' });

test('dokaz: uspjeh, izmjena i promjena Git indeksa poništavaju potvrdu', t => {
  const root = fixture(t);
  assert.equal(execute(root).status, 0);
  assert.equal(checks.verify(root).ok, true);
  execFileSync('git', ['add', '.'], { cwd: root });
  assert.equal(checks.verify(root).ok, false);
  assert.equal(execute(root).status, 0);
  fs.appendFileSync(path.join(root, 'a.js'), '\n// changed');
  assert.equal(checks.verify(root).ok, false);
});
test('dokaz: pad, nepostojeća komanda, prazan plan i promjena tokom testa nisu uspjeh', t => {
  for (const code of ['process.exit(1)', 'require("fs").writeFileSync("new.txt","x")']) {
    const root = fixture(t, code);
    assert.notEqual(execute(root).status, 0);
    assert.equal(checks.verify(root).ok, false);
  }
  const root = fixture(t);
  assert.equal(execute(root).status, 0);
  fs.writeFileSync(path.join(root, '.agent-checks.json'), '{"checks":[]}');
  assert.notEqual(execute(root).status, 0);
  assert.equal(checks.verify(root).ok, false);
  fs.writeFileSync(path.join(root, '.agent-checks.json'), JSON.stringify({ checks: [{ name: 'missing', command: 'missing-agent-check-command', args: [] }] }));
  assert.notEqual(execute(root).status, 0);
});
