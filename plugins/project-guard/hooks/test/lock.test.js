const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../guard');
const { isReadonlyCommand, LOCK } = require('../lib/lock');

test('komande: čitanje prolazi, pisanje ne', () => {
  for (const c of ['git status', 'git log --oneline -5 && git diff', 'ls -la | grep x', 'cat a.txt 2>&1', 'npm test',
    'node scripts/test.mjs', 'git worktree add ../p-x -b x', 'Get-ChildItem src', 'rg foo > /dev/null',
    'git config "branch.codex/x.base" "15"', 'git config --get branch.codex/x.base',
    'git -C "../p-codex-x" status --short', 'gh pr list --state all --json number', 'gh pr view codex/x --json state,url',
    'gh auth status', 'sed -n 1,80p a.md | tr a b', 'ls | sort | uniq', 'cut -d, -f1 a.csv', 'date']) {
    assert.ok(isReadonlyCommand(c), c);
  }
  for (const c of ['git commit -m x', 'rm -rf src', 'echo hi > a.txt', 'npm install react', 'git status && git push',
    'sed -i s/a/b/ f', 'mv a b', 'git config core.hooksPath x', 'git -C ../p commit -m x', 'sed -n s/a/b/p f -i',
    'gh pr create --base main', 'gh pr merge 5']) {
    assert.ok(!isReadonlyCommand(c), c);
  }
});

test('komande: | i ; unutar navodnika i { } blokova ne dijele komandu (PowerShell)', () => {
  for (const c of ['git log --oneline | Select-String "fix|feat"',
    'git ls-files | Where-Object { $_ -match \'\\.(md|js)$\' } | ForEach-Object { "{0,6} {1}" -f (Get-Content $_).Count, $_ }',
    '"---"; Get-Content package.json', 'Get-ChildItem | Sort-Object Name | Format-Table']) {
    assert.ok(isReadonlyCommand(c), c);
  }
  for (const c of ['Get-ChildItem | ForEach-Object { Remove-Item $_ }', 'Get-ChildItem | ForEach-Object { git add $_ }',
    'echo it\'s; rm -rf x', '"a" | Out-File b.txt', 'Get-Content a | Set-Content b', '$x = (git commit -m y)',
    'Get-ChildItem | ForEach-Object { (Remove-Item $_) }']) {
    assert.ok(!isReadonlyCommand(c), c);
  }
});

test('komande: čitanje iz paralelnih read-only sesija (lažni pozitivi do 0.9.1)', () => {
  for (const c of ['git status -sb', 'git -C C:/dev/x log --oneline -5', 'git --no-pager diff --stat main...HEAD',
    'git -C "C:\\dev\\x y" --no-pager show HEAD', 'git remote -v', 'git worktree list --porcelain', 'git rev-list --count HEAD',
    'git for-each-ref refs/heads', 'git merge-base HEAD main', 'git tag -l "v*"', 'git ls-remote origin', 'git reflog -5',
    'diff -u a.md b.md', 'gh pr view 3 --json state', 'gh pr list', 'gh repo view',
    'Get-ChildItem C:\\dev -Directory', 'Get-Content a.md -Encoding UTF8 | Select-Object -First 20',
    'Select-String -Path *.md -Pattern x', 'Test-Path x', 'Get-Item x',
    'for f in $(git ls-files \'*.md\'); do wc -l "$f"; done', 'for d in /c/dev/*/; do git -C "$d" status -sb 2>/dev/null | head -1; done',
    'n=$(git rev-list --count HEAD); echo $n', 'if [ -f x ]; then cat x; fi', 'while read l; do echo $l; done < a.txt',
    'foreach ($f in Get-ChildItem *.md) { (Get-Content $f -Encoding UTF8).Count }',
    'if (Test-Path x) { Get-Content x } else { "nema" }', 'try { Get-Content x } catch { "greska" }', '$x = Get-Content a.txt',
    'Get-ChildItem C:\\dev -Directory | ForEach-Object { git -C $_.FullName status -sb }']) {
    assert.ok(isReadonlyCommand(c), c);
  }
  for (const c of ['for f in $(rm -rf x); do echo $f; done', 'echo "$(git rm x)"', 'for f in *.md; do rm $f; done',
    'if (Test-Path x) { Remove-Item x }', '$x = (git commit -m y)', 'git --no-pager -C x commit -m a', '(cd x; rm y)',
    'git tag v1', 'git diff > out.txt', 'if [ -f x ]; then git push; fi', 'while true; do npm install; done']) {
    assert.ok(!isReadonlyCommand(c), c);
  }
});

test('brava: prva sesija uzme bravu, druga ne može pisati ali može čitati', () => {
  const root = h.project({ git: true, marker: true });
  const file = path.join(root, 'src/a.js');
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: file, content: 'x' }, 'A')), null);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, LOCK), 'utf8')).session_id, 'A');

  const b = run(h.pre(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'y' }, 'B'));
  assert.strictEqual(h.decision(b), 'deny');
  assert.match(b.hookSpecificOutput.permissionDecisionReason, /worktree/);
  assert.strictEqual(h.decision(run(h.pre(root, 'Bash', { command: 'git commit -am x' }, 'B'))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'git log' }, 'B')), null);
  // /codex-worktree iz blokirane sesije: worktree i zapis bazne grane prolaze
  const worktree = 'git worktree add ../p-codex-x -b codex/x && git config "branch.codex/x.base" "main"';
  assert.strictEqual(run(h.pre(root, 'Bash', { command: worktree }, 'B')), null);
  assert.strictEqual(run(h.pre(root, 'Read', { file_path: file }, 'B')), null);
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: file, content: 'z' }, 'A')), null);

  const start = run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'B' });
  assert.match(start.hookSpecificOutput.additionalContext, /druga sesija/);

  // izlazi iz brave rade i iz blokirane sesije
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'node -e "require(\'fs\').unlinkSync(\'.agent-lock.json\')"' }, 'B')), null);
  assert.strictEqual(run(h.pre(root, 'Bash', { command: 'node -e "x" > ~/.claude/pravila-pauza.json' }, 'B')), null);
});

test('brava: .agent-lock.json je u .git/info/exclude', () => {
  const root = h.project({ git: true, marker: true });
  run(h.pre(root, 'Write', { file_path: path.join(root, 'a.js'), content: 'x' }, 'A'));
  const exclude = fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf8');
  assert.ok(exclude.split(/\r?\n/).includes(LOCK));
});

test('brava: zastarjelu bravu preuzima druga sesija, kraj sesije je oslobađa', () => {
  const root = h.project({ git: true, marker: true });
  const old = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  fs.writeFileSync(path.join(root, LOCK), JSON.stringify({ agent: 'claude', session_id: 'A', since: old, heartbeat: old }));
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'a.js'), content: 'x' }, 'B')), null);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, LOCK), 'utf8')).session_id, 'B');

  run({ hook_event_name: 'SessionEnd', cwd: root, session_id: 'A' });
  assert.ok(fs.existsSync(path.join(root, LOCK)), 'tuđa brava ostaje');
  run({ hook_event_name: 'SessionEnd', cwd: root, session_id: 'B' });
  assert.ok(!fs.existsSync(path.join(root, LOCK)), 'vlastita brava se briše');
});

test('brava: bez gita nema brave, a pauza je isključuje', () => {
  const noGit = h.project({ outside: true });
  run(h.pre(noGit, 'Write', { file_path: path.join(noGit, 'a.js'), content: 'x' }, 'A'));
  assert.ok(!fs.existsSync(path.join(noGit, LOCK)));

  const root = h.project({ git: true, marker: true });
  run(h.pre(root, 'Write', { file_path: path.join(root, 'a.js'), content: 'x' }, 'A'));
  h.pause(true);
  try {
    assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'a.js'), content: 'y' }, 'B')), null);
  } finally {
    h.pause(false);
  }
});
