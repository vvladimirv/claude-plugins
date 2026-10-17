// Brava: u jednom folderu projekta piše samo jedna sesija. Uzima se pri prvom pisanju,
// osvježava se pri svakom sljedećem, oslobađa na kraju sesije ili istekne nakon 20 min.

const fs = require('fs');
const path = require('path');
const { readJson, isGitRepo, git } = require('./common');

const LOCK = '.agent-lock.json';
const STALE_MS = 20 * 60 * 1000;

// Komande koje ne diraju fajlove projekta. Worktree, grana i njena bazna grana (/codex-worktree) su samo git zapisi,
// a gh komande ovdje samo čitaju GitHub.
const READONLY = /^(git\s+(status|log|diff|show|branch|remote|rev-parse|ls-files|blame|fetch|worktree|stash\s+list|config\s+(--get|["']?branch\.\S+\.base))\b|git\s*$|gh\s+(auth\s+status|(pr|issue|run|release|repo|workflow)\s+(list|view|status|checks|diff))|ls|dir|cat|type|head|tail|less|more|grep|rg|find|pwd|cd|echo|wc|which|where|sort|uniq|cut|tr|date|sed\s+-n\b(?!.*\s-i)|node\s+(--version|--test)|npm\s+(test|run\s+test|ls|--version)|pytest|python3?\s+-m\s+pytest|py\s+-m\s+pytest|\.?[\\/]?scripts[\\/]test\S*|node\s+scripts[\\/]test\S*|claude\s+plugin\s+(list|validate|details)|Get-(ChildItem|Content|Location|Item|Command|Date)|Select-String|Select-Object|Measure-Object|Test-Path|Write-Output|Write-Host|ForEach-Object|Where-Object|Sort-Object|Group-Object|Format-(Table|List|Wide)|Out-String)\b/i;
const HARMLESS_REDIRECT = /\d?>\s*&\d|\d?>\s*(\/dev\/null|\$null|nul)\b/gi;
const GIT_DIR = /^git\s+-C\s+("[^"]*"|'[^']*'|\S+)\s*/i;
// PowerShell cmdleti koji pišu, ma gdje u komandi bili (i unutar { } bloka).
const WRITE_CMDLET = /\b(Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item|Clear-Content|Tee-Object|Export-\w+|Invoke-Expression|iex|Start-Process)\b/i;
// Izraz bez komande: string ili varijabla, uz operator (`"---"`, `$_ -match 'x'`, `"{0}" -f $a`).
const EXPR = /^(?:"[^"]*"|'[^']*'|\$[\w:.]+)(?:\s+-(?:f|match|notmatch|like|notlike|eq|ne|gt|ge|lt|le|replace|split|join|contains|in)\b.*)?$/is;

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
    else if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
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
  return [...bare.matchAll(/\(\s*([A-Za-z][\w-]*)/g)].every((m) => READONLY.test(m[1]));
}

function segmentReadonly(seg) {
  const s = seg.replace(/^(\w+=\S*\s+)+/, '').replace(GIT_DIR, 'git ');
  const { rest, inner } = blocks(s);
  if (!inner.every((b) => allReadonly(b))) return false;
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
    agent: 'claude', session_id: sid, since: own ? prev.since : nowIso, heartbeat: nowIso,
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

module.exports = { check, release, sessionMessage, heldByOther, isReadonlyCommand, isWrite, LOCK, STALE_MS };
