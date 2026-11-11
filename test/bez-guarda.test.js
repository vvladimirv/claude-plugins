// project-memory nema `dependencies` na project-guard: sa tvrdom zavisnošću Claude Code gasi cijeli memory čim je
// guard isključen. Zato memory mora raditi i bez guarda, samo sa manje mogućnosti. Ovaj test čuva da memory skill
// komandu iz guarda pominje samo uslovno (u istom redu „ako postoji“ ili „project-guard“), da memory hookovi ne
// učitavaju fajlove guarda i da manifest ne dobije `dependencies` bez odluke.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const MEMORY = path.join(PLUGINS, 'project-memory');
const GUARD_COMMANDS = fs.readdirSync(path.join(PLUGINS, 'project-guard', 'skills'));

function files(dir, ext) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

test('bez-guarda: memory skillovi komande iz guarda pominju samo uslovno', () => {
  const re = new RegExp(`/(${GUARD_COMMANDS.join('|')})(?![\\w-])`);
  const bad = [];
  for (const f of files(path.join(MEMORY, 'skills'), '.md')) {
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (re.test(line) && !/ako postoji|project-guard/i.test(line)) {
        bad.push(`${path.relative(MEMORY, f)}:${i + 1}: ${line.match(re)[0]}`);
      }
    });
  }
  assert.deepStrictEqual(bad, [], 'dodaj „ako postoji“ ili „(iz project-guard)“ u isti red');
});

test('bez-guarda: memory hookovi ne učitavaju fajlove guarda', () => {
  for (const f of files(path.join(MEMORY, 'hooks'), '.js')) {
    if (f.endsWith('.test.js')) continue;
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /require\([^)]*project-guard/, path.relative(MEMORY, f));
  }
});

test('bez-guarda: memory manifesti nemaju dependencies', () => {
  for (const m of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'plugin.json']) {
    const json = JSON.parse(fs.readFileSync(path.join(MEMORY, m), 'utf8'));
    assert.strictEqual(json.dependencies, undefined, `${m}: tvrda zavisnost gasi memory kad je guard isključen`);
  }
});
