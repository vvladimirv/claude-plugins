// Zajedničke funkcije za sve guard module: putanje, konfiguracija, prekidač, log.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const IS_WIN = process.platform === 'win32';
const CLAUDE_HOME = process.env.CC_GUARD_HOME || path.join(os.homedir(), '.claude');

function norm(p) {
  const r = path.resolve(p);
  return IS_WIN ? r.toLowerCase() : r;
}

function isUnder(child, parent) {
  const c = norm(child);
  const p = norm(parent);
  return c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep);
}

// Putanja relativno na korijen projekta, sa '/' separatorom; null ako je van projekta.
function relToRoot(file, root) {
  if (!file) return null;
  const abs = path.resolve(root, file);
  if (!isUnder(abs, root)) return null;
  return path.relative(root, abs).split(path.sep).join('/');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Worktree unutar projekta (npr. `.claude/worktrees/x` iz aplikacije): `.git` je fajl koji pokazuje na `.../worktrees/...`.
function isWorktreeRoot(dir) {
  try {
    return /^gitdir:.*[\\/]worktrees[\\/]/m.test(fs.readFileSync(path.join(dir, '.git'), 'utf8'));
  } catch {
    return false;
  }
}

// Aplikacija sesiji u worktreeu daje CLAUDE_PROJECT_DIR glavnog repoa. Worktree je svoj folder sa svojom bravom,
// pa tada važi worktree iz cwd, inače bi pomoćna sesija bila blokirana bravom glavne.
function projectRoot(input) {
  const dir = process.env.CLAUDE_PROJECT_DIR;
  const cwd = input.cwd;
  if (!dir) return cwd || process.cwd();
  if (cwd && isUnder(cwd, dir)) {
    for (let d = path.resolve(cwd); norm(d) !== norm(dir) && isUnder(d, dir); d = path.dirname(d)) {
      if (isWorktreeRoot(d)) return d;
    }
  }
  return dir;
}

// Korijeni u kojima važi kapija kickstarta (jedna putanja po liniji).
function kickstartRoots() {
  try {
    const lines = fs.readFileSync(path.join(CLAUDE_HOME, 'kickstart-korijeni.txt'), 'utf8')
      .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    if (lines.length) return lines;
  } catch {
    // nema fajla: podrazumijevani korijen
  }
  return [path.join(process.env.SystemDrive ? process.env.SystemDrive + path.sep : path.sep, 'dev')];
}

// `.claude/bez-kickstarta`: projekat svjesno nema kickstart temelj, nego svoj sistem dokumenata.
function noKickstart(root) {
  return fs.existsSync(path.join(root, '.claude', 'bez-kickstarta'));
}

// Korijen projekta za fajl koji alat dira. Sesija može biti otvorena u jednom folderu, a pisati u drugi
// projekat (npr. /kickstart za novu temu), pa pravila moraju važiti za ciljni projekat.
// Folder u kojem shell komanda stvarno radi: `cd X && …`, `Set-Location X; …` ili `git -C X …`.
function commandDir(cmd) {
  const q = '(?:"([^"]+)"|\'([^\']+)\'|([^\\s;&|]+))';
  const m = cmd.match(new RegExp(`^\\s*(?:cd|Set-Location|pushd)\\s+${q}`, 'i')) || cmd.match(new RegExp(`\\bgit\\s+-C\\s+${q}`));
  if (!m) return null;
  let p = m[1] || m[2] || m[3];
  const msys = p.match(/^\/([a-z])(\/.*)?$/i); // Git Bash: /c/dev/x → C:/dev/x
  if (msys && IS_WIN) p = `${msys[1]}:${msys[2] || '/'}`;
  return p.replace(/^~(?=[\\/]|$)/, os.homedir());
}

function rootFor(input, sessionRoot) {
  const t = input.tool_input || {};
  const dirFromCmd = t.command ? commandDir(t.command) : null;
  const file = t.file_path || t.notebook_path || dirFromCmd;
  if (!file) return sessionRoot;
  const abs = path.resolve(sessionRoot, file);
  if (isUnder(abs, sessionRoot)) return sessionRoot;
  for (let dir = dirFromCmd ? abs : path.dirname(abs); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, '.claude', 'kickstart.json'))) return dir;
    if (path.dirname(dir) === dir) break;
  }
  for (const r of kickstartRoots()) {
    const parts = isUnder(abs, r) ? path.relative(r, abs).split(path.sep) : [];
    if (parts.length > 1) return path.join(r, parts[0]);
  }
  return sessionRoot;
}

// Prekidač: env CC_PRAVILA=off ili ~/.claude/pravila-pauza.json sa poljem "do" (ISO vrijeme).
function isPaused(now = Date.now()) {
  if ((process.env.CC_PRAVILA || '').toLowerCase() === 'off') return true;
  const p = readJson(path.join(CLAUDE_HOME, 'pravila-pauza.json'), null);
  return Boolean(p && p.do && Date.parse(p.do) > now);
}

const DEFAULT_LIMITS = { upozorenje: 300, maks: 500 };

function limits(root) {
  const cfg = readJson(path.join(root, '.claude', 'granice.json'), {});
  return {
    upozorenje: Number(cfg.upozorenje) || DEFAULT_LIMITS.upozorenje,
    maks: Number(cfg.maks) || DEFAULT_LIMITS.maks,
    iskljuci: Array.isArray(cfg.iskljuci) ? cfg.iskljuci : [],
  };
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function isGitRepo(root) {
  return fs.existsSync(path.join(root, '.git'));
}

function countLines(text) {
  if (!text) return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

// Jednostavan glob: ** = bilo šta, * = bilo šta osim '/'.
function globToRegex(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp('^' + esc + '$', 'i');
}

function logError(where, err) {
  try {
    const line = `${new Date().toISOString()} project-guard/${where}: ${err && err.stack ? err.stack : err}\n`;
    fs.appendFileSync(path.join(CLAUDE_HOME, 'pravila.log'), line);
  } catch {
    // ni log nije uspio: tiho odustani
  }
}

// Spor hook (bez pokretanja Node-a) ide u isti log, da se vidi da li važi pravilo < 200 ms.
function logSlow(where, ms) {
  logError(`sporo/${where}`, `${ms} ms`);
}

function dataDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'claude-project-guard');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Stanje po sesiji: jedan fajl po sesiji (<dataDir>/<ime>/<sesija>.json), pa paralelne sesije ne gaze jedna drugu.
function stateFile(name, sid) {
  const dir = path.join(dataDir(), name);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, String(sid || 'nepoznata').replace(/[^\w.-]/g, '_') + '.json');
}

function loadState(name, sid) {
  return readJson(stateFile(name, sid), {});
}

function saveState(name, sid, data) {
  fs.writeFileSync(stateFile(name, sid), JSON.stringify(data));
}

const STATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LEGACY_STATE = ['sync.json', 'stop-podsjetnik.json', 'deps-upozorenja.json'];

// SessionStart: briše stanje sesija starijih od 7 dana i stare zajedničke fajlove (do 0.4.x).
function pruneState(now = Date.now()) {
  const dir = dataDir();
  for (const f of LEGACY_STATE) fs.rmSync(path.join(dir, f), { force: true });
  for (const sub of fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const subDir = path.join(dir, sub.name);
    for (const f of fs.readdirSync(subDir)) {
      const file = path.join(subDir, f);
      if (now - fs.statSync(file).mtimeMs > STATE_MAX_AGE_MS) fs.rmSync(file, { force: true });
    }
  }
}

module.exports = {
  CLAUDE_HOME, norm, isUnder, relToRoot, readJson, projectRoot, isWorktreeRoot, rootFor, commandDir, kickstartRoots, noKickstart, isPaused,
  limits, git, isGitRepo, countLines, globToRegex, logError, logSlow, dataDir, loadState, saveState, pruneState,
};
