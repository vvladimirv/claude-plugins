// Sinhronizacija: dugo otvorena sesija ne smije pisati po repou koji se promijenio ispod nje.
// (1) Repo je iza GitHuba → pisanje čeka `git pull`. Na startu sesije čist repo se sam povuče (fast-forward).
//     Tokom rada `git fetch` ide u pozadini (najviše jednom u 10 min), da hook ostane brz.
// (2) Druga lokalna sesija je commitovala otkad je ova zadnji put gledala → prva izmjena staje jednom, uz listu commitova.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { git, isGitRepo, loadState, saveState } = require('./common');
const { isWrite, heldByOther } = require('./lock');

const FETCH_MS = 10 * 60 * 1000;
const SYNC_CMD = /\bgit\b[^|;&\n]*\b(pull|fetch|stash|merge|rebase)\b/i;
const OWN_CHANGE = /\bgit\b[^|;&\n]*\b(commit|merge|pull|rebase|cherry-pick|revert|reset|am|checkout|switch)\b/i;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

function load(sid, root) {
  return loadState('sync', sid)[root] || {};
}

function save(sid, root, s) {
  const all = loadState('sync', sid);
  all[root] = s;
  saveState('sync', sid, all);
}

// Glavni .git folder (u worktreeu je .git fajl koji pokazuje na njega).
function commonGitDir(root) {
  const gitPath = path.join(root, '.git');
  if (fs.statSync(gitPath).isDirectory()) return gitPath;
  const wt = path.resolve(root, fs.readFileSync(gitPath, 'utf8').replace(/^gitdir:\s*/, '').trim());
  const common = path.join(wt, 'commondir');
  return fs.existsSync(common) ? path.resolve(wt, fs.readFileSync(common, 'utf8').trim()) : wt;
}

// Folder sa HEAD-om ove kopije (u worktreeu je .git fajl koji pokazuje na njega).
function ownGitDir(root) {
  const gitPath = path.join(root, '.git');
  if (fs.statSync(gitPath).isDirectory()) return gitPath;
  return path.resolve(root, fs.readFileSync(gitPath, 'utf8').replace(/^gitdir:\s*/, '').trim());
}

// Hash grane iz fajlova (loose ref ili packed-refs); '' ako ga nema.
function readRef(commonDir, ref) {
  const loose = path.join(commonDir, ref);
  if (fs.existsSync(loose)) return fs.readFileSync(loose, 'utf8').trim();
  const packed = path.join(commonDir, 'packed-refs');
  if (!fs.existsSync(packed)) return '';
  const line = fs.readFileSync(packed, 'utf8').split(/\r?\n/).find((l) => l.endsWith(' ' + ref));
  return line ? line.split(' ')[0] : '';
}

// HEAD bez pokretanja gita kad god može (git proces na Windowsu košta 100-300 ms); inače preko gita.
function readHead(root) {
  try {
    const h = fs.readFileSync(path.join(ownGitDir(root), 'HEAD'), 'utf8').trim();
    if (!h.startsWith('ref: ')) return h;
    return readRef(commonGitDir(root), h.slice(5));
  } catch {
    return git(root, ['rev-parse', 'HEAD']);
  }
}

// Hash grane na GitHubu (@{u}) iz .git/config i refova, bez gita. undefined: ne zna se, pitaj git.
function readUpstream(root) {
  try {
    const h = fs.readFileSync(path.join(ownGitDir(root), 'HEAD'), 'utf8').trim();
    if (!h.startsWith('ref: refs/heads/')) return undefined;
    const branch = h.slice('ref: refs/heads/'.length);
    const commonDir = commonGitDir(root);
    const cfg = fs.readFileSync(path.join(commonDir, 'config'), 'utf8');
    if (/^\s*\[include/im.test(cfg)) return undefined;
    let inBranch = false;
    let remote;
    let merge;
    for (const line of cfg.split(/\r?\n/)) {
      const sec = line.match(/^\s*\[(.*)\]\s*$/);
      if (sec) inBranch = sec[1].trim() === `branch "${branch}"`;
      else if (inBranch) {
        const kv = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
        if (kv && kv[1].toLowerCase() === 'remote') remote = kv[2];
        if (kv && kv[1].toLowerCase() === 'merge') merge = kv[2].replace(/^refs\/heads\//, '');
      }
    }
    if (!remote || !merge) return undefined;
    const ref = remote === '.' ? `refs/heads/${merge}` : `refs/remotes/${remote}/${merge}`;
    return readRef(commonDir, ref) || undefined;
  } catch {
    return undefined;
  }
}

// Kad je zadnji fetch (bilo čiji) završio; 0 ako ga nikad nije bilo.
function fetchedTime(root) {
  try {
    return fs.statSync(path.join(commonGitDir(root), 'FETCH_HEAD')).mtimeMs;
  } catch {
    return 0;
  }
}

function fetchNow(root, timeout) {
  try {
    execFileSync('git', ['fetch', '--quiet'], { cwd: root, timeout, stdio: 'ignore', env: GIT_ENV, windowsHide: true });
  } catch {
    // bez mreže ili bez remote-a: ne blokiraj
  }
}

function fetchInBackground(root) {
  try {
    spawn('git', ['fetch', '--quiet'], { cwd: root, detached: true, stdio: 'ignore', env: GIT_ENV, windowsHide: true }).unref();
  } catch {
    // ne blokiraj
  }
}

function behindCount(root) {
  const n = git(root, ['rev-list', '--count', 'HEAD..@{u}']);
  return n === '' ? null : Number(n);
}

// wait: na startu sesije fetch se čeka; tokom rada ide u pozadini, a rezultat se vidi pri sljedećoj provjeri.
function remoteState(root, s, now, wait) {
  if (!s.fetchedAt || now - s.fetchedAt > FETCH_MS) {
    s.fetchedAt = now;
    if (wait) fetchNow(root, 6000);
    else fetchInBackground(root);
  }
  // Broji samo kad se HEAD ili grana na GitHubu pomjerila (refovi se čitaju iz fajlova, bez gita).
  const up = readUpstream(root);
  if (up !== undefined) {
    const head = readHead(root);
    const key = `${head}..${up}`;
    if (up === head) s.behind = 0;
    else if (s.countKey !== key) s.behind = behindCount(root) || 0;
    s.countKey = key;
    return;
  }
  const ft = fetchedTime(root);
  if (s.behind > 0 || ft > (s.countedAt || 0)) {
    s.behind = behindCount(root) || 0;
    s.countedAt = ft;
  }
}

const behindMsg = (root, n) => `🔄 Sinhronizacija: \`${path.basename(root)}\` je ${n} ${n === 1 ? 'commit' : 'commita'} iza GitHuba `
  + '(u međuvremenu je radila druga sesija ili drugi računar). Prije izmjena: `git pull --ff-only`, pa pročitaj STATUS.md i nove commitove.';

function check(input, root, now = Date.now()) {
  if (!isGitRepo(root) || !isWrite(input)) return null;
  const cmd = (input.tool_input || {}).command || '';
  if (SYNC_CMD.test(cmd)) return null; // pull/fetch/stash moraju proći
  const sid = input.session_id;
  const s = load(sid, root);
  remoteState(root, s, now, false);
  const head = readHead(root);
  if (s.behind > 0) {
    save(sid, root, s);
    return behindMsg(root, s.behind);
  }
  if (s.head && head && s.head !== head) {
    const news = git(root, ['log', '--oneline', '--no-decorate', '-5', `${s.head}..${head}`]) || '(historija je prepisana)';
    s.head = head;
    save(sid, root, s);
    return `🔄 Sinhronizacija: otkad je ova sesija zadnji put gledala \`${path.basename(root)}\`, neko drugi je commitovao:\n${news}\n`
      + 'Pročitaj šta se promijenilo (STATUS.md, `git show --stat <hash>`), pa ponovi izmjenu.';
  }
  s.head = head;
  save(sid, root, s);
  return null;
}

// PostToolUse: vlastiti commit/pull/checkout pomjera HEAD, pa ga zapamti da ga ne prijavimo kao tuđi.
function afterTool(input, root) {
  const cmd = (input.tool_input || {}).command || '';
  if (!isGitRepo(root) || !OWN_CHANGE.test(cmd)) return;
  const sid = input.session_id;
  const s = load(sid, root);
  s.head = readHead(root);
  if (/\bpull\b/.test(cmd)) s.behind = behindCount(root) || 0;
  save(sid, root, s);
}

// Povuci sa GitHuba samo kad je to sigurno: nema lokalnih izmjena ni commitova koji nisu na GitHubu,
// i nijedna druga sesija ne piše u ovaj folder. Fast-forward ne može ništa izgubiti.
function fastForward(root, sid, now) {
  if (heldByOther(root, sid, now)) return false;
  if (git(root, ['rev-list', '--count', '@{u}..HEAD']) !== '0') return false;
  if (git(root, ['status', '--porcelain', '--untracked-files=no']) !== '') return false;
  try {
    execFileSync('git', ['merge', '--ff-only', '--quiet', '@{u}'], { cwd: root, timeout: 3000, stdio: 'ignore', env: GIT_ENV, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

// SessionStart: zapamti HEAD; repo iza GitHuba povuci ako je čist, inače odmah reci.
function sessionMessage(input, root, now = Date.now()) {
  if (!isGitRepo(root)) return null;
  const sid = input.session_id;
  const s = load(sid, root);
  remoteState(root, s, now, true);
  let msg = null;
  if (s.behind > 0 && fastForward(root, sid, now)) {
    const n = s.behind;
    s.behind = 0;
    msg = `## Sinhronizacija\n🔄 Repo je bio ${n} ${n === 1 ? 'commit' : 'commita'} iza GitHuba, pa je povučen (fast-forward; `
      + `lokalnih izmjena nije bilo). STATUS.md u kontekstu je možda od prije povlačenja: pročitaj ga ponovo i pogledaj `
      + `\`git log --oneline -${Math.min(n, 10)}\`. Korisniku reci jednom rečenicom da je projekat osvježen.`;
  } else if (s.behind > 0) {
    msg = '## Sinhronizacija\n' + behindMsg(root, s.behind);
  }
  s.head = readHead(root);
  save(sid, root, s);
  return msg;
}

module.exports = { check, afterTool, sessionMessage, readHead, readUpstream };
