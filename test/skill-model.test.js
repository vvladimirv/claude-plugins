// Pravilo iz CLAUDE.md: svaki skill ima `model:` (haiku za rutinu, sonnet za commit i pregled).
// Bez `model:` (glavni model) su samo skillovi koji donose odluku; oni su nabrojani ovdje.
// Svaki agent ima svoj `model:` (opus za arhitekturu, sonnet za pregled).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const ODLUKE = new Set(['arhitekta', 'kickstart', 'isplativost']);
const MODELI = new Set(['haiku', 'sonnet', 'opus']);

function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

const model = (fm) => (fm.match(/^model:\s*(\S+)/m) || [])[1];

test('skillovi: model po pravilu iz CLAUDE.md', () => {
  for (const plugin of fs.readdirSync(PLUGINS)) {
    const dir = path.join(PLUGINS, plugin, 'skills');
    if (!fs.existsSync(dir)) continue;
    for (const skill of fs.readdirSync(dir)) {
      const file = path.join(dir, skill, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      const m = model(frontmatter(file));
      if (ODLUKE.has(skill)) assert.strictEqual(m, undefined, `${plugin}/${skill}: skill za odluku radi na glavnom modelu, bez model:`);
      else assert.ok(m === 'haiku' || m === 'sonnet', `${plugin}/${skill}: treba model: haiku ili sonnet (ili ga dodaj u ODLUKE i CLAUDE.md)`);
    }
  }
});

test('agenti: svaki ima model', () => {
  for (const plugin of fs.readdirSync(PLUGINS)) {
    const dir = path.join(PLUGINS, plugin, 'agents');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      assert.ok(MODELI.has(model(frontmatter(path.join(dir, f)))), `${plugin}/agents/${f}: nema model:`);
    }
  }
});
