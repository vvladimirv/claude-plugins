const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Codex: globalni registar čuva tuđe hookove, ažurira samo naše i ne upisuje povjerenje', t => {
  const { register } = require('../scripts/codex-hooks');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hook-registration-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const custom = { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo custom' }] };
  const file = path.join(home, 'hooks.json');
  fs.writeFileSync(path.join(home, '.hook-trust'), 'user trust state');
  fs.writeFileSync(file, JSON.stringify({ description: 'user-owned', hooks: { PreToolUse: [custom] } }));
  const installed = ['project-guard', 'project-memory'].map(name => ({ name,
    installedPath: path.resolve(__dirname, '../plugins', name) }));
  assert.equal(register(home, installed).changed, true);
  const first = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(first);
  assert.equal(doc.description, 'user-owned');
  assert.deepEqual(doc.hooks.PreToolUse[0], custom);
  assert.equal(doc.hooks.PreToolUse.length, 2);
  assert.equal(doc.hooks.SessionStart.length, 2);
  assert.equal(doc.hooks.SessionEnd[0].hooks[0].timeout, 3);
  assert.ok(!JSON.stringify(doc).includes('${CLAUDE_PLUGIN_ROOT}'));
  assert.equal(register(home, installed).changed, false);
  assert.equal(fs.readFileSync(file, 'utf8'), first);
  assert.equal(fs.readdirSync(home).filter(f => f.startsWith('hooks.json.backup-')).length, 1);
  assert.equal(fs.readFileSync(path.join(home, '.hook-trust'), 'utf8'), 'user trust state');
});

test('Codex: neispravna postojeća konfiguracija se ne prepisuje', t => {
  const { register } = require('../scripts/codex-hooks');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hook-invalid-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.writeFileSync(path.join(home, 'hooks.json'), 'bad json');
  assert.throws(() => register(home, []));
  assert.equal(fs.readFileSync(path.join(home, 'hooks.json'), 'utf8'), 'bad json');
});
