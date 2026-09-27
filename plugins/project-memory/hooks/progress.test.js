const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseBlueprint, parseInventory, summarize, line, sessionText } = require('./lib/progress');
const { render } = require('./lib/progress-html');
const { text } = require('./progress-cli');

const BP = `# Blueprint

## Tempo
Početak: 2026-09-01 · 6 sati sedmično

## Milestones
| # | Cilj | Funkcije | Gotovo kad | Rok | Status |
|---|---|---|---|---|---|
| M1 | Kostur | — | radi | 2026-09-05 | gotovo 2026-09-04 |
| M2 | Unos | F-01, F-02 | e2e | 2026-09-12 | gotovo 2026-09-14 |
| M3 | Pregled | F-03 | x | 2026-09-19 → 2026-09-22 | u toku |
| M4 | Izvoz | F-04, F-05 | y | 2026-09-30 | planirano |
`;
const INV = `| ID | Funkcija | Folder | Status |
|---|---|---|---|
| F-01 | a | x | radi |
| F-02 | b | x | radi |
| F-03 | c | x | u izradi |
| F-04 | d | x | planirano |
| F-05 | e | x | odloženo (v2) |
| F-06 | f | x | uklonjena |
`;

test('parse: rokovi (i pomjeren rok), statusi, funkcije', () => {
  const m = parseBlueprint(BP);
  assert.strictEqual(m.length, 4);
  assert.deepStrictEqual(m[2], { id: 'M3', features: ['F-03'], rok: '2026-09-22', rokPrvi: '2026-09-19', status: 'u toku', done: null });
  assert.strictEqual(m[1].done, '2026-09-14');
  assert.deepStrictEqual(parseInventory(INV).map((f) => f.status), ['radi', 'radi', 'u izradi', 'planirano', 'odlozeno', 'uklonjena']);
});

test('summarize: odloženo i uklonjeno se ne broje, kašnjenje i prognoza', () => {
  const s = summarize({ milestones: parseBlueprint(BP), features: parseInventory(INV), start: '2026-09-01', today: '2026-09-25' });
  assert.strictEqual(s.ukupnoF, 4);
  assert.strictEqual(s.radiF, 2);
  assert.strictEqual(s.procenat, 50);
  assert.strictEqual(s.current.id, 'M3');
  assert.deepStrictEqual(s.late, [{ id: 'M3', dana: 3 }]);
  assert.strictEqual(s.prognoza, '2026-09-27'); // (1.9. → 4.9. → 14.9.) prosjek 6,5 dana × 2 preostala od 14.9.
  assert.strictEqual(s.plan, '2026-09-30');
  assert.strictEqual(s.mvpGotov, false);
  assert.match(line(s), /M3 od 4 \(u toku\) · funkcije 2\/4 radi \(50%\) · M3 kasni 3 dana · prognoza MVP 2026-09-27 \(plan 2026-09-30\)/);
});

test('stari blueprint bez Rok/Status: status iz funkcija, MVP gotov', () => {
  const bp = '| # | Cilj | Funkcije | Gotovo kad |\n|---|---|---|---|\n| M1 | K | — | x |\n| M2 | U | F-01 | y |\n';
  const inv = '| ID | Funkcija | Status |\n|---|---|---|\n| F-01 | a | radi |\n';
  const s = summarize({ milestones: parseBlueprint(bp), features: parseInventory(inv), today: '2026-09-25' });
  assert.ok(s.mvpGotov);
  assert.strictEqual(s.imaRokove, false);
  assert.match(line(s), /MVP gotov/);
});

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'napredak-'));
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}

test('sessionText: kašnjenje traži odluku, MVP gotov traži izdanje, održavanje je kratko', () => {
  const late = sessionText(project({ 'docs/BLUEPRINT.md': BP, 'docs/INVENTAR-FUNKCIJA.md': INV }), '2026-09-25');
  assert.match(late, /M3 kasni\. Jednom, na početku, ponudi/);
  assert.doesNotMatch(late, /nadogradi/);

  const doneBp = BP.replace('| u toku |', '| gotovo 2026-09-21 |').replace('| planirano |', '| gotovo 2026-09-24 |');
  const doneInv = INV.replace('u izradi', 'radi').replace('| planirano |', '| radi |');
  const root = project({ 'docs/BLUEPRINT.md': doneBp, 'docs/INVENTAR-FUNKCIJA.md': doneInv });
  assert.match(sessionText(root, '2026-09-25'), /\/izdanje/);

  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'kickstart.json'), JSON.stringify({ faza: 'odrzavanje', izdanja: [{ verzija: 'v1.0', datum: '2026-09-25' }] }));
  assert.strictEqual(sessionText(root, '2026-09-26'), '## Napredak\nv1.0 izdat (2026-09-25) · održavanje.');

  assert.strictEqual(sessionText(project({ 'README.md': 'x' }), '2026-09-25'), null);
});

test('bez-kickstarta: nema linije napretka na startu sesije, a /napredak kaže zašto', () => {
  const root = project({ 'docs/BLUEPRINT.md': BP, 'docs/INVENTAR-FUNKCIJA.md': INV });
  const cli = () => execFileSync('node', [path.join(__dirname, 'progress-cli.js'), '--root', root], { encoding: 'utf8' });
  assert.match(sessionText(root, '2026-09-25'), /Napredak/);
  assert.match(cli(), /Milestone/);

  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'bez-kickstarta'), '');
  assert.strictEqual(sessionText(root, '2026-09-25'), null);
  const out = cli();
  assert.match(out, /svoj sistem dokumenata/);
  assert.doesNotMatch(out, /Milestone|`\/izdanje|`\/kickstart/);
});

test('tekst i HTML: brojke su tu, HTML nema vanjskih resursa', () => {
  const s = summarize({ milestones: parseBlueprint(BP), features: parseInventory(INV), start: '2026-09-01', today: '2026-09-25' });
  const t = text(s);
  assert.match(t, /M3 +⚠️ kasni 3 d/);
  assert.match(t, /2026-09-19→2026-09-22/);
  const html = render({ ...s, today: '2026-09-25', faza: 'razvoj' }, 'budzet<test>');
  assert.match(html, /50%/);
  assert.match(html, /budzet&lt;test&gt;/);
  assert.match(html, /prefers-color-scheme:dark/);
  assert.doesNotMatch(html, /<script|https?:\/\//);
});
