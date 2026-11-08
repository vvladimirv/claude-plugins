// Čisti dijelovi skripte snimaka (bez preglednika): konfiguracija, tajne iz okruženja, plan i izvještaj.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const s = require('./snimci');

const base = () => ({
  adresa: 'http://127.0.0.1:5000',
  sirine: [1440, 1024],
  uloge: [
    { ime: 'knjigovođa', prijava: { putanja: '/prijava', polja: { '#u': 'k', '#p': '$DEMO_LOZINKA' }, dugme: 'button' } },
    { ime: 'revizor' },
  ],
  ekrani: [{ ime: 'Početna', putanja: '/' }, { ime: 'plate', putanja: '/plate', uloge: ['knjigovođa'] }],
});

test('snimci: ispravna konfiguracija nema grešaka, a neispravna nabraja sve', () => {
  assert.deepEqual(s.validate(base()), []);
  const bad = { adresa: 'localhost', sirine: [100], uloge: [{ ime: 'a' }, { ime: 'a', prijava: {} }], ekrani: [{ ime: 'x', putanja: '/', uloge: ['b'] }] };
  const errors = s.validate(bad).join('\n');
  for (const part of ['adresa', 'sirine', 'dvaput', 'putanja', 'polja', 'dugme', 'nepoznata uloga "b"']) assert.match(errors, new RegExp(part));
  assert.match(s.validate({ adresa: 'http://x' }).join('\n'), /ekrani/);
});

test('snimci: lozinka dolazi iz okruženja, a nedostajuća varijabla je greška, ne prazno polje', () => {
  assert.equal(s.resolveValue('$DEMO_LOZINKA', { DEMO_LOZINKA: 'tajna' }), 'tajna');
  assert.equal(s.resolveValue('${DEMO_LOZINKA}', { DEMO_LOZINKA: 'tajna' }), 'tajna');
  assert.equal(s.resolveValue('obican tekst', {}), 'obican tekst');
  assert.equal(s.resolveValue('cijena $5', {}), 'cijena $5');
  assert.throws(() => s.resolveValue('$NEMA', {}), /NEMA nije postavljena/);
});

test('snimci: plan poštuje uloge ekrana i filtere, imena fajlova su bez dijakritike', () => {
  const config = { ...base(), visina: 900 };
  const all = s.plan(config);
  assert.equal(all.length, 2 * 2 + 2 * 1); // knjigovođa vidi oba ekrana, revizor samo početnu
  assert.ok(all.every(i => !(i.role.ime === 'revizor' && i.screen.ime === 'plate')));
  assert.equal(all[0].file, path.join('knjigovodja', '1440', 'pocetna.png'));
  assert.equal(s.plan(config, { uloga: 'revizor', sirina: 1024 }).length, 1);
  assert.equal(s.plan(config, { ekran: 'nema' }).length, 0);
  assert.equal(s.slug('Đak / Šifre (čž)'), 'djak-sifre-cz');
});

test('snimci: loadConfig dopunjava podrazumijevane vrijednosti i javlja putanju fajla kod greške', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'izgled-'));
  const file = path.join(dir, 'izgled.json');
  fs.writeFileSync(file, JSON.stringify({ adresa: 'http://x', ekrani: [{ ime: 'a', putanja: '/' }] }));
  const c = s.loadConfig(file);
  assert.deepEqual(c.sirine, s.DEFAULT_WIDTHS);
  assert.deepEqual(c.uloge, [{ ime: 'gost' }]);
  fs.writeFileSync(file, '{"adresa": 1}');
  assert.throws(() => s.loadConfig(file), err => err.message.startsWith(file) && /adresa/.test(err.message));
  assert.throws(() => s.loadConfig(path.join(dir, 'nema.json')), /ne mogu pročitati/);
});

test('snimci: izvještaj rangira pristupačnost po ozbiljnosti i navodi neuspjele prijave', () => {
  const md = s.summarize([
    { uloga: 'k', sirina: 1440, ekran: 'a', snimak: 'k/1440/a.png', status: 200, prelom: true, siroki: ['table.grid'], konzola: [],
      axe: [{ id: 'color-contrast', impact: 'serious', help: 'Kontrast' }, { id: 'label', impact: 'critical', help: 'Polje bez naziva' }] },
    { uloga: 'k', sirina: 1024, ekran: 'b', snimak: 'k/1024/b.png', status: 200, prijavaPala: true, konzola: ['x'], axe: [] },
    { uloga: 'r', sirina: 1440, ekran: 'c', snimak: 'r/1440/c.png', greska: 'prijava nije uspjela: timeout', konzola: [] },
    { uloga: 'm', sirina: 1440, ekran: 'plate', snimak: 'm/1440/plate.png', status: 404, konzola: [] },
    { uloga: 'm', sirina: 1024, ekran: 'plate', snimak: 'm/1024/plate.png', status: 404, konzola: [] },
    { uloga: 'm', sirina: 1440, ekran: 'd', snimak: 'm/1440/d.png', status: 200, axeGreska: 'CSP blokirao skriptu', konzola: [] },
  ], { adresa: 'http://x', axe: true });
  assert.match(md, /## Ekrani zabranjeni ulozi[\s\S]*- m: plate \(404\)\n(?!- m: plate)/, 'zabrana jednom po ulozi i ekranu');
  assert.match(md, /\| m \| 1440 \| \[d\]\(m\/1440\/d\.png\) \| 200 \| — \| — \| — \| nije izmjereno \|/);
  assert.match(md, /## Pristupačnost nije izmjerena \(snimak postoji\)\n\n- m \/ 1440 \/ d: CSP blokirao skriptu/);
  assert.doesNotMatch(md.split('## Nije snimljeno')[1], /\/ d:/, 'greška axe-a nije greška snimanja');
  assert.match(md, /\| k \| 1440 \| \[a\]\(k\/1440\/a\.png\) \| 200 \| DA \| 1 \|/);
  assert.ok(md.indexOf('`label`') < md.indexOf('`color-contrast`'), 'critical ide prije serious');
  assert.match(md, /k \/ 1024 \/ b: stranica je preusmjerila na prijavu/);
  assert.match(md, /r \/ 1440 \/ c: prijava nije uspjela/);
  assert.match(s.summarize([], { axe: false }), /axe-core nije pronađen/);
});

test('snimci: argumenti komandne linije, nepoznat argument je greška', () => {
  assert.deepEqual(s.parseArgs(['--uloga', 'k', '--sirina', '1280', '--bez-axe']),
    { config: '.claude/izgled.json', izlaz: null, axe: false, uloga: 'k', sirina: 1280 });
  assert.throws(() => s.parseArgs(['--nesto']), /nepoznat argument/);
});

test('snimci: modul se nalazi i u globalnoj npm instalaciji, a bez nje je null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-global-'));
  fs.mkdirSync(path.join(dir, 'lazni-modul'));
  fs.writeFileSync(path.join(dir, 'lazni-modul', 'index.js'), 'module.exports = 1;');
  assert.equal(s.findModule('lazni-modul', dir, { globalRoot: dir }), path.join(dir, 'lazni-modul', 'index.js'));
  assert.equal(s.findModule('lazni-modul-nema', dir, { globalRoot: null }), null);
});
