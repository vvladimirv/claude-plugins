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
