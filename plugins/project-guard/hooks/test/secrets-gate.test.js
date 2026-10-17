const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { run } = require('../guard');

test('tajne: .env, data/ i ključevi su blokirani, primjeri nisu', () => {
  const root = h.project({ marker: true });
  const p = (rel) => path.join(root, rel);
  assert.strictEqual(h.decision(run(h.pre(root, 'Write', { file_path: p('.env'), content: 'A=1' }))), 'deny');
  assert.strictEqual(h.decision(run(h.pre(root, 'Read', { file_path: p('.env.local') }))), 'deny');
  assert.strictEqual(h.decision(run(h.pre(root, 'Edit', { file_path: p('data/klijenti.csv') }))), 'deny');
  assert.strictEqual(h.decision(run(h.pre(root, 'Write', { file_path: p('certs/server.pem') }))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: p('.env.example'), content: 'A=' })), null);
  assert.strictEqual(run(h.pre(root, 'Read', { file_path: p('src/data.js') })), null);
});

test('tajne: komande koje diraju .env su blokirane', () => {
  const root = h.project({ marker: true });
  assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command: 'cat .env' }))), 'deny');
  assert.strictEqual(h.decision(run(h.pre(root, 'PowerShell', { command: 'Get-Content ./.env.production' }))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'cat .env.example' })), null);
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'npm run dev -- --environment x' })), null);
});

test('tajne: komande koje diraju secrets.json, credentials, data/ ili zaštićene fajlove', () => {
  const root = h.project({ marker: true, files: { '.claude/zasticeno.txt': 'src/legacy/**\n' } });
  for (const command of ['cat secrets.json', 'type .\\config\\credentials.yml', 'cat data/klijenti.csv', 'Get-Content .\\data\\x.csv',
    'cp src/legacy/a.js b.js', `cat "${path.join(root, 'data', 'x.csv')}"`]) {
    assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command }))), 'deny', command);
  }
  for (const command of ['cat src/secrets.js', 'git commit -m "sakrij secrets"', 'ls data', 'npm run data:seed',
    'curl https://x.io/data/a.json', 'cat src/data.js']) {
    assert.strictEqual(run(h.pre(root, 'Bash', { command })), null, command);
  }
});

test('tajne: Grep ne smije ciljati tajne ni data/, a kapija ne blokira čitanje', () => {
  const root = h.project({ git: true }); // nov projekat bez temelja: kapija važi samo za pisanje
  const grep = (input) => run(h.pre(root, 'Grep', { pattern: '.', ...input }));
  assert.strictEqual(h.decision(grep({ path: path.join(root, '.env') })), 'deny');
  assert.strictEqual(h.decision(grep({ path: 'data' })), 'deny');
  assert.strictEqual(h.decision(grep({ glob: '.env*' })), 'deny');
  assert.strictEqual(h.decision(grep({ glob: '**/secrets.json' })), 'deny');
  assert.strictEqual(grep({ glob: '*.js' }), null);
  assert.strictEqual(grep({ path: 'src' }), null);
  assert.strictEqual(grep({}), null);
  assert.strictEqual(run(h.pre(root, 'Read', { file_path: path.join(root, 'src/a.js') })), null);
});

test('tajne: .claude/zasticeno.txt i rad uprkos pauzi', () => {
  const root = h.project({ marker: true, files: { '.claude/zasticeno.txt': '# moje\nsrc/legacy/**\n' } });
  assert.strictEqual(h.decision(run(h.pre(root, 'Edit', { file_path: path.join(root, 'src/legacy/a.js') }))), 'deny');
  h.pause(true);
  try {
    assert.strictEqual(h.decision(run(h.pre(root, 'Write', { file_path: path.join(root, '.env') }))), 'deny');
  } finally {
    h.pause(false);
  }
});

test('kapija: nov projekat bez temelja blokira kod, a dozvoljava dokumente', () => {
  const root = h.project({ git: true });
  const w = (rel) => run(h.pre(root, 'Write', { file_path: path.join(root, rel), content: 'x' }));
  assert.strictEqual(h.decision(w('src/app.js')), 'deny');
  assert.match(w('src/app.js').hookSpecificOutput.permissionDecisionReason, /kickstart/);
  for (const ok of ['docs/VIZIJA.md', 'AGENTS.md', 'CLAUDE.md', '.claude/kickstart.json', 'src/features/.gitkeep', 'scripts/test.mjs', '.gitignore']) {
    assert.strictEqual(w(ok), null, ok);
  }
  assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command: 'npm create vite@latest app' }))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'git status' })), null);
});

test('kapija: marker, bez-kickstarta, postojeći projekat i folder van korijena ne blokiraju', () => {
  const cases = [
    h.project({ git: true, marker: true }),
    h.project({ files: { '.claude/bez-kickstarta': '' } }),
    h.project({ commit: true }),
    h.project({ outside: true }),
  ];
  for (const root of cases) {
    assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'src/app.js'), content: 'x' })), null, root);
  }
});

test('kapija: poruka na startu sesije razlikuje nov i postojeći projekat', () => {
  const start = (root) => run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'A' });
  assert.match(start(h.project({ git: true })).hookSpecificOutput.additionalContext, /nov projekat bez temelja/);
  assert.match(start(h.project({ commit: true })).hookSpecificOutput.additionalContext, /--postojeci/);
  assert.strictEqual(start(h.project({ outside: true })), null);
});

test('pauza isključuje kapiju', () => {
  const root = h.project({ git: true });
  h.pause(true);
  try {
    assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'src/app.js'), content: 'x' })), null);
  } finally {
    h.pause(false);
  }
});
