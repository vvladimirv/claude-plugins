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

// „Preporuka modela" je u /grane i /kraj-sesije, a iste riječi prepoznaje hook (recommend u branches.js).
test('preporuka modela: ista u grane i kraj-sesije, i hook je slijedi', () => {
  const { recommend } = require('../plugins/project-guard/hooks/lib/branches');
  const files = ['project-guard/skills/grane/SKILL.md', 'project-memory/skills/kraj-sesije/SKILL.md'];
  const [first, second] = files.map((f) => section(read(f), 'Preporuka modela'));
  assert.ok(first, `${files[0]}: nema sekcije "## Preporuka modela"`);
  assert.strictEqual(second, first, `${files[1]}: "Preporuka modela" nije isto kao u ${files[0]}`);
  for (const [model, effort] of [['opus', 'high'], ['haiku', 'low']]) {
    const line = first.split('\n').find((l) => l.toLowerCase().includes(`**${model},`));
    const words = line.slice(line.lastIndexOf('**') + 2).replace(/\.$/, '').split(',').map((w) => w.trim());
    for (const w of words) assert.deepStrictEqual(recommend(w), { model, effort }, `"${w}" treba dati ${model}/${effort}`);
  }
});
