const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReport, compare, render } = require('./uporedi');

const STARI = `Bot, 100 sedmica po politici, pobjeda = sačuvano >= 80 %

Lopov SA sjećanja (111.1 s)
  isti          pobjede   7.0 %   prosječno sačuvano  56.9 %   (100 sedmica)
  nasumicno     pobjede  55.0 %   prosječno sačuvano  79.9 %   (100 sedmica)

Lopov BEZ sjećanja (88.3 s)
  isti          pobjede  26.0 %   prosječno sačuvano  63.0 %   (100 sedmica)
`;
const NOVI = STARI.replace('nasumicno     pobjede  55.0 %', 'nasumicno     pobjede  40.0 %').replace('isti          pobjede   7.0 %', 'isti          pobjede   9.0 %');

test('uporedi: čita red po politici i odjeljak sa i bez sjećanja', () => {
  const m = parseReport(STARI);
  const sa = [...m.values()].find(v => v.label === 'isti' && v.name === 'pobjede' && v.section.startsWith('Lopov SA'));
  const bez = [...m.values()].find(v => v.label === 'isti' && v.name === 'pobjede' && v.section.startsWith('Lopov BEZ'));
  assert.equal(sa.value, 7);
  assert.equal(bez.value, 26);
  assert.ok([...m.values()].some(v => v.name === 'prosječno sačuvano' && v.value === 79.9));
});

test('uporedi: javlja samo razlike preko praga, sa predznakom', () => {
  const r = compare(STARI, NOVI);
  assert.equal(r.changed.length, 1, 'isti +2 p.p. je ispod praga 5, nasumično -15 je preko');
  assert.equal(r.changed[0].label, 'nasumicno');
  assert.equal(r.changed[0].delta, -15);
  assert.match(render(r), /\| -15 p\.p\. \|/);
  assert.equal(compare(STARI, NOVI, { prag: 1 }).changed.length, 2);
});

test('uporedi: format poglavlja (4 | politika | pobjede ... | cilj) i mjere bez procenta', () => {
  const a = ' 4 | nasumicno        | pobjede  40.0 % | sačuvano  87.7 % | najgori  83.9 % | cilj 90.0 %\n 1 | nasumicno       cilj 85.0 % | zvjezdice 0.50 | bonus  25 %\n';
  const b = ' 4 | nasumicno        | pobjede  62.5 % | sačuvano  87.7 % | najgori  83.9 % | cilj 90.0 %\n 1 | nasumicno       cilj 85.0 % | zvjezdice 1.50 | bonus  25 %\n';
  const r = compare(a, b);
  const byName = Object.fromEntries(r.changed.map(x => [`${x.label}/${x.name}`, x.delta]));
  assert.equal(byName['4 nasumicno/pobjede'], 22.5);
  assert.equal(byName['1 nasumicno/zvjezdice'], 1);
  assert.equal(r.unchanged, 5);
});

test('uporedi: različiti formati ne daju lažnu razliku nego poruku', () => {
  const r = compare(STARI, 'nešto sasvim drugo\n');
  assert.equal(r.compared, 0);
  assert.match(render(r), /Nema zajedničkih redova/);
});

const VI = (p2, s) => `== Poglavlje 2 (cilj ${s} %) ==
vrsta      | prošlo | 1. pokušaj | pokušaja | iznad cilja (pobjede) | ★ (pobjede)
Početnik   |  ${p2} % |  25 %      |      2.8 | +6.4 poena                      | 1.3
Iskusan    |  88 % |  63 %      |      1.8 | +5.2 poena                      | 2.3
krađe po noći (prosječan + iskusan): 56% 48% 63%

== Zvjezdice kroz kampanju (zbir poslije poglavlja) ==
vrsta      |    2    3    4 | 3★ do pogl. (median)
Početnik   |  0.6  0.8  2.1 | 6 (7/8)
Iskusan    |  2.0  3.9  5.1 | — (0/8)

== Zanati kampanje ==
Početnik   | ruta 33 (2.6 %) · krađa 67 % | meso 0 (0.0 %) · krađa 0 %
`;

test('uporedi: tabela sa zaglavljem (virtuelni-igraci.mjs), cilj u zagradi ne mijenja ključ', () => {
  const m = [...parseReport(VI(50, 84)).values()];
  const p = m.find(v => v.section === 'Poglavlje 2' && v.label === 'Početnik' && v.name === 'prošlo');
  assert.deepEqual([p.value, p.pct], [50, true]);
  assert.ok(m.some(v => v.label === 'Iskusan' && v.name === 'pokušaja' && v.value === 1.8 && !v.pct));
  assert.ok(m.some(v => v.label === 'Početnik' && v.name === 'iznad cilja' && v.value === 6.4 && v.pct));
  assert.ok(m.some(v => v.section.startsWith('Zvjezdice') && v.label === 'Iskusan' && v.name === '4' && v.value === 5.1), 'više brojeva u ćeliji po riječima zaglavlja');
  assert.ok(m.some(v => v.section === 'Zanati kampanje' && v.name === 'krađa' && v.value === 67), 'red sa mjerama nije zaglavlje');
  const r = compare(VI(50, 84), VI(75, 87));
  assert.equal(r.changed.length, 1);
  assert.deepEqual([r.changed[0].section, r.changed[0].label, r.changed[0].name, r.changed[0].delta], ['Poglavlje 2', 'Početnik', 'prošlo', 25]);
});

test('uporedi: ćelija „staro→novo“ daje novu vrijednost', () => {
  const t = (x) => `== Prošlo v21 → v22 ==\nvrsta        | P 2 | P 3\nPočetnik     | 50 %→${x} % | 13 %→13 %\n`;
  const v = [...parseReport(t(63)).values()].find(x => x.name === 'P 2');
  assert.equal(v.value, 63);
  assert.equal(compare(t(50), t(63)).changed[0].delta, 13);
});
