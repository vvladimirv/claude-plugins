// /pomocna pravi karticu pomoćne sesije. Test čuva dogovor s korisnikom: kartica (klik korisnika), prompt koji stoji
// sam i kaže `/kraj-sesije auto` sa baznom granom, STATUS.md ostaje glavnoj, a glavna se ne arhivira.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL = path.join(__dirname, '..', 'plugins', 'project-memory', 'skills', 'pomocna', 'SKILL.md');
const text = fs.existsSync(SKILL) ? fs.readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n') : '';
const fm = (text.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';

test('pomocna: skill postoji, ima model i alat za karticu', () => {
  assert.ok(text, 'nema plugins/project-memory/skills/pomocna/SKILL.md');
  assert.match(fm, /^name: pomocna$/m);
  assert.match(fm, /^model: \w+/m);
  for (const t of ['ToolSearch', 'mcp__ccd_session__spawn_task']) assert.ok(fm.includes(t), `allowed-tools nema ${t}`);
});

test('pomocna: prompt kartice nosi pravila pomoćne sesije', () => {
  const block = text.match(/```text\n([\s\S]*?)```/);
  assert.ok(block, 'nema bloka ```text sa promptom kartice');
  const p = block[1];
  assert.match(p, /Ti si pomoćna sesija/);
  assert.match(p, /STATUS\.md ne diraj/);
  assert.match(p, /\/kraj-sesije auto <bazna>/);
  assert.match(p, /odluku korisnika[^\n]*ne zatvaraj se/);
});

test('pomocna: bazna grana je grana glavne sesije, ne uvijek main', () => {
  assert.match(text, /git branch --show-current/);
  assert.match(text, /git ls-remote --exit-code --heads origin/);
});

test('pomocna: provjere prije kartice i glavna ostaje otvorena', () => {
  assert.match(text, /gh auth status/);
  assert.match(text, /git remote get-url origin/);
  assert.match(text, /Glavna sesija se ne arhivira/);
  assert.doesNotMatch(fm, /archive_session/, 'glavna nema alat za arhiviranje u /pomocna');
  assert.match(text, /git pull --ff-only/);
});
