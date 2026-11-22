const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { execFileSync } = require('child_process');
const { run } = require('../guard');

const post = (root, tool, toolInput) => run({ hook_event_name: 'PostToolUse', cwd: root, session_id: 'A', tool_name: tool, tool_input: toolInput });

test('limit: nov fajl preko 500 linija je blokiran, markdown nije', () => {
  const root = h.project({ marker: true });
  const big = h.lines(600);
  assert.strictEqual(h.decision(run(h.pre(root, 'Write', { file_path: path.join(root, 'src/a.ts'), content: big }))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'docs/x.md'), content: big })), null);
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'node_modules/x/a.js'), content: big })), null);
});

test('limit: monolit ne smije rasti, ali se smije smanjivati', () => {
  const root = h.project({ marker: true, files: { 'app.py': h.lines(800), 'mid.py': h.lines(495) } });
  const edit = (f, oldS, newS) => run(h.pre(root, 'Edit', { file_path: path.join(root, f), old_string: oldS, new_string: newS }));
  assert.strictEqual(h.decision(edit('app.py', 'const a1 = 1;', 'const a1 = 1;\nx\ny')), 'deny');
  assert.strictEqual(edit('app.py', 'const a1 = 1;\nconst a2 = 2;', 'z'), null);
  assert.strictEqual(h.decision(edit('mid.py', 'const a1 = 1;', h.lines(10))), 'deny');
  assert.strictEqual(edit('mid.py', 'const a1 = 1;', 'const a1 = 11;'), null);
});

test('limit: .claude/granice.json mijenja limite', () => {
  const root = h.project({ marker: true, files: { '.claude/granice.json': '{"maks": 1000, "iskljuci": ["legacy/**"]}' } });
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'src/a.js'), content: h.lines(600) })), null);
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'legacy/b.js'), content: h.lines(2000) })), null);
});

test('upozorenja: fajl preko 300 linija i hardkodovana boja u UI projektu', () => {
  const root = h.project({ marker: true, files: { 'docs/DIZAJN-SISTEM.md': '# DS', 'src/big.js': h.lines(350) } });
  const warn = post(root, 'Write', { file_path: path.join(root, 'src/big.js'), content: h.lines(350) });
  assert.match(warn.hookSpecificOutput.additionalContext, /350 linija/);

  h.write(root, 'src/Btn.css', '.b { color: #ff0000; }\n');
  const color = post(root, 'Write', { file_path: path.join(root, 'src/Btn.css'), content: '.b { color: #ff0000; }\n' });
  assert.match(color.hookSpecificOutput.additionalContext, /hardkodovana boja/);

  h.write(root, 'src/tokens.css', ':root { --c: #ff0000; }\n');
  assert.strictEqual(post(root, 'Write', { file_path: path.join(root, 'src/tokens.css'), content: ':root { --c: #ff0000; }\n' }), null);
  const mock = '<style>.b { color: #123456; }</style>\n';
  h.write(root, 'docs/mockupi/2026-11-08-izgled.html', mock);
  assert.strictEqual(post(root, 'Write', { file_path: path.join(root, 'docs/mockupi/2026-11-08-izgled.html'), content: mock }), null,
    'mockup predlaže tokene, pa boja tu nije greška');
  h.write(root, 'src/Link.jsx', '<a href="#add">x</a>\n');
  assert.strictEqual(post(root, 'Write', { file_path: path.join(root, 'src/Link.jsx'), content: '<a href="#add">x</a>\n' }), null);
});

const VIZIJA = '# Vizija\n\n## Obim\n- unos troškova\n- mjesečni izvještaj\n\n## Van obima\n- investicije\n\n## Uspjeh znači\nx\n';

test('obim: zahtjev za izmjenu dobija podsjetnik, pitanje i komanda ne', () => {
  const root = h.project({ marker: true, files: { 'docs/VIZIJA.md': VIZIJA } });
  const ask = (prompt) => run({ hook_event_name: 'UserPromptSubmit', cwd: root, session_id: 'A', prompt });
  assert.match(ask('napravi mi skriptu za YouTube').hookSpecificOutput.additionalContext, /Čuvar obima/);
  assert.match(ask('Dodaj izvoz u CSV').hookSpecificOutput.additionalContext, /Obim/);
  assert.strictEqual(ask('kako radi async u Pythonu?'), null);
  assert.strictEqual(ask('/kraj-sesije'), null);
  assert.strictEqual(ask('svjesno, nastavi i napravi to'), null);
  assert.strictEqual(run({ hook_event_name: 'UserPromptSubmit', cwd: h.project({ marker: true }), prompt: 'napravi x' }), null);

  const start = run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'A' });
  assert.match(start.hookSpecificOutput.additionalContext, /unos troškova; mjesečni izvještaj/);
  assert.match(start.hookSpecificOutput.additionalContext, /Van obima: investicije/);
});

test('obim: nov folder ili funkcija van plana traži potvrdu korisnika', () => {
  const root = h.project({
    marker: true,
    files: { 'docs/ARHITEKTURA.md': 'src/features/unos', 'docs/INVENTAR-FUNKCIJA.md': '| F-01 | unos |', 'src/features/unos/a.js': 'x' },
  });
  const w = (rel) => run(h.pre(root, 'Write', { file_path: path.join(root, rel), content: 'x' }));
  assert.strictEqual(h.decision(w('youtube/dl.py')), 'ask');
  assert.strictEqual(h.decision(w('src/features/youtube/dl.js')), 'ask');
  assert.strictEqual(w('src/features/unos/b.js'), null);
  assert.strictEqual(w('tests/a.test.js'), null);
});

test('stop: podsjetnik na necommitovan rad samo jednom po sesiji', () => {
  const root = h.project({ commit: true, marker: true });
  for (let i = 0; i < 11; i++) h.write(root, `src/f${i}.js`);
  const stop = (sid) => run({ hook_event_name: 'Stop', cwd: root, session_id: sid });
  assert.match(stop('S1').systemMessage, /11 fajlova/);
  assert.strictEqual(stop('S1'), null);
  assert.match(stop('S2').systemMessage, /kraj-sesije/);
  assert.strictEqual(run({ hook_event_name: 'Stop', cwd: root, session_id: 'S3', stop_hook_active: true }), null);
});

test('proces: guard.js vraća ispravan JSON i ne pada na lošem ulazu', () => {
  const guard = path.join(__dirname, '..', 'guard.js');
  const root = h.project({ marker: true });
  const env = { ...process.env };
  const out = execFileSync('node', [guard], { env, encoding: 'utf8', input: JSON.stringify(h.pre(root, 'Write', { file_path: path.join(root, '.env') })) });
  assert.strictEqual(JSON.parse(out).hookSpecificOutput.permissionDecision, 'deny');
  const bad = JSON.parse(execFileSync('node', [guard], { env, encoding: 'utf8', input: 'nije json' }));
  assert.match(bad.systemMessage, /nije završio provjeru/);
});

test('obim: poslije izdanja (faza odrzavanje) nove funkcije su zamrznute', () => {
  const root = h.project({
    files: {
      'docs/VIZIJA.md': VIZIJA,
      '.claude/kickstart.json': JSON.stringify({ status: 'gotovo', faza: 'odrzavanje', izdanja: [{ verzija: 'v1.0', datum: '2026-09-24' }] }),
    },
  });
  const ask = (prompt) => run({ hook_event_name: 'UserPromptSubmit', cwd: root, session_id: 'A', prompt });
  assert.match(ask('dodaj izvoz u PDF').hookSpecificOutput.additionalContext, /izdat \(v1\.0\) i obim je zamrznut/);
  assert.strictEqual(ask('zašto je ovo sporo?'), null);
  const start = run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'A' });
  assert.match(start.hookSpecificOutput.additionalContext, /održavanje/);
});

test('limit: replace_all računa svako pojavljivanje', () => {
  const body = Array.from({ length: 400 }, () => 'foo();').join('\n') + '\n';
  const root = h.project({ marker: true, files: { 'src/a.js': body } });
  const edit = (extra) => run(h.pre(root, 'Edit', { file_path: path.join(root, 'src/a.js'), old_string: 'foo();', new_string: 'foo();\nbar();', ...extra }));
  assert.strictEqual(edit({}), null, 'jedna zamjena: 401 linija');
  assert.strictEqual(h.decision(edit({ replace_all: true })), 'deny', '400 zamjena: 800 linija');
  assert.strictEqual(run(h.pre(root, 'Edit', { file_path: path.join(root, 'src/a.js'), old_string: 'foo();', new_string: 'baz();', replace_all: true })), null);
});

test('obim: engleske riječi su cijele ("address" nije "add"), a oblici glagola se hvataju', () => {
  const root = h.project({ marker: true, files: { 'docs/VIZIJA.md': '# V\n\n## Obim\n- budžet\n' } });
  const ask = (prompt) => run({ hook_event_name: 'UserPromptSubmit', cwd: root, session_id: 'A', prompt });
  for (const p of ['what is the address field', 'objasni mi sredinu ekrana', 'koji makeup']) assert.strictEqual(ask(p), null, p);
  for (const p of ['added a button?', 'fixes for login', 'dodajte polje', 'sredi ovo']) assert.ok(ask(p), p);
});

test('Godot: .gd fajl se broji u limit, .godot i addons/ ne', () => {
  const root = h.project({ marker: true });
  const big = h.lines(600);
  assert.strictEqual(h.decision(run(h.pre(root, 'Write', { file_path: path.join(root, 'game/scripts/a.gd'), content: big }))), 'deny');
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'game/.godot/cache.gd'), content: big })), null);
  assert.strictEqual(run(h.pre(root, 'Write', { file_path: path.join(root, 'game/addons/gut/gut.gd'), content: big })), null);
  h.write(root, 'game/ui/paleta.gd', h.lines(310));
  const warn = post(root, 'Write', { file_path: path.join(root, 'game/ui/paleta.gd'), content: h.lines(310) });
  assert.match(warn.hookSpecificOutput.additionalContext, /310 linija/);
});

test('Godot: Color(...) van tokens.gd dobija upozorenje, token, ime boje, komentar i test ne', () => {
  const root = h.project({ marker: true, files: { 'docs/DIZAJN-SISTEM.md': '# DS' } });
  const ctx = (rel, content) => post(root, 'Write', { file_path: path.join(root, rel), content })?.hookSpecificOutput.additionalContext;
  assert.match(ctx('game/ui/btn.gd', 'func f():\n\tmodulate = Color(1, 0.2, 0.2)\n'), /Color\(/);
  assert.match(ctx('game/ui/btn.gd', 'var c = Color("#ff0000")\n'), /tokens\.gd/);
  assert.match(ctx('game/ui/btn.gd', 'var c = Color8(255, 0, 0)\n'), /tokens\.gd/);
  assert.match(ctx('game/ui/btn.gd', 'var c = Color.html("#f00")\n'), /tokens\.gd/);
  assert.strictEqual(ctx('game/ui/tokens.gd', 'const RED = Color(1, 0, 0)\n'), undefined);
  assert.strictEqual(ctx('game/ui/btn.gd', 'var c = Color(Tokens.RED, 0.5)\nvar d = Color.WHITE\n# Color(1, 0, 0)\n'), undefined);
  assert.strictEqual(ctx('game/test/test_btn.gd', 'assert_eq(c, Color(1, 0, 0))\n'), undefined);
});

test('Godot: bez docs/DIZAJN-SISTEM.md nema upozorenja na boju', () => {
  const root = h.project({ marker: true });
  assert.strictEqual(post(root, 'Write', { file_path: path.join(root, 'game/a.gd'), content: 'var c = Color(1, 0, 0)\n' }), null);
});
