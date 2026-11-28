// Lični sloj: claude-licno i claude-plugins se na startu sesije povuku (fast-forward, najviše jednom u 10 min),
// a kad su pluginovi u izvoru noviji od instaliranih, jedna linija traži setup.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const personal = require('../lib/personal');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
let n = 0;

// Klon `ime` u korijenu projekata (h.DEV) sa remoteom; vraća { repo, other } gdje je other drugi računar.
function cloned(name) {
  const bare = path.join(h.BASE, `licni-${++n}.git`);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  const seed = path.join(h.BASE, `seed-${n}`);
  execFileSync('git', ['clone', '-q', bare, seed]);
  for (const d of [seed]) { git(d, 'config', 'user.email', 't@t'); git(d, 'config', 'user.name', 't'); }
  fs.writeFileSync(path.join(seed, 'GLOBALNO.md'), 'pravila\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'prvi');
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  const repo = path.join(h.DEV, name);
  fs.rmSync(repo, { recursive: true, force: true });
  execFileSync('git', ['clone', '-q', bare, repo]);
  git(repo, 'config', 'user.email', 't@t');
  git(repo, 'config', 'user.name', 't');
  return { repo, other: seed };
}

function pushFrom(dir, file = 'novo.md') {
  fs.writeFileSync(path.join(dir, file), String(Math.random()));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'sa drugog računara');
  git(dir, 'push', '-q', 'origin', 'HEAD:main');
}

const fresh = () => Date.now() + personal.PULL_EVERY_MS * (++n + 10);

test('lični sloj: čist claude-licno iza GitHuba se povuče, poruka je kratka', () => {
  const { repo, other } = cloned('claude-licno');
  pushFrom(other);
  const msg = personal.sessionMessage({ source: 'startup' }, {}, fresh());
  assert.match(msg, /`claude-licno` je povučen sa GitHuba \(1 commit\)/);
  assert.ok(fs.existsSync(path.join(repo, 'novo.md')));
  fs.rmSync(repo, { recursive: true, force: true });
});

test('lični sloj: najviše jednom u 10 minuta, izmijenjen repo se ne dira, lokalni commitovi se prijave', () => {
  const { repo, other } = cloned('claude-licno');
  const t = fresh();
  personal.sessionMessage({ source: 'startup' }, {}, t);
  pushFrom(other);
  assert.strictEqual(personal.sessionMessage({ source: 'startup' }, {}, t + 1000), null, 'unutar 10 min nema novog povlačenja');
  fs.writeFileSync(path.join(repo, 'GLOBALNO.md'), 'moja izmjena\n');
  const dirty = personal.sessionMessage({ source: 'startup' }, {}, fresh());
  assert.ok(!fs.existsSync(path.join(repo, 'novo.md')), 'izmijenjen repo nije povučen');
  assert.strictEqual(dirty, null);
  git(repo, 'commit', '-qam', 'lokalno');
  const ahead = personal.sessionMessage({ source: 'startup' }, {}, fresh());
  assert.match(ahead, /`claude-licno` ima 1 commit koji nisu na GitHubu/);
  fs.rmSync(repo, { recursive: true, force: true });
});

test('lični sloj: noviji pluginovi u izvoru traže setup; izvor iz marketplacea, cloud preskače', () => {
  const { repo } = cloned('moj-izvor');
  fs.mkdirSync(path.join(repo, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude-plugin', 'marketplace.json'),
    JSON.stringify({ plugins: [{ name: 'project-guard', version: '0.10.0' }, { name: 'project-memory', version: '0.6.4' }] }));
  const plugDir = path.join(h.HOME, 'plugins');
  fs.mkdirSync(plugDir, { recursive: true });
  fs.writeFileSync(path.join(plugDir, 'known_marketplaces.json'),
    JSON.stringify({ 'moji-pluginsi': { source: { source: 'directory', path: repo } } }));
  fs.writeFileSync(path.join(plugDir, 'installed_plugins.json'), JSON.stringify({ plugins: {
    'project-guard@moji-pluginsi': [{ version: '0.9.1' }], 'project-memory@moji-pluginsi': [{ version: '0.6.4' }] } }));
  try {
    assert.strictEqual(personal.pluginsRepo(), repo);
    const msg = personal.sessionMessage({ source: 'startup' }, {}, fresh());
    assert.match(msg, /project-guard 0\.9\.1 → 0\.10\.0/);
    assert.doesNotMatch(msg, /project-memory/);
    assert.match(msg, /node scripts\/setup\.js --apply/);
    assert.strictEqual(personal.sessionMessage({ source: 'startup' }, { CLAUDE_CODE_REMOTE: 'true' }, fresh()), null);
    assert.strictEqual(personal.sessionMessage({ source: 'compact' }, {}, fresh()), null);
  } finally {
    fs.rmSync(plugDir, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('lični sloj: bez claude-licno i izvora pluginova nema poruke', () => {
  assert.strictEqual(personal.sessionMessage({ source: 'startup' }, {}, fresh()), null);
});
