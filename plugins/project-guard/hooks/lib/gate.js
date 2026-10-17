// Kapija kickstarta: u novom projektu nema pisanja koda dok /kickstart ne postavi temelj.
// Postojeći projekti (sa commitovima) dobijaju samo prijedlog, bez blokade.

const fs = require('fs');
const path = require('path');
const { isUnder, norm, relToRoot, kickstartRoots, noKickstart } = require('./common');
const { toolTarget } = require('./secrets');

const ALLOWED = [
  /^docs\//, /^\.claude\//, /^(CLAUDE|AGENTS|STATUS|README|IDEJA)\.md$/i,
  /^\.git(ignore|attributes)$/, /^fixtures\/README\.md$/i, /^scripts\/test(\.[\w]+)?$/,
  /(^|\/)\.gitkeep$/, /^\.env\.example$/,
];

const SCAFFOLD = /\b(npm|pnpm|yarn|bun)\s+(create|init)\b|\bnpx\s+(create-|degit|nuxi|sv\s+create)|\b(django-admin\s+startproject|rails\s+new|cargo\s+(new|init)|dotnet\s+new|flutter\s+create|poetry\s+new|uv\s+init)\b/i;

function inScope(root) {
  return kickstartRoots().some((r) => isUnder(root, r) && norm(root) !== norm(r));
}

function hasMarker(root) {
  return fs.existsSync(path.join(root, '.claude', 'kickstart.json')) || noKickstart(root);
}

// Čita .git direktno (bez pokretanja gita, ~150 ms manje na Windowsu).
function hasCommits(root) {
  const gitDir = path.join(root, '.git');
  try {
    if (fs.statSync(gitDir).isFile()) return true; // worktree: glavni repo već ima commitove
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return true; // detached HEAD pokazuje na commit
    const ref = head.slice(5);
    if (fs.existsSync(path.join(gitDir, ref))) return true;
    const packed = path.join(gitDir, 'packed-refs');
    return fs.existsSync(packed) && fs.readFileSync(packed, 'utf8').includes(' ' + ref);
  } catch {
    return false;
  }
}

// 'nov' = blokira, 'postojeci' = samo prijedlog, null = kapija ne važi.
function mode(root) {
  if (!inScope(root) || hasMarker(root)) return null;
  return hasCommits(root) ? 'postojeci' : 'nov';
}

function isAllowed(rel) {
  return ALLOWED.some((re) => re.test(rel));
}

function check(input, root) {
  const tool = input.tool_name;
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = (input.tool_input || {}).command || '';
    if (!SCAFFOLD.test(cmd)) return null;
  } else if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    const rel = relToRoot(toolTarget(input), root);
    if (rel === null || isAllowed(rel)) return null;
  } else {
    return null; // Read i Grep samo čitaju: kapija čuva pisanje koda
  }
  if (mode(root) !== 'nov') return null;
  return '🚧 Kapija kickstarta: ovo je nov projekat bez temelja (`.claude/kickstart.json` ne postoji). '
    + 'Prije koda pokreni `/kickstart <tema>`. Dozvoljeni su samo dokumenti (docs/, AGENTS.md, CLAUDE.md, STATUS.md, README.md). '
    + 'Ako je ovo svjesno projekat bez kickstarta, napravi prazan fajl `.claude/bez-kickstarta`.';
}

function sessionMessage(root) {
  const m = mode(root);
  if (m === 'nov') {
    return '## Kapija kickstarta\nOvo je nov projekat bez temelja. Prije bilo kakvog koda predloži korisniku `/kickstart <tema>`. '
      + 'Pisanje koda je blokirano dok kickstart ne završi.';
  }
  if (m === 'postojeci') {
    return '## Kapija kickstarta\nProjekat nema kickstart temelj (`.claude/kickstart.json`). Jednom, na početku, predloži '
      + '`/kickstart --postojeci` (pravi samo dokumente koji fale i ništa ne prepisuje). Rad nije blokiran.';
  }
  return null;
}

module.exports = { check, sessionMessage, mode, isAllowed, inScope };
