// Brava: u jednom folderu projekta piše samo jedna sesija. Uzima se pri prvom pisanju,
// osvježava se pri svakom sljedećem, oslobađa na kraju sesije ili istekne nakon 20 min.

const fs = require('fs');
const path = require('path');
const { readJson, isGitRepo, git } = require('./common');

const LOCK = '.agent-lock.json';
const STALE_MS = 20 * 60 * 1000;

// Komande koje ne diraju fajlove projekta. Worktree, grana i njena bazna grana (/codex-worktree) su samo git zapisi,
// gh komande ovdje samo čitaju GitHub, a `/grane` pregled i spisak za čišćenje samo čitaju git.
// `/zdravlje` (zdravlje-cli.js) samo čita stanje računara i projekta, sa `--root` ili bez njega.
const READONLY = /^(git\s+(status|log|diff|show|branch|remote|rev-parse|rev-list|ls-files|ls-tree|ls-remote|blame|fetch|worktree|for-each-ref|merge-base|cat-file|describe|reflog|shortlog|name-rev|check-ignore|grep|count-objects|cherry|range-diff|version|help|stash\s+(list|show)|tag\s+(-l|--list|-n)|config\s+(--get|--list|-l|["']?branch\.\S+\.base))\b|git(\s+tag)?\s*$|gh\s+(auth\s+status|(pr|issue|run|release|repo|workflow)\s+(list|view|status|checks|diff))|ls|dir|cat|type|head|tail|less|more|grep|rg|find|pwd|cd|echo|printf|wc|which|where|sort|uniq|cut|tr|date|diff|cmp|comm|stat|file|tree|du|df|basename|dirname|realpath|readlink|nl|column|jq|read|true|false|sed\s+-n\b(?!.*\s-i)|node\s+(--version|--test)|node\s+"?[^"\s]*grane-cli\.js"?\s+(pregled|pocisti\s+--spisak)|node\s+"?[^"\s]*zdravlje-cli\.js\b|npm\s+(test|run\s+test|ls|--version)|pytest|python3?\s+-m\s+pytest|py\s+-m\s+pytest|\.?[\\/]?scripts[\\/]test\S*|node\s+scripts[\\/]test\S*|claude\s+plugin\s+(list|validate|details)|Get-\w+|Test-(Path|Json|Connection)|Select-(String|Object|Xml)|Measure-\w+|Compare-Object|Resolve-Path|Split-Path|Join-Path|ConvertFrom-\w+|ConvertTo-(Json|Csv|Html|Xml)|Write-(Output|Host|Verbose)|ForEach-Object|Where-Object|Sort-Object|Group-Object|Format-\w+|Out-(String|Host|Null))\b/i;
const HARMLESS_REDIRECT = /\d?>\s*&\d|\d?>\s*(\/dev\/null|\$null|nul)\b/gi;
// Opcije gita prije podkomande (`git -C <put>`, `git --no-pager`, `git -c x=y`) ne mijenjaju šta komanda radi.
const GIT_OPT = /^git\s+(?:-C\s+("[^"]*"|'[^']*'|\S+)|-c\s+\S+|--no-pager|-P|--no-optional-locks|--literal-pathspecs)\s*/i;
// Riječi petlji i uslova (bash i PowerShell) same ne rade ništa; provjerava se komanda iza njih.
const KEYWORD_PREFIX = /^(?:do|then|else|elif|if|while|until|!)\s+(?!\()/i;
const KEYWORD_ONLY = /^(?:do|done|then|else|fi|esac)$/i;
const PS_KEYWORDS = /(^|\s)(?:else|try|catch|finally|begin|process|end)(?=\s|$)/gi;
// Ulaz iz fajla (`< a.txt`) samo čita; `<<` i `<(` se ne diraju.
const INPUT_REDIRECT = /\s0?<(?![<(])\s*("[^"]*"|'[^']*'|[^\s<>]+)/g;
const FOR_HEAD = /^for\s+\w+\s+in\b/i;
const TEST_EXPR = /^(?:\[\[?\s.*\]\]?|test\s.*)$/;
const PS_HEAD = /^(?:foreach|if|elseif|while|switch)\s*\((.*)\)$/is;
const ASSIGN = /^\$?[A-Za-z_][\w:]*\s*=\s*(.*)$/s;
// PowerShell cmdleti koji pišu, ma gdje u komandi bili (i unutar { } bloka).
const WRITE_CMDLET = /\b(Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item|Clear-Content|Tee-Object|Export-\w+|Invoke-Expression|iex|Start-Process)\b/i;
// Izraz bez komande: string ili varijabla, uz operator (`"---"`, `$_ -match 'x'`, `"{0}" -f $a`).
const EXPR = /^(?:"[^"]*"|'[^']*'|\$[\w:.]+|\((?:[^()]|\([^()]*\))*\)(?:\.\w+)*)(?:\s+-(?:f|match|notmatch|like|notlike|eq|ne|gt|ge|lt|le|replace|split|join|contains|in)\b.*)?$/is;

// Dijeli na &&, ||, ;, | i novi red, ali ne unutar navodnika i { } blokova. null ako navodnik nije zatvoren.
function splitTop(cmd) {
  const out = [];
  let cur = '';
  let quote = null;
  let depth = 0;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{' || c === '(') depth++;
    else if (c === '}' || c === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && !quote) {
      const two = cmd.slice(i, i + 2);
      if (two === '&&' || two === '||') {
        out.push(cur);
        cur = '';
        i++;
        continue;
      }
      if (c === ';' || c === '|' || c === '\n') {
        out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += c;
  }
  if (quote) return null;
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

// Izdvaja sadržaj { } blokova najvišeg nivoa (bez navodnika); ostatak je sama komanda.
function blocks(seg) {
  const inner = [];
  let rest = '';
  let quote = null;
  let depth = 0;
  let cur = '';
  for (const c of seg) {
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '{') {
      if (depth++ === 0) continue;
    } else if (c === '}' && depth > 0) {
      if (--depth === 0) {
        inner.push(cur);
        cur = '';
        continue;
      }
    }
    if (depth > 0) cur += c;
    else rest += c;
  }
  return { rest: rest.trim(), inner };
}

// Komande u zagradama izraza (npr. `(Get-Content $_).Count`) moraju biti čitanje.
function exprReadonly(seg) {
  if (!EXPR.test(seg) || seg.includes('$(')) return false;
  const bare = seg.replace(/"[^"]*"|'[^']*'/g, '""');
  const groups = [];
  let depth = 0;
  let cur = '';
  for (const c of bare) {
    if (c === '(' && depth++ === 0) continue;
    if (c === ')' && depth > 0 && --depth === 0) {
      groups.push(cur);
      cur = '';
      continue;
    }
    if (depth > 0) cur += c;
  }
  if (depth) return false;
  return groups.every((g) => !/[A-Za-z]/.test(g.replace(/\$[\w:.]+/g, '')) || allReadonly(g));
}

// Izdvaja `$( … )` (izvršava se i unutar dvostrukih navodnika, i u bashu i u PowerShellu) i mijenja ga sa "".
// null ako zagrada nije zatvorena.
function substitutions(seg) {
  const inner = [];
  let rest = '';
  let single = false;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (!single && c === '$' && seg[i + 1] === '(') {
      let depth = 1;
      let quote = null;
      let j = i + 2;
      for (; j < seg.length && depth; j++) {
        const d = seg[j];
        if (quote) { if (d === quote) quote = null; continue; }
        if (d === '"' || d === "'") quote = d;
        else if (d === '(') depth++;
        else if (d === ')') depth--;
      }
      if (depth) return null;
      inner.push(seg.slice(i + 2, j - 1));
      rest += '""';
      i = j - 1;
      continue;
    }
    if (c === "'") single = !single;
    rest += c;
  }
  return { rest, inner };
}

function segmentReadonly(seg) {
  const sub = substitutions(seg);
  if (!sub || !sub.inner.every((b) => allReadonly(b))) return false;
  let s = sub.rest.replace(/^(\w+=\S*\s+)+/, '');
  while (KEYWORD_PREFIX.test(s)) s = s.replace(KEYWORD_PREFIX, '');
  while (GIT_OPT.test(s)) s = s.replace(GIT_OPT, 'git ');
  s = s.replace(INPUT_REDIRECT, '').trim();
  const parts = blocks(s);
  if (!parts.inner.every((b) => allReadonly(b))) return false;
  const rest = parts.inner.length ? parts.rest.replace(PS_KEYWORDS, ' ').trim() : parts.rest;
  if (!rest || KEYWORD_ONLY.test(rest) || FOR_HEAD.test(rest) || TEST_EXPR.test(rest)) return true;
  const head = rest.match(PS_HEAD);
  if (head) {
    const cond = head[1].replace(/^\s*\$\w+\s+in\s+/i, '').trim();
    return !cond || exprReadonly(cond) || allReadonly(cond);
  }
  const assign = rest.match(ASSIGN);
  if (assign && !/^=/.test(assign[1])) {
    const value = assign[1].trim();
    return !value || /^(?:"[^"]*"|'[^']*'|[\w.:\\/-]+)$/.test(value) || exprReadonly(value) || segmentReadonly(value);
  }
  return READONLY.test(rest) || exprReadonly(rest);
}

function allReadonly(cmd) {
  const parts = splitTop(cmd) || cmd.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean);
  return parts.every(segmentReadonly);
}

function isReadonlyCommand(cmd) {
  if (!cmd || !cmd.trim()) return true;
  if (cmd.replace(HARMLESS_REDIRECT, '').includes('>')) return false;
  if (WRITE_CMDLET.test(cmd)) return false;
  return allReadonly(cmd);
}

// Izlazi iz brave (/preuzmi-lock, /pravila-pauza) moraju raditi i iz blokirane sesije.
const ESCAPE = /\.agent-lock\.json|pravila-pauza/;

function isWrite(input) {
  const tool = input.tool_name;
  const t = input.tool_input || {};
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') return !ESCAPE.test(t.file_path || t.notebook_path || '');
  if (tool === 'Bash' || tool === 'PowerShell') return !ESCAPE.test(t.command || '') && !isReadonlyCommand(t.command);
  return false;
}

function lockPath(root) {
  return path.join(root, LOCK);
}

function isFresh(lock, now) {
  return Boolean(lock && lock.heartbeat && now - Date.parse(lock.heartbeat) < STALE_MS);
}

function heldByOther(root, sid, now) {
  const lock = readJson(lockPath(root), null);
  return lock && lock.session_id !== sid && isFresh(lock, now) ? lock : null;
}

function hhmm(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ensureExcluded(root) {
  const rel = git(root, ['rev-parse', '--git-path', 'info/exclude']);
  if (!rel) return;
  const file = path.resolve(root, rel);
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!cur.split(/\r?\n/).includes(LOCK)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, (cur && !cur.endsWith('\n') ? '\n' : '') + LOCK + '\n');
  }
}

function check(input, root, now = Date.now()) {
  if (!isGitRepo(root) || !isWrite(input)) return null;
  const sid = input.session_id || 'nepoznata';
  const other = heldByOther(root, sid, now);
  if (other) {
    return `🔐 Brava: ovaj projekat od ${hhmm(other.since)} uređuje druga sesija (${other.agent || 'agent'}). `
      + 'Ova sesija može samo čitati. Opcije: (1) nastavi u toj drugoj sesiji; '
      + '(2) za paralelni rad otvori worktree (`git worktree add ../<projekat>-<zadatak> -b <grana>`); '
      + '(3) ako je ona sesija zatvorena ili se srušila: `/preuzmi-lock`. Brava sama istekne nakon 20 min neaktivnosti.';
  }
  const prev = readJson(lockPath(root), null);
  const own = prev && prev.session_id === sid;
  const nowIso = new Date(now).toISOString();
  fs.writeFileSync(lockPath(root), JSON.stringify({
    agent: input._runtime || 'claude', session_id: sid, since: own ? prev.since : nowIso, heartbeat: nowIso,
  }, null, 2));
  if (!own) ensureExcluded(root);
  return null;
}

function release(input, root) {
  const lock = readJson(lockPath(root), null);
  if (lock && lock.session_id === input.session_id) fs.unlinkSync(lockPath(root));
}

function sessionMessage(root, sid, now = Date.now()) {
  if (!isGitRepo(root)) return null;
  const other = heldByOther(root, sid, now);
  if (!other) return null;
  return `## Brava\nOvaj projekat od ${hhmm(other.since)} uređuje druga sesija. Ova sesija može samo čitati. `
    + 'Reci to korisniku odmah i predloži worktree za paralelni rad ili `/preuzmi-lock` ako je druga sesija zatvorena.';
}

module.exports = { check, release, sessionMessage, heldByOther, isFresh, isReadonlyCommand, isWrite, LOCK, STALE_MS };
