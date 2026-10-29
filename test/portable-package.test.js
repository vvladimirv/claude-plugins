const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const json = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

test('paketi: Claude i Codex imaju iste identitete i verzije iz jednog izvora', () => {
  const claude = json('.claude-plugin/marketplace.json');
  const codex = json('.agents/plugins/marketplace.json');
  assert.equal(claude.name, codex.name);
  for (const entry of claude.plugins) {
    const manifest = json(entry.source + '/plugin.json');
    assert.equal(manifest.version, entry.version);
    assert.equal(manifest.name, entry.name);
    assert.equal(codex.plugins.find(p => p.name === entry.name).source.path, entry.source);
    if (entry.name !== 'project-kickstart') assert.equal(manifest.extensions['com.openai'].hooks, './hooks/hooks.json');
  }
});
test('runner projekta je identičan izvoru u guardu', () => {
  assert.equal(fs.readFileSync(path.join(root, 'plugins/project-guard/scripts/checks.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'plugins/project-kickstart/skills/kickstart/templates/scripts/checks.cjs'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(root, 'scripts/checks.cjs'), 'utf8'),
    fs.readFileSync(path.join(root, 'plugins/project-guard/scripts/checks.js'), 'utf8'));
  for (const file of ['pre-commit', 'pre-commit.mjs']) {
    assert.equal(fs.readFileSync(path.join(root, '.githooks', file), 'utf8'),
      fs.readFileSync(path.join(root, 'plugins/project-kickstart/skills/kickstart/templates/githooks', file), 'utf8'));
  }
});
test('setup: plan je za oba alata, profili se ažuriraju uz backup korisničkog sadržaja', t => {
  const { operations, syncProfiles } = require('../scripts/setup');
  assert.deepEqual([...new Set(operations('both').map(c => c[0]))], ['claude', 'codex']);
  assert.ok(operations('claude').every(c => c[0] === 'claude'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-setup-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.mkdirSync(path.join(home, 'agents'));
  fs.writeFileSync(path.join(home, 'agents/arhitekta.toml'), '# custom');
  syncProfiles(home);
  const backups = fs.readdirSync(path.join(home, 'agents')).filter(f => f.startsWith('arhitekta.toml.backup-'));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(home, 'agents', backups[0]), 'utf8'), '# custom');
  syncProfiles(home);
  assert.equal(fs.readdirSync(path.join(home, 'agents')).filter(f => f.includes('.backup-')).length, 1);
});
test('Codex agenti ne nameću mobilni prikaz i imaju odgovarajuće skillove', () => {
  for (const [name, skill] of [['arhitekta', 'arhitekta'], ['ux_recenzent', 'ux-recenzent']]) {
    const text = fs.readFileSync(path.join(root, 'plugins/project-kickstart/codex-agents', name + '.toml'), 'utf8');
    assert.ok(text.includes('project-kickstart:' + skill));
    assert.ok(fs.existsSync(path.join(root, 'plugins/project-kickstart/skills', skill, 'SKILL.md')));
    assert.ok(!text.includes('360 px'));
  }
});
