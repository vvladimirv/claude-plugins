const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { run } = require('../guard');
const b = require('../lib/branches');
const map = require('../lib/branch-map');
const { isReadonlyCommand, LOCK } = require('../lib/lock');

const DAY = 86400000;

function out(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function commit(root, file) {
  h.write(root, file, `${file}\n`);
  h.git(root, 'add', '-A');
  h.git(root, 'commit', '-qm', file);
}

const post = (root, command) => ({ hook_event_name: 'PostToolUse', cwd: root, session_id: 'A', tool_name: 'Bash', tool_input: { command } });

test('grane: komanda za novu granu se prepozna', () => {
  assert.deepStrictEqual(b.parseNewBranch('git switch -c feat/x'), { branch: 'feat/x', worktree: false, from: null });
  assert.deepStrictEqual(b.parseNewBranch('git checkout -b "fix/y" origin/main'), { branch: 'fix/y', worktree: false, from: 'main' });
  assert.deepStrictEqual(b.parseNewBranch('git worktree add "../p-codex-z" -b "codex/z"'), { branch: 'codex/z', worktree: true, from: null });
  assert.deepStrictEqual(b.parseNewBranch('git -C ../p worktree add -b w ../p-w'), { branch: 'w', worktree: true, from: null });
  assert.strictEqual(b.parseNewBranch('git switch main'), null);
  assert.strictEqual(b.parseNewBranch('git checkout -- a.txt'), null);
});

test('grane: nova grana dobije bazu iz koje je nastala, a postojeća baza se ne prepisuje', () => {
  const root = h.project({ commit: true });
  h.git(root, 'switch', '-qc', 'a');
  run(post(root, 'git switch -c a'));
  assert.strictEqual(b.readMeta(root, 'a').base, 'main');
  h.git(root, 'switch', '-qc', 'b');
  run(post(root, 'git switch -c b'));
  assert.strictEqual(b.readMeta(root, 'b').base, 'a');
  h.git(root, 'switch', '-qc', 'c', 'main');
  run(post(root, 'git switch -c c main'));
  assert.strictEqual(b.readMeta(root, 'c').base, 'main');
  b.writeMeta(root, 'c', { base: 'a' });
  run(post(root, 'git switch -c c main'));
  assert.strictEqual(b.readMeta(root, 'c').base, 'a', 'postojeća baza ostaje');
  h.git(root, 'switch', '-q', 'a');
  h.git(root, 'worktree', 'add', '-q', path.join(root, '..', path.basename(root) + '-w'), '-b', 'w');
  run(post(root, 'git worktree add ../x-w -b w'));
  assert.strictEqual(b.readMeta(root, 'w').base, 'a');
});

test('grane: preporuka modela po zadatku', () => {
  assert.deepStrictEqual(b.recommend('Refaktor modula za plaćanja'), { model: 'opus', effort: 'high' });
  assert.deepStrictEqual(b.recommend('arhitektura sinhronizacije'), { model: 'opus', effort: 'high' });
  assert.deepStrictEqual(b.recommend('pravopis u podsjetniku'), { model: 'haiku', effort: 'low' });
  assert.deepStrictEqual(b.recommend('osvježi STATUS.md'), { model: 'haiku', effort: 'low' });
  assert.deepStrictEqual(b.recommend('unos troška sa kategorijom'), { model: 'sonnet', effort: 'medium' });
  assert.strictEqual(b.label(b.recommend('dijakritika')), 'Haiku/nizak');
});

test('grane: opis sa navodnicima i posebnim znakovima se čita onako kako je upisan', () => {
  const root = h.project({ commit: true });
  h.git(root, 'branch', 'feat/x.y');
  const zadatak = 'Popravi "navodnike"; i # znakove \\ kosu crtu';
  b.writeMeta(root, 'feat/x.y', { zadatak, ceka: 'main' });
  assert.deepStrictEqual(b.readMeta(root, 'feat/x.y'), { zadatak, ceka: 'main' });
  b.writeMeta(root, 'feat/x.y', { ceka: '' });
  assert.deepStrictEqual(b.readMeta(root, 'feat/x.y'), { zadatak });
});

test('grane: start sesije ćuti na glavnoj grani, a broji gotove grane kad ih je ≥ 3', () => {
  const root = h.project({ commit: true });
  assert.strictEqual(b.sessionMessage({}, root), null);
  for (const n of ['x1', 'x2', 'x3']) h.git(root, 'branch', n);
  const msg = b.sessionMessage({}, root);
  assert.match(msg, /3 grana je već spojeno u `main`/);
  assert.ok(msg.split('\n').length <= 3);
});

test('grane: start sesije na novoj grani upiše bazu i preporuči model', () => {
  const root = h.project({ commit: true });
  h.git(root, 'switch', '-qc', 'claude/nova');
  const msg = b.sessionMessage({ model: 'claude-opus-5-5' }, root);
  assert.match(msg, /`claude\/nova` · baza: `main`/);
  assert.strictEqual(b.readMeta(root, 'claude/nova').base, 'main');
  b.writeMeta(root, 'claude/nova', { zadatak: 'pravopis', model: 'haiku', effort: 'low' });
  const msg2 = b.sessionMessage({ model: 'claude-opus-5-5' }, root);
  assert.match(msg2, /preporuka: Haiku\/nizak/);
  assert.match(msg2, /izabere Haiku i effort nizak/);
  assert.doesNotMatch(b.sessionMessage({ model: 'claude-haiku-5-5' }, root), /izabere/);
});

test('grane: SessionStart iz guard.js ima sekciju Grane', () => {
  const root = h.project({ commit: true });
  h.git(root, 'switch', '-qc', 'feat/a');
  b.writeMeta(root, 'feat/a', { zadatak: 'unos troška' });
  const res = run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'A' });
  assert.match(res.hookSpecificOutput.additionalContext, /## Grane\n`feat\/a` · zadatak: unos troška/);
});

// Repo sa po jednom granom za svako stanje.
function sampleRepo() {
  const root = h.project({ commit: true });
  const wt = (name) => path.join(root, '..', `${path.basename(root)}-${name}`);
  h.git(root, 'switch', '-qc', 'gotova');
  commit(root, 'g.txt');
  h.git(root, 'switch', '-q', 'main');
  h.git(root, 'merge', '-q', '--no-ff', 'gotova', '-m', 'merge gotova');
  h.git(root, 'branch', 'prazna');
  for (const name of ['otvorena', 'ceka', 'squash', 'pr']) {
    h.git(root, 'switch', '-qc', name, 'main');
    commit(root, `${name}.txt`);
  }
  h.git(root, 'switch', '-q', 'main');
  b.writeMeta(root, 'ceka', { ceka: 'otvorena', zadatak: 'refaktor' });
  h.git(root, 'worktree', 'add', '-q', wt('stala'), '-b', 'stala');
  h.write(wt('stala'), 'nesnimljeno.txt');
  h.git(root, 'worktree', 'add', '-q', wt('radi'), '-b', 'radi');
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), `\n${LOCK}\n`);
  h.write(wt('radi'), LOCK, JSON.stringify({ session_id: 'B', since: new Date().toISOString(), heartbeat: new Date().toISOString() }));
  h.git(root, 'worktree', 'add', '-q', wt('cist'), '-b', 'cist');
  const prs = [
    { number: 2, headRefName: 'pr', state: 'OPEN', url: 'https://github.com/x/y/pull/2', headRefOid: out(root, 'rev-parse', 'pr') },
    { number: 1, headRefName: 'squash', state: 'MERGED', url: 'https://github.com/x/y/pull/1', headRefOid: out(root, 'rev-parse', 'squash') },
  ];
  return { root, wt, prs };
}

test('grane: pregled svrsta svaku granu u jedno stanje sa radnjom', async () => {
  const { root, prs } = sampleRepo();
  const states = async (opts) => Object.fromEntries((await map.collect(root, opts)).rows.map((r) => [r.branch, r.state]));
  assert.deepStrictEqual(await states({ prs }), {
    ceka: 'ceka', cist: 'nova', gotova: 'gotova', otvorena: 'otvorena', pr: 'pr', prazna: 'nova', radi: 'radi', squash: 'gotova', stala: 'stala',
  });
  const later = await states({ prs, now: Date.now() + 2 * DAY });
  assert.strictEqual(later.prazna, 'prazna');
  assert.strictEqual(later.radi, 'prazna', 'brava istekne, a na grani nema rada');
  const old = await states({ prs: null, now: Date.now() + 20 * DAY });
  assert.strictEqual(old.otvorena, 'stara');
  assert.strictEqual(old.squash, 'stara', 'bez GitHuba squash spajanje se ne vidi');

  const rep = await map.collect(root, { prs });
  const text = map.format(rep);
  assert.match(text, /^Grane \(glavna: `main`\): 👀 1 čeka pregled · ⏸️ 1 stala · 🔒 1 radi se · ⏳ 1 čeka granu/);
  assert.match(text, /`ceka` · „refaktor" · čeka `otvorena` · .*model: Opus\/visok → prvo završi `otvorena`/);
  assert.match(text, /`otvorena` · nju čeka: `ceka`/);
  assert.match(text, /pregledaj PR i klikni Merge: https:\/\/github.com\/x\/y\/pull\/2/);
  assert.match(text, /`stala` → otvori sesiju u folderu `[^`]+-stala` i pokreni `\/kraj-sesije`/);
});

test('grane: čišćenje briše samo gotove i prazne, nikad folder sesije ni glavni folder', async () => {
  const { root, wt, prs } = sampleRepo();
  h.git(root, 'switch', '-q', 'gotova');
  let rep = await map.collect(root, { prs, now: Date.now() + 2 * DAY });
  let plan = map.cleanupPlan(rep, { here: wt('cist'), skip: ['prazna'] });
  assert.deepStrictEqual(plan.items.map((i) => i.branch).sort(), ['radi', 'squash']);
  assert.deepStrictEqual(plan.kept.map((k) => k.branch).sort(), ['cist', 'gotova']);

  h.git(root, 'switch', '-q', 'main');
  rep = await map.collect(root, { prs, now: Date.now() + 2 * DAY });
  plan = map.cleanupPlan(rep, { here: root });
  const res = await map.cleanup(plan);
  assert.deepStrictEqual(res.failed, []);
  assert.deepStrictEqual(res.done.map((i) => i.branch).sort(), ['cist', 'gotova', 'prazna', 'radi', 'squash']);
  assert.ok(!fs.existsSync(wt('cist')), 'folder gotove grane je obrisan');
  assert.ok(fs.existsSync(wt('stala')), 'folder sa nesnimljenim radom ostaje');
  assert.deepStrictEqual(out(root, 'branch', '--format=%(refname:short)').split('\n').sort(), ['ceka', 'main', 'otvorena', 'pr', 'stala']);
});

// Na Windowsu sesija može dobiti kratko 8.3 ime foldera (RUNNER~1), a git daje dugo. Ovdje isto glumi symlink.
test('grane: folder sesije se prepoznaje i preko druge putanje do iste mape', { skip: process.platform === 'win32' }, async () => {
  const { root, wt, prs } = sampleRepo();
  const alias = path.join(path.dirname(root), `${path.basename(root)}-alias`);
  fs.symlinkSync(wt('cist'), alias);
  const plan = map.cleanupPlan(await map.collect(root, { prs, now: Date.now() + 2 * DAY }), { here: alias });
  assert.ok(plan.kept.some((k) => k.branch === 'cist'), 'cist je folder ove sesije');
  assert.ok(!plan.items.some((i) => i.branch === 'cist'));
});

test('grane: upisi prebaci novu granu na traženu bazu, a granu sa radom ne dira', async () => {
  const { root } = sampleRepo();
  h.git(root, 'switch', '-qc', 'claude/nova', 'main');
  const res = await map.register(root, { zadatak: 'pravopis u podsjetniku', baza: 'otvorena' });
  assert.ok(res.ok, res.msg);
  assert.strictEqual(out(root, 'rev-parse', 'HEAD'), out(root, 'rev-parse', 'otvorena'));
  assert.deepStrictEqual(b.readMeta(root, 'claude/nova'), { zadatak: 'pravopis u podsjetniku', model: 'haiku', effort: 'low', base: 'otvorena' });

  h.git(root, 'switch', '-q', 'ceka');
  const bad = await map.register(root, { baza: 'pr' });
  assert.strictEqual(bad.ok, false);
  assert.match(bad.msg, /već ima svoj rad/);
  assert.strictEqual((await map.register(root, { ceka: 'nema-je' })).ok, false);
});

test('grane: pregled i spisak za čišćenje ne uzimaju bravu, a čišćenje i upis je uzimaju', () => {
  assert.ok(isReadonlyCommand('node "C:\\x\\hooks\\grane-cli.js" pregled --json --root "C:\\dev\\p"'));
  assert.ok(isReadonlyCommand('node C:/x/hooks/grane-cli.js pocisti --spisak'));
  assert.ok(!isReadonlyCommand('node C:/x/hooks/grane-cli.js pocisti --izvrsi'));
  assert.ok(!isReadonlyCommand('node C:/x/hooks/grane-cli.js upisi --zadatak a'));
});
