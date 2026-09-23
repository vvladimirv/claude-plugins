// Brava: u jednom folderu projekta piše samo jedna sesija. Uzima se pri prvom pisanju,
// osvježava se pri svakom sljedećem, oslobađa na kraju sesije ili istekne nakon 20 min.

const fs = require('fs');
const path = require('path');
const { readJson, isGitRepo, git } = require('./common');

const LOCK = '.agent-lock.json';
const STALE_MS = 20 * 60 * 1000;

const READONLY = /^(git\s+(status|log|diff|show|branch|remote|rev-parse|ls-files|blame|fetch|worktree|stash\s+list|config\s+--get)\b|git\s*$|ls|dir|cat|type|head|tail|less|more|grep|rg|find|pwd|cd|echo|wc|which|where|sort|node\s+(--version|--test)|npm\s+(test|run\s+test|ls|--version)|pytest|python3?\s+-m\s+pytest|py\s+-m\s+pytest|\.?[\\/]?scripts[\\/]test\S*|node\s+scripts[\\/]test\S*|claude\s+plugin\s+(list|validate|details)|Get-(ChildItem|Content|Location|Item|Command|Date)|Select-String|Select-Object|Measure-Object|Test-Path|Write-Output)\b/i;
const HARMLESS_REDIRECT = /\d?>\s*&\d|\d?>\s*(\/dev\/null|\$null|nul)\b/gi;

function isReadonlyCommand(cmd) {
  if (!cmd || !cmd.trim()) return true;
  if (cmd.replace(HARMLESS_REDIRECT, '').includes('>')) return false;
  return cmd.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean)
    .every((seg) => READONLY.test(seg.replace(/^(\w+=\S*\s+)+/, '')));
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

module.exports = { check, release, sessionMessage, isReadonlyCommand, isWrite, LOCK, STALE_MS };
