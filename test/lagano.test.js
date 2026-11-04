// Lagani projekat (/kickstart --lagano) ima samo VIZIJA, STATUS, AGENTS i CLAUDE. Hookovi koji čitaju ostale
// dokumente moraju tada šutjeti bez greške, a čuvar obima i kapija i dalje raditi.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lagano-'));
const home = path.join(tmp, 'home');
const root = path.join(tmp, 'dev', 'mala-app');
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(home, 'kickstart-korijeni.txt'), path.join(tmp, 'dev') + '\n');
fs.writeFileSync(path.join(root, '.claude', 'kickstart.json'), JSON.stringify({ status: 'gotovo', rezim: 'lagano', faza: 'razvoj', izdanja: [] }));
fs.writeFileSync(path.join(root, 'docs', 'VIZIJA.md'), '# Vizija\n\n## Obim\n- unos troška\n- mjesečni pregled\n\n## Van obima\n- više korisnika\n');
fs.writeFileSync(path.join(root, 'STATUS.md'), '# STATUS\n');
fs.writeFileSync(path.join(root, 'package.json'), '{"dependencies":{"lit":"3"}}');
process.env.CC_GUARD_HOME = home;
process.env.CLAUDE_PLUGIN_DATA = path.join(tmp, 'data');

const scope = require('../plugins/project-guard/hooks/lib/scope');
const deps = require('../plugins/project-guard/hooks/lib/deps');
const gate = require('../plugins/project-guard/hooks/lib/gate');
const progress = require('../plugins/project-memory/hooks/lib/progress');

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('lagano: kapija pušta rad, čuvar obima čita VIZIJA', () => {
  assert.strictEqual(gate.mode(root), null);
  assert.deepStrictEqual(scope.readScope(root).obim, ['unos troška', 'mjesečni pregled']);
  assert.match(scope.sessionMessage(root), /Obim: unos troška; mjesečni pregled/);
});

test('lagano: bez ARHITEKTURA i INVENTAR nema upozorenja za nov folder ili funkciju', () => {
  for (const f of ['tools/x.js', 'src/features/novo/a.js']) {
    assert.strictEqual(scope.newFolderCheck({ tool_name: 'Write', tool_input: { file_path: path.join(root, f) } }, root), null, f);
  }
});

test('lagano: bez docs/adr nema podsjetnika za zavisnost', () => {
  const input = { tool_name: 'Write', session_id: 's1', tool_input: { file_path: path.join(root, 'package.json') } };
  assert.strictEqual(deps.postCheck(input, root), null);
});

test('lagano: bez BLUEPRINT i INVENTAR nema linije napretka', () => {
  assert.strictEqual(progress.load(root), null);
  assert.strictEqual(progress.sessionText(root, '2026-11-04'), null);
});

const SKILLS = path.join(__dirname, '..', 'plugins');
const read = (f) => fs.readFileSync(path.join(SKILLS, f), 'utf8').replace(/\r\n/g, '\n');
const LAGANO = '**Lagani projekat** (`.claude/kickstart.json` ima `"rezim": "lagano"`):';

test('lagano: /napredak stane, a /izdanje, /nova-funkcija, /ui-izmjena i /adr rade smanjeno', () => {
  const expect = {
    'project-memory/skills/napredak/SKILL.md': /Zatim stani/,
    'project-memory/skills/izdanje/SKILL.md': /radi smanjeno/,
    'project-kickstart/skills/nova-funkcija/SKILL.md': /radi smanjeno/,
    'project-kickstart/skills/ui-izmjena/SKILL.md': /ne staje/,
    'project-kickstart/skills/adr/SKILL.md': /radi isto/,
  };
  for (const [f, re] of Object.entries(expect)) {
    const line = read(f).split('\n').find((l) => l.startsWith(LAGANO));
    assert.ok(line, `${f}: nema pasusa za lagani projekat`);
    assert.match(line, re, f);
  }
});

test('lagano: /kickstart pita za režim, piše rezim u kickstart.json i nudi prelazak na puni', () => {
  const s = read('project-kickstart/skills/kickstart/SKILL.md');
  assert.match(s, /argument-hint: .*--lagano/);
  assert.match(s, /Lagani ili puni start\?/);
  assert.match(s, /"rezim": "puno"/);
  assert.match(s, /"rezim": "lagano"/);
  assert.match(s, /\n## Režim lagano\n/);
  assert.match(s, /\n### Prelazak na puni\n/);
  assert.match(s, /Samo nove verzije šablona ili prelazak na puni\?/);
  const lagano = s.split('\n## Režim lagano\n')[1];
  for (const f of ['VIZIJA.md', 'STATUS.md', 'AGENTS.md', 'CLAUDE.md', '.githooks/']) assert.ok(lagano.includes(f), `lagano nema ${f}`);
});
