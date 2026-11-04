const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildContext, trimStatus } = require('./session-start.js');

const HOOK = path.join(__dirname, 'session-start.js');

function runHook(cwd, projectDir) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR; // projekat je samo input.cwd, ne sesija iz koje se testovi pokreću
  if (projectDir) env.CLAUDE_PROJECT_DIR = projectDir;
  const out = execFileSync('node', [HOOK], { input: JSON.stringify({ cwd }), encoding: 'utf8', env });
  return out ? JSON.parse(out) : null;
}

test('korijen projekta: CLAUDE_PROJECT_DIR ima prednost nad cwd (kao u project-guard)', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  fs.writeFileSync(path.join(project, 'STATUS.md'), '# STATUS\n- korijen sesije');
  const sub = path.join(project, 'src');
  fs.mkdirSync(sub);
  const res = runHook(sub, project);
  assert.match(res.hookSpecificOutput.additionalContext, /korijen sesije/);
});

test('bez STATUS.md i bez gita: nema izlaza', () => {
  assert.strictEqual(buildContext({ statusText: '', gitLog: '', uncommitted: 0 }), '');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  assert.strictEqual(runHook(dir), null);
});

test('STATUS.md i git log ulaze u kontekst', () => {
  const ctx = buildContext({ statusText: '# STATUS\n- radi X', gitLog: 'abc123 feat: X\n', uncommitted: 0 });
  assert.match(ctx, /radi X/);
  assert.match(ctx, /abc123 feat: X/);
  assert.doesNotMatch(ctx, /Necommitovano/);
});

test('necommitovani fajlovi se prijave', () => {
  const ctx = buildContext({ statusText: '', gitLog: '', uncommitted: 3 });
  assert.match(ctx, /3 izmijenjenih fajlova/);
});

test('predug STATUS bez sekcija: staro skraćivanje od vrha i napomena', () => {
  const long = Array.from({ length: 100 }, (_, i) => `linija ${i}`).join('\n');
  const out = trimStatus(long);
  assert.ok(out.split('\n').length <= 41);
  assert.match(out, /^linija 0\n/);
  assert.match(out, /skraćeno/);
  const wide = Array.from({ length: 10 }, () => 'x'.repeat(500)).join('\n');
  assert.ok(trimStatus(wide).length <= 3000 + 100);
  assert.match(trimStatus(wide), /skraćeno/);
});

test('dugačak „Radi“ ne guta „Sljedeće“ i „Blokere“: oni idu cijeli, „Radi“ se skrati', () => {
  const radi = Array.from({ length: 6 }, (_, i) => `- stavka ${i} ${'opis '.repeat(200)}`).join('\n');
  const status = '# STATUS\n\n**Ažurirano:** 2026-11-04 · **Talas:** D\n\n## Radi\n' + radi
    + '\n\n## Sljedeće\n1. prvi sljedeći zadatak\n2. drugi sljedeći zadatak\n\n## Blokeri / otvorena pitanja\n- jedan bloker';
  assert.ok(status.length > 5000);
  const out = trimStatus(status);
  assert.match(out, /^# STATUS\n\n\*\*Ažurirano:\*\* 2026-11-04/);
  assert.match(out, /## Radi\n- stavka 0/);
  assert.match(out, /skraćeno/);
  assert.match(out, /## Sljedeće\n1\. prvi sljedeći zadatak\n2\. drugi sljedeći zadatak\n\n## Blokeri \/ otvorena pitanja\n- jedan bloker$/);
  assert.ok(out.indexOf('skraćeno') < out.indexOf('## Sljedeće'), 'napomena je na kraju „Radi“, prije „Sljedeće“');
  assert.ok(out.length <= 3000 + 100, `ukupno ${out.length} znakova`);
});

test('„Radi“ sa previše linija: linije „Sljedeće“ ostaju, „Radi“ gubi linije', () => {
  const radi = Array.from({ length: 60 }, (_, i) => `- kratka ${i}`).join('\n');
  const out = trimStatus('# STATUS\n\n## Radi\n' + radi + '\n\n## Sljedeće\n1. a\n2. b\n3. c');
  assert.ok(out.split('\n').length <= 42, `linija: ${out.split('\n').length}`);
  assert.match(out, /## Sljedeće\n1\. a\n2\. b\n3\. c$/);
  assert.match(out, /skraćeno/);
});

test('kratak STATUS sa sekcijama: ništa se ne mijenja', () => {
  const status = '# STATUS\n\n**Ažurirano:** 2026-11-04\n\n## Radi\n- X\n\n## Sljedeće\n1. Y\n\n## Blokeri / otvorena pitanja\n- nema';
  assert.strictEqual(trimStatus(status), status);
  assert.strictEqual(trimStatus(status.replace(/\n/g, '\r\n')), status);
});

test('STATUS ovog repoa: u kontekst ulazi sekcija „Sljedeće“', () => {
  const own = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'STATUS.md'), 'utf8');
  const out = trimStatus(own);
  assert.match(out, /## Sljedeće\n1\. /);
  assert.ok(out.length <= 3000 + 100, `ukupno ${out.length} znakova`);
});

test('pravi git repo: hook vraća SessionStart JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'STATUS.md'), '# STATUS\n- test stanje');
  g('add', '-A');
  g('commit', '-qm', 'chore: prvi');
  fs.writeFileSync(path.join(dir, 'novo.txt'), 'x');

  const res = runHook(dir);
  assert.strictEqual(res.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(res.hookSpecificOutput.additionalContext, /test stanje/);
  assert.match(res.hookSpecificOutput.additionalContext, /chore: prvi/);
  assert.match(res.hookSpecificOutput.additionalContext, /1 izmijenjenih fajlova/);
});

test('uz stanje projekta ide i pravilo o sljedećem koraku', () => {
  const ctx = buildContext({ statusText: '# STATUS', gitLog: '', uncommitted: 0 });
  assert.match(ctx, /Vođenje korisnika/);
  assert.match(ctx, /Sljedeće:/);
});

test('napredak iz blueprinta ulazi u kontekst', () => {
  const ctx = buildContext({ statusText: '', gitLog: '', uncommitted: 0, progress: '## Napredak\nNapredak: MVP gotov' });
  assert.match(ctx, /Napredak: MVP gotov/);
});

test('pomoćne sesije: glavni folder dobija pravilo o karticama, worktree pravilo o /kraj-sesije auto', () => {
  const main = buildContext({ statusText: '# STATUS', gitLog: '', uncommitted: 0, worktree: false });
  assert.match(main, /karticu pomoćne sesije/);
  assert.match(main, /\/pomocna/);
  assert.doesNotMatch(main, /kraj-sesije auto/);

  const wt = buildContext({ statusText: '# STATUS', gitLog: '', uncommitted: 0, worktree: true });
  assert.match(wt, /Ti si pomoćna sesija/);
  assert.match(wt, /\/kraj-sesije auto/);
  assert.match(wt, /STATUS\.md ne diraj/);

  const plain = buildContext({ statusText: '# STATUS', gitLog: '', uncommitted: 0 });
  const extra = (s) => s.length - plain.length;
  assert.ok(extra(main) < 300 && extra(wt) < 400, `pravilo mora biti kratko (${extra(main)}, ${extra(wt)} znakova)`);
});

test('worktree unutar projekta: hook čita worktree i zna da je worktree, iako je CLAUDE_PROJECT_DIR glavni repo', () => {
  const main = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  const g = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
  g(main, 'init', '-q', '-b', 'main');
  g(main, 'config', 'user.email', 't@t');
  g(main, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(main, 'STATUS.md'), '# STATUS\n- glavni');
  g(main, 'add', '-A');
  g(main, 'commit', '-qm', 'chore: prvi');
  const wt = path.join(main, '.claude', 'worktrees', 'pomocna');
  g(main, 'worktree', 'add', '-q', wt, '-b', 'pomocna');

  const inWt = runHook(wt, main).hookSpecificOutput.additionalContext;
  assert.match(inWt, /\/kraj-sesije auto/);
  const inMain = runHook(main, main).hookSpecificOutput.additionalContext;
  assert.match(inMain, /karticu pomoćne sesije/);
});
