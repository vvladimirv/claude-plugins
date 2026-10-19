// /kraj-sesije na kraju nudi novu sesiju sa prvom stavkom iz „Sljedeće". Test čuva pravila koja se ne smiju
// izgubiti pri izmjeni teksta: korak tek poslije uspjelog rada, kartica prije arhiviranja, rezerva bez alata.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL = path.join(__dirname, '..', 'plugins', 'project-memory', 'skills', 'kraj-sesije', 'SKILL.md');
const text = fs.readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n');

function step(n) {
  const m = text.match(new RegExp(`\\n${n}\\. \\*\\*[\\s\\S]*?(?=\\n\\d+\\. \\*\\*|\\n## |$)`));
  assert.ok(m, `kraj-sesije: nema koraka ${n}`);
  return m[0];
}

test('kraj-sesije: nova sesija je korak poslije završne poruke i prije zatvaranja', () => {
  assert.match(step(7), /Završna poruka/);
  assert.match(step(8), /Nova sesija sa sljedećim zadatkom/);
  assert.match(step(9), /Zatvaranje sesije/);
});

test('kraj-sesije: nova sesija samo kad su testovi, commit i push uspjeli', () => {
  const s = step(8);
  assert.match(s, /samo ako je sve prije uspjelo/);
  assert.match(s, /testovi/);
  assert.match(s, /push/);
  assert.match(s, /idi na korak 9/);
});

test('kraj-sesije: pitanje i opcije su kako je dogovoreno', () => {
  const s = step(8);
  assert.ok(s.includes('Zatvaram ovu sesiju i pripremam novu sa zadatkom: <stavka>?'));
  assert.ok(s.includes('"Da, nova sesija" (preporučeno, prva)'));
  assert.ok(s.includes('"Ne, samo završi"'));
});

test('kraj-sesije: kartica nove sesije ide prije arhiviranja', () => {
  const s = step(8);
  const spawn = s.indexOf('pozovi ga');
  const archive = s.indexOf('arhiviraj ovu sesiju');
  assert.ok(spawn > 0 && archive > 0, 'nedostaje poziv spawn_task ili arhiviranje');
  assert.ok(spawn < archive, 'arhiviranje mora doći tek poslije kartice');
  assert.match(s, /Tek kad je kartica napravljena/);
  assert.match(s, /Pročitaj STATUS\.md i nastavi: <cijela stavka>/);
});

test('kraj-sesije: bez alata se ispiše prompt i ništa se ne arhivira', () => {
  const s = step(8);
  assert.match(s, /ne postoji[^\n]*ne arhiviraj/);
  assert.match(s, /Ispiši gotov prompt u bloku koda/);
});

test('kraj-sesije: alati za novu sesiju su u allowed-tools', () => {
  const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
  for (const t of ['AskUserQuestion', 'ToolSearch', 'mcp__ccd_session__spawn_task', 'mcp__ccd_session_mgmt__archive_session']) {
    assert.ok(fm.includes(t), `allowed-tools nema ${t}`);
  }
});

// Režim auto: pomoćna sesija sama spoji svoj rad u baznu granu i zatvori se, ali samo kad sve uspije.
function autoSection() {
  const m = text.match(/\n## Režim auto \(pomoćna sesija\)\n([\s\S]*?)(?=\n## |$)/);
  assert.ok(m, 'kraj-sesije: nema sekcije "## Režim auto (pomoćna sesija)"');
  return m[1];
}

test('kraj-sesije auto: redoslijed rebase, push, PR, spajanje, notifikacija, brava, arhiviranje', () => {
  const s = autoSection();
  const order = ['git rebase origin/<bazna>', 'git push -u origin HEAD', 'gh pr create --base <bazna>', 'gh pr merge',
    'PushNotification', 'oslobodi bravu', 'archive_session'];
  let last = -1;
  for (const token of order) {
    const i = s.indexOf(token, last + 1);
    assert.ok(i > last, `"${token}" nije poslije prethodnog koraka`);
    last = i;
  }
  assert.match(s, /gh pr merge[^\n]*--squash/);
});

// Brisanje grane prije provjere zatvara PR bez spajanja (pukao merge zbog mreže, pa delete zatvorio PR).
test('kraj-sesije auto: grana se briše tek kad je PR MERGED', () => {
  const s = autoSection();
  const merged = s.indexOf('MERGED');
  const del = s.indexOf('git push origin --delete');
  assert.ok(merged > -1 && del > merged, 'brisanje grane mora biti poslije provjere MERGED');
  assert.doesNotMatch(s, /`gh pr merge[^`]*--delete-branch/);
});

// Poslije squash spajanja worktree drži commit kog nema na GitHubu, pa ga aplikacija pri arhiviranju zadrži kao nesnimljen rad.
test('kraj-sesije auto: prije arhiviranja worktree ide na baznu granu bez svoje grane', () => {
  const s = autoSection();
  const det = s.indexOf('git switch --detach origin/<bazna>');
  const del = s.indexOf('git branch -D <grana>');
  const arch = s.lastIndexOf('archive_session');
  assert.ok(det > s.indexOf('MERGED') && del > det && arch > del, 'detach i brisanje grane idu poslije MERGED, a prije arhiviranja');
});

test('kraj-sesije auto: uz neuspjeh nema spajanja ni arhiviranja, nego „Čeka tebe"', () => {
  const s = autoSection();
  const fail = s.match(/\n\d\. \*\*Ne ide\*\*[^\n]*/);
  assert.ok(fail, 'nema stavke **Ne ide**');
  assert.match(fail[0], /ne spajaj/);
  assert.match(fail[0], /ne arhiviraj/);
  assert.match(fail[0], /Čeka tebe/);
  assert.match(fail[0], /konflikt/);
});

test('kraj-sesije auto: STATUS.md ne dira, brava istom naredbom, bez pitanja štafete', () => {
  const s = autoSection();
  assert.match(s, /STATUS\.md[^\n]*samo glavna/);
  assert.match(s, /naredbom iz koraka 9/);
  assert.doesNotMatch(s, /node -e/, 'naredba za bravu postoji samo jednom (test/lock-release čita prvu)');
  assert.match(s, /[Kk]oraci 6, 8 i 9/);
});

test('kraj-sesije auto: argument i alati', () => {
  const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
  assert.match(fm, /argument-hint: .*auto/);
  assert.ok(fm.includes('PushNotification'), 'allowed-tools nema PushNotification');
});

test('kraj-sesije: prije svakog arhiviranja se oslobodi brava (arhiviranje je ne oslobađa uvijek)', () => {
  for (const s of [step(8), step(9)]) {
    const release = s.indexOf('oslobodi bravu');
    const archive = s.indexOf('arhiviraj ovu sesiju');
    assert.ok(release > 0 && release < archive, 'brava se oslobađa prije arhiviranja');
  }
});
