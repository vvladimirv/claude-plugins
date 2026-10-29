const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { inspect, backup } = require('../scripts/project-registrations');

test('registracije: isti izvor se usklađuje uz backup, poseban izvor i aktivna brava ostaju', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-registrations-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const entries = [];
  for (const [name, repo, locked] of [['ours', 'vvladimirv/claude-plugins', false], ['custom', 'someone/custom', false], ['locked', 'vvladimirv/claude-plugins', true]]) {
    const root = path.join(home, name);
    fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(root, '.claude/settings.json'), JSON.stringify({ other: 'preserve', extraKnownMarketplaces: { 'moji-pluginsi': { source: { source: 'github', repo } } } }));
    if (locked) fs.writeFileSync(path.join(root, '.agent-lock.json'), JSON.stringify({ heartbeat: new Date().toISOString() }));
    entries.push({ scope: 'project', projectPath: root });
  }
  fs.mkdirSync(path.join(home, 'plugins'));
  fs.writeFileSync(path.join(home, 'plugins/installed_plugins.json'), JSON.stringify({ plugins: { 'project-guard@moji-pluginsi': entries } }));
  const rows = inspect(home, path.join(home, 'source'));
  assert.equal(rows[0].operations.length, 2);
  assert.match(rows[1].skip, /poseban/);
  assert.match(rows[2].skip, /brava/);
  backup(home, rows[0]);
  const backups = fs.readdirSync(path.join(home, 'backups/universal-plugins'));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(home, 'backups/universal-plugins', backups[0]), 'utf8'), fs.readFileSync(rows[0].file, 'utf8'));
});
