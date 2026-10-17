// `.claude/bez-kickstarta` = projekat ima svoj sistem dokumenata. Skillovi koji pretpostavljaju kickstart dokumente
// tada staju prije prvog koraka. Instaliran plugin ne vidi fajlove drugog plugina, pa svaki skill ima svoju kopiju
// upute, a ovaj test čuva da su kopije iste, da su na početku i da podsjetnik nabraja iste komande.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const LABEL = '**Prvo, projekat bez kickstarta:**';
// /stanje i /kraj-sesije prvo pitaju za STATUS.md: uslov na kraju rečenice haiku je u probi previdio.
const STATUS_FIRST = 'ako `STATUS.md` postoji, ovaj pasus preskoči i radi normalno. Ako ne postoji, a projekat';
const STOP = ['docs-audit', 'napredak', 'izdanje', 'objavi', 'nova-funkcija', 'ui-izmjena', 'adr'];
const STOP_WITHOUT_STATUS = ['stanje', 'kraj-sesije'];
const GUARDED = [...STOP, ...STOP_WITHOUT_STATUS];
// Rade i u projektu sa svojim sistemom dokumenata. /kickstart ima svoj korak u Fazi 0.
const KEEP = ['vrati', 'ideja', 'novi-projekat', 'pravila-pauza', 'preuzmi-lock', 'codex-worktree', 'pravilo-u-hook', 'pomoc', 'zdravlje'];

function skills() {
  const out = {};
  for (const plugin of fs.readdirSync(PLUGINS)) {
    const dir = path.join(PLUGINS, plugin, 'skills');
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      out[name] = fs.readFileSync(path.join(dir, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
    }
  }
  return out;
}

// Prvi pasus ispod H1 naslova.
function firstParagraph(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const m = body.match(/(?:^|\n)# .*\n\n([\s\S]*?)(?:\n\n|$)/);
  return m ? m[1] : null;
}

test('bez-kickstarta: pogođeni skillovi prvo provjere marker, istom uputom', () => {
  const all = skills();
  const guards = GUARDED.map((name) => {
    assert.ok(all[name], `nema skilla ${name}`);
    const p = firstParagraph(all[name]);
    assert.ok(p && p.startsWith(LABEL), `${name}: prvi pasus ispod naslova nije provjera markera`);
    assert.strictEqual(p.includes(STATUS_FIRST), STOP_WITHOUT_STATUS.includes(name), `${name}: uslov za STATUS.md`);
    return p.replace(STATUS_FIRST, 'ako projekat');
  });
  guards.forEach((g, i) => assert.strictEqual(g, guards[0], `${GUARDED[i]}: uputa nije ista kao u ${GUARDED[0]}`));
  assert.match(guards[0], /ništa ne pravi .*`STATUS\.md`.*`CHANGELOG\.md`.*`docs\/\*`.*`\.claude\/kickstart\.json`/);
  assert.match(guards[0], /`AGENTS\.md`\/`CLAUDE\.md` projekta/);
});

test('bez-kickstarta: /kickstart staje u folderu s markerom, ostali skillovi rade kao i prije', () => {
  const all = skills();
  const faza0 = all.kickstart.split(/^## /m).find((s) => s.startsWith('Faza 0'));
  assert.match(faza0, /Folderi sa `\.claude\/bez-kickstarta` nisu kandidati/);
  assert.match(faza0, /ciljni folder ima `\.claude\/bez-kickstarta`.*ništa ne pravi i stani/);
  for (const name of KEEP) {
    assert.ok(all[name], `nema skilla ${name}`);
    assert.doesNotMatch(all[name], /bez-kickstarta/, `${name} mora raditi i u projektu bez kickstarta`);
  }
  const known = new Set([...GUARDED, ...KEEP, 'kickstart']);
  assert.deepStrictEqual(Object.keys(all).filter((n) => !known.has(n)), [],
    'nov skill: svrstaj ga u STOP, STOP_WITHOUT_STATUS ili KEEP (treba li mu provjera markera?)');
});

test('bez-kickstarta: podsjetnik nabraja iste komande', () => {
  const md = fs.readFileSync(path.join(PLUGINS, 'project-kickstart/skills/pomoc/PODSJETNIK.md'), 'utf8');
  const row = md.split(/\r?\n/).find((l) => l.startsWith('| `.claude/bez-kickstarta` |'));
  assert.ok(row, 'PODSJETNIK nema red za .claude/bez-kickstarta');
  const cmds = [...row.matchAll(/`\/([\w-]+)`/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(cmds, [...GUARDED, 'kickstart'].sort());
  assert.match(row, /`\/stanje` i `\/kraj-sesije` rade samo ako `STATUS\.md` postoji/);
});
