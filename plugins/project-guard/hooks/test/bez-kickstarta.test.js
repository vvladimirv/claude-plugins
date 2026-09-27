// `.claude/bez-kickstarta`: projekat ima svoj sistem dokumenata. Čuvar obima i zamrzavanje tu ne rade,
// podsjetnici ne upućuju na skillove koji tu staju, a tajne, limit fajla i brava rade kao i svugdje.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../guard');
const { LOCK } = require('../lib/lock');

const MARKER = { '.claude/bez-kickstarta': '' };
const VIZIJA = '# Vizija\n\n## Obim\n- unos troškova\n\n## Van obima\n- investicije\n';
const ODRZAVANJE = JSON.stringify({ status: 'gotovo', faza: 'odrzavanje', izdanja: [{ verzija: 'v1.0', datum: '2026-09-24' }] });

const prompt = (root, text) => run({ hook_event_name: 'UserPromptSubmit', cwd: root, session_id: 'A', prompt: text });
const start = (root) => run({ hook_event_name: 'SessionStart', cwd: root, session_id: 'A' });
const post = (root, tool, toolInput) => run({ hook_event_name: 'PostToolUse', cwd: root, session_id: 'A', tool_name: tool, tool_input: toolInput });
const ctx = (out) => (out ? out.hookSpecificOutput.additionalContext : '');
const write = (root, rel, content = 'x', sid = 'A') => h.decision(run(h.pre(root, 'Write', { file_path: path.join(root, rel), content }, sid)));

test('bez-kickstarta: nema čuvara obima ni zamrzavanja, ni kad kickstart.json kaže održavanje', () => {
  const files = {
    'docs/VIZIJA.md': VIZIJA,
    '.claude/kickstart.json': ODRZAVANJE,
    'docs/ARHITEKTURA.md': 'src/features/unos',
    'docs/INVENTAR-FUNKCIJA.md': '| F-01 | unos |',
  };
  const kickstart = h.project({ files });
  assert.match(ctx(prompt(kickstart, 'dodaj izvoz u PDF')), /zamrznut/);
  assert.match(ctx(start(kickstart)), /održavanje/);
  assert.strictEqual(write(kickstart, 'youtube/dl.py'), 'ask');

  const own = h.project({ files: { ...files, ...MARKER } });
  assert.strictEqual(prompt(own, 'dodaj izvoz u PDF'), null);
  assert.doesNotMatch(ctx(start(own)), /obim/i);
  assert.strictEqual(write(own, 'youtube/dl.py'), undefined);
  assert.strictEqual(write(own, 'src/features/youtube/dl.js'), undefined);
});

test('bez-kickstarta: podsjetnik na commit upućuje na /kraj-sesije samo kad postoji STATUS.md', () => {
  const own = h.project({ commit: true, files: MARKER });
  const withStatus = h.project({ commit: true, files: { ...MARKER, 'STATUS.md': '# STATUS\n' } });
  for (const root of [own, withStatus]) for (let i = 0; i < 11; i++) h.write(root, `src/f${i}.js`);
  const stop = (root) => run({ hook_event_name: 'Stop', cwd: root, session_id: 'S1' }).systemMessage;

  const msg = stop(own);
  assert.match(msg, /11 fajlova.*commit po pravilima projekta \(AGENTS\.md\/CLAUDE\.md\)/);
  assert.doesNotMatch(msg, /kraj-sesije/);
  assert.match(stop(withStatus), /`\/kraj-sesije`/);
});

test('bez-kickstarta: nova zavisnost traži zapis odluke po pravilima projekta, ne /adr', () => {
  const root = h.project({
    commit: true,
    files: { ...MARKER, 'package.json': JSON.stringify({ dependencies: { react: '^19' } }), 'docs/adr/0001-stack.md': '# 0001\nReact.' },
  });
  const file = path.join(root, 'package.json');
  fs.writeFileSync(file, JSON.stringify({ dependencies: { react: '^19', lodash: '^4' } }));
  const out = ctx(post(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'y' }));
  assert.match(out, /lodash.*zapiši odluku po pravilima projekta/);
  assert.doesNotMatch(out, /`\/adr`/);
});

test('bez-kickstarta: tajne, limit fajla (i granice.json) i brava rade i dalje', () => {
  const root = h.project({ git: true, files: { ...MARKER, '.claude/granice.json': '{"iskljuci": ["legacy/**"]}' } });
  assert.strictEqual(write(root, '.env', 'A=1'), 'deny');
  assert.strictEqual(write(root, 'src/big.js', h.lines(600)), 'deny');
  assert.strictEqual(write(root, 'legacy/big.js', h.lines(600)), undefined);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, LOCK), 'utf8')).session_id, 'A');
  assert.strictEqual(write(root, 'src/a.js', 'y', 'B'), 'deny');
});
