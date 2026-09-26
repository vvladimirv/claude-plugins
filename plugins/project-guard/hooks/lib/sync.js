// Sinhronizacija: dugo otvorena sesija ne smije pisati po repou koji se promijenio ispod nje.
// (1) Repo je iza GitHuba → pisanje čeka `git pull` (fetch najviše jednom u 10 min).
// (2) Druga lokalna sesija je commitovala otkad je ova zadnji put gledala → prva izmjena staje jednom, uz listu commitova.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { git, isGitRepo, dataDir, readJson } = require('./common');
const { isWrite } = require('./lock');

const FETCH_MS = 10 * 60 * 1000;
const SYNC_CMD = /\bgit\b[^|;&\n]*\b(pull|fetch|stash|merge|rebase)\b/i;
const OWN_CHANGE = /\bgit\b[^|;&\n]*\b(commit|merge|pull|rebase|cherry-pick|revert|reset|am|checkout|switch)\b/i;

function stateFile() {
  return path.join(dataDir(), 'sync.json');
}

function load(key) {
  return readJson(stateFile(), {})[key] || {};
}

function save(key, s) {
  const all = readJson(stateFile(), {});
  all[key] = s;
  fs.writeFileSync(stateFile(), JSON.stringify(all));
}

// HEAD bez pokretanja gita kad god može (brže na Windowsu); worktree i ostalo preko gita.
function readHead(root) {
  const gitDir = path.join(root, '.git');
  try {
    if (fs.statSync(gitDir).isDirectory()) {
      const h = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      if (!h.startsWith('ref: ')) return h;
      const ref = h.slice(5);
      if (fs.existsSync(path.join(gitDir, ref))) return fs.readFileSync(path.join(gitDir, ref), 'utf8').trim();
      const line = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8').split(/\r?\n/).find((l) => l.endsWith(' ' + ref));
      if (line) return line.split(' ')[0];
      return '';
    }
  } catch {
    // pada na git ispod
  }
  return git(root, ['rev-parse', 'HEAD']);
}

function fetch(root) {
  try {
    execFileSync('git', ['fetch', '--quiet'], {
      cwd: root, timeout: 8000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return true;
  } catch {
    return false; // bez mreže ili bez remote-a: ne blokiraj
  }
}

function behindCount(root) {
  const n = git(root, ['rev-list', '--count', 'HEAD..@{u}']);
  return n === '' ? null : Number(n);
}

function remoteState(root, s, now) {
  if (!s.fetchedAt || now - s.fetchedAt > FETCH_MS) {
    s.fetchedAt = now;
    s.behind = fetch(root) ? behindCount(root) : s.behind || 0;
  } else if (s.behind > 0) {
    s.behind = behindCount(root);
  }
}

const behindMsg = (root, n) => `🔄 Sinhronizacija: \`${path.basename(root)}\` je ${n} ${n === 1 ? 'commit' : 'commita'} iza GitHuba `
  + '(u međuvremenu je radila druga sesija ili drugi računar). Prije izmjena: `git pull --ff-only`, pa pročitaj STATUS.md i nove commitove.';

function check(input, root, now = Date.now()) {
  if (!isGitRepo(root) || !isWrite(input)) return null;
  const cmd = (input.tool_input || {}).command || '';
  if (SYNC_CMD.test(cmd)) return null; // pull/fetch/stash moraju proći
  const key = `${input.session_id}|${root}`;
  const s = load(key);
  remoteState(root, s, now);
  const head = readHead(root);
  if (s.behind > 0) {
    save(key, s);
    return behindMsg(root, s.behind);
  }
  if (s.head && head && s.head !== head) {
    const news = git(root, ['log', '--oneline', '--no-decorate', '-5', `${s.head}..${head}`]) || '(historija je prepisana)';
    s.head = head;
    save(key, s);
    return `🔄 Sinhronizacija: otkad je ova sesija zadnji put gledala \`${path.basename(root)}\`, neko drugi je commitovao:\n${news}\n`
      + 'Pročitaj šta se promijenilo (STATUS.md, `git show --stat <hash>`), pa ponovi izmjenu.';
  }
  s.head = head;
  save(key, s);
  return null;
}

// PostToolUse: vlastiti commit/pull/checkout pomjera HEAD, pa ga zapamti da ga ne prijavimo kao tuđi.
function afterTool(input, root) {
  const cmd = (input.tool_input || {}).command || '';
  if (!isGitRepo(root) || !OWN_CHANGE.test(cmd)) return;
  const key = `${input.session_id}|${root}`;
  const s = load(key);
  s.head = readHead(root);
  if (/\bpull\b/.test(cmd)) s.behind = behindCount(root) || 0;
  save(key, s);
}

// SessionStart: zapamti HEAD i odmah reci ako je repo iza GitHuba.
function sessionMessage(input, root, now = Date.now()) {
  if (!isGitRepo(root)) return null;
  const key = `${input.session_id}|${root}`;
  const s = load(key);
  remoteState(root, s, now);
  s.head = readHead(root);
  save(key, s);
  return s.behind > 0 ? '## Sinhronizacija\n' + behindMsg(root, s.behind) : null;
}

module.exports = { check, afterTool, sessionMessage, readHead };
