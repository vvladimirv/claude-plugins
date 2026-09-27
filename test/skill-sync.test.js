// „Brzi testovi" je ista uputa u više skillova iz tri plugina. Instaliran plugin ne vidi fajlove drugog
// plugina, pa svaki skill ima svoju kopiju, a ovaj test čuva da se kopije ne raziđu.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const SKILLS = [
  'project-guard/skills/codex-worktree/SKILL.md',
  'project-memory/skills/kraj-sesije/SKILL.md',
  'project-kickstart/skills/ui-izmjena/SKILL.md',
  'project-memory/skills/vrati/SKILL.md',
  'project-memory/skills/objavi/SKILL.md',
];

function read(file) {
  return fs.readFileSync(path.join(PLUGINS, file), 'utf8').replace(/\r\n/g, '\n');
}

function section(text, title) {
  const part = text.split(/^## /m).find((p) => p.startsWith(title + '\n'));
  return part ? part.slice(title.length).trim() : null;
}

test('brzi testovi: ista uputa u codex-worktree, kraj-sesije, ui-izmjena, vrati i objavi, i koristi se', () => {
  const texts = SKILLS.map(read);
  const first = section(texts[0], 'Brzi testovi');
  assert.ok(first, `${SKILLS[0]}: nema sekcije "## Brzi testovi"`);
  texts.forEach((t, i) => {
    assert.strictEqual(section(t, 'Brzi testovi'), first, `${SKILLS[i]}: "Brzi testovi" nije isto kao u ${SKILLS[0]}`);
    assert.match(t, /vidi \*\*Brzi testovi\*\*/, `${SKILLS[i]}: nijedan korak ne upućuje na "Brzi testovi"`);
  });
});
