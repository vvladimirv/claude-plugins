const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../guard');
const { parse } = require('../lib/deps');

const post = (root, tool, toolInput, sid = 'A') => run({ hook_event_name: 'PostToolUse', cwd: root, session_id: sid, tool_name: tool, tool_input: toolInput });
const ctx = (out) => (out ? out.hookSpecificOutput.additionalContext : '');

function projectWithDeps() {
  const root = h.project({
    marker: true,
    files: {
      'package.json': JSON.stringify({ dependencies: { react: '^19' } }),
      'docs/adr/0001-izbor-stacka.md': '# 0001\nReact + Vite.',
    },
  });
  h.git(root, 'init', '-q', '-b', 'main');
  h.git(root, 'config', 'user.email', 't@t');
  h.git(root, 'config', 'user.name', 't');
  h.git(root, 'add', '-A');
  h.git(root, 'commit', '-qm', 'init');
  return root;
}

test('parse: package.json, requirements, pyproject, Cargo', () => {
  assert.deepStrictEqual([...parse('package.json', '{"dependencies":{"React":"1"},"devDependencies":{"vitest":"1"}}')], ['react', 'vitest']);
  assert.deepStrictEqual([...parse('requirements.txt', '# x\nFlask==3.0\n-r base.txt\nrequests[socks]>=2\n')], ['flask', 'requests']);
  assert.deepStrictEqual([...parse('pyproject.toml', '[project]\ndependencies = [\n  "fastapi>=0.1",\n  "httpx",\n]\n')], ['fastapi', 'httpx']);
  assert.deepStrictEqual([...parse('Cargo.toml', '[package]\nname="x"\n[dependencies]\nserde = "1"\n')], ['serde']);
});

test('zavisnosti: nova biblioteka bez ADR-a dobija podsjetnik, jednom po sesiji', () => {
  const root = projectWithDeps();
  const file = path.join(root, 'package.json');
  fs.writeFileSync(file, JSON.stringify({ dependencies: { react: '^19', lodash: '^4' } }));
  const out = ctx(post(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'y' }));
  assert.match(out, /lodash/);
  assert.doesNotMatch(out, /react/);
  assert.strictEqual(post(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'y' }), null);
  assert.match(ctx(post(root, 'Bash', { command: 'npm install lodash' }, 'B')), /lodash/);
});

test('zavisnosti: ADR koji spominje biblioteku, nov manifest i projekat bez docs/adr ne upozoravaju', () => {
  const root = projectWithDeps();
  const file = path.join(root, 'package.json');
  fs.writeFileSync(file, JSON.stringify({ dependencies: { react: '^19', zod: '^3' } }));
  h.write(root, 'docs/adr/0002-validacija.md', '# 0002\nKoristimo Zod za validaciju.');
  assert.strictEqual(post(root, 'Write', { file_path: file, content: '' }), null);

  const req = h.write(root, 'api/requirements.txt', 'flask\n');
  assert.strictEqual(post(root, 'Write', { file_path: req, content: 'flask\n' }), null);

  const bare = h.project({ commit: true, files: { 'package.json': '{}' } });
  assert.strictEqual(post(bare, 'Bash', { command: 'npm install lodash' }), null);
  assert.strictEqual(post(root, 'Bash', { command: 'npm test' }), null);
});
