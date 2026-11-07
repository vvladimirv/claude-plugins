// Cloud sesija: klon pluginova iz setup skripte se na startu sesije povuče sa GitHuba.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const selfupdate = require('../lib/selfupdate');
const { run } = require('../guard');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
let n = 0;

function market(versions) {
  return JSON.stringify({ name: 'm', plugins: Object.entries(versions).map(([name, version]) => ({ name, version, source: `./plugins/${name}` })) });
}

function setVersions(dir, versions, msg) {
  h.write(dir, '.claude-plugin/marketplace.json', market(versions));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', msg);
  git(dir, 'push', '-q');
}

// GitHub (bare), klon iz setup skripte (/opt/...) i razvojni klon iz kojeg se objavljuje nova verzija.
function setup() {
  const id = `${++n}-${Date.now()}`;
  const bare = path.join(h.BASE, `plugins-remote-${id}.git`);
  const dev = path.join(h.BASE, `plugins-dev-${id}`);
  const opt = path.join(h.BASE, `plugins-opt-${id}`);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  execFileSync('git', ['clone', '-q', bare, dev], { stdio: 'ignore' });
  git(dev, 'config', 'user.email', 't@t');
  git(dev, 'config', 'user.name', 't');
  git(dev, 'checkout', '-q', '-b', 'main');
  h.write(dev, 'plugins/a/.claude-plugin/plugin.json', '{"name":"a"}');
  h.write(dev, '.claude-plugin/marketplace.json', market({ a: '0.1.0' }));
  git(dev, 'add', '-A');
  git(dev, 'commit', '-qm', 'init');
  git(dev, 'push', '-q', '-u', 'origin', 'main');
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${bare}`, opt], { stdio: 'ignore' });
  const env = { CLAUDE_CODE_REMOTE: 'true', CLAUDE_CODE_PLUGIN_DIRS: path.join(opt, 'plugins') };
  return { dev, opt, env };
}

const marketVersion = (opt) => JSON.parse(fs.readFileSync(path.join(opt, '.claude-plugin/marketplace.json'), 'utf8')).plugins;

test('cloud: start sesije povuče novu verziju pluginova i javi je', () => {
  const { dev, opt, env } = setup();
  setVersions(dev, { a: '0.2.0', b: '1.0.0' }, 'nova verzija');
  const msg = selfupdate.sessionMessage({ source: 'startup' }, env);
  assert.match(msg, /a 0\.1\.0 → 0\.2\.0/);
  assert.match(msg, /b 1\.0\.0 \(nov\)/);
  assert.strictEqual(marketVersion(opt)[0].version, '0.2.0');
});

test('cloud: bez nove verzije nema poruke', () => {
  const { env } = setup();
  assert.strictEqual(selfupdate.sessionMessage({ source: 'startup' }, env), null);
});

test('lokalno (van clouda), resume i compact: klon se ne dira', () => {
  const { dev, opt, env } = setup();
  setVersions(dev, { a: '0.2.0' }, 'nova verzija');
  assert.strictEqual(selfupdate.sessionMessage({ source: 'startup' }, { ...env, CLAUDE_CODE_REMOTE: undefined }), null);
  assert.strictEqual(selfupdate.sessionMessage({ source: 'resume' }, env), null);
  assert.strictEqual(selfupdate.sessionMessage({ source: 'compact' }, env), null);
  assert.strictEqual(marketVersion(opt)[0].version, '0.1.0');
});

test('cloud: klon sa lokalnim izmjenama se ne povlači', () => {
  const { dev, opt, env } = setup();
  setVersions(dev, { a: '0.2.0' }, 'nova verzija');
  fs.writeFileSync(path.join(opt, 'plugins/a/.claude-plugin/plugin.json'), '{"name":"a","izmjena":1}');
  assert.strictEqual(selfupdate.sessionMessage({ source: 'startup' }, env), null);
  assert.strictEqual(marketVersion(opt)[0].version, '0.1.0');
});

test('cloud: folder koji nije marketplace klon se preskače', () => {
  const plain = h.project({ commit: true, outside: true });
  const env = { CLAUDE_CODE_REMOTE: 'true', CLAUDE_CODE_PLUGIN_DIRS: `${plain}${path.delimiter}${path.join(h.BASE, 'nema-ga')}` };
  assert.strictEqual(selfupdate.sessionMessage({ source: 'startup' }, env), null);
});

test('guard: poruka o osvježenim pluginovima ide u SessionStart kontekst', () => {
  const { dev, env } = setup();
  setVersions(dev, { a: '0.3.0' }, 'nova verzija');
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    const root = h.project({ commit: true, marker: true });
    const out = run({ hook_event_name: 'SessionStart', source: 'startup', cwd: root, session_id: 'SU' });
    assert.match(out.hookSpecificOutput.additionalContext, /## Pluginovi\n🔄 .*a 0\.1\.0 → 0\.3\.0/);
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
