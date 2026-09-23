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

function projectRoot(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
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

// Korijen projekta za fajl koji alat dira. Sesija može biti otvorena u jednom folderu, a pisati u drugi
// projekat (npr. /kickstart za novu temu), pa pravila moraju važiti za ciljni projekat.
function rootFor(input, sessionRoot) {
  const t = input.tool_input || {};
  const file = t.file_path || t.notebook_path;
  if (!file) return sessionRoot;
  const abs = path.resolve(sessionRoot, file);
  if (isUnder(abs, sessionRoot)) return sessionRoot;
  for (let dir = path.dirname(abs); ; dir = path.dirname(dir)) {
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

function dataDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'claude-project-guard');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  CLAUDE_HOME, norm, isUnder, relToRoot, readJson, projectRoot, rootFor, kickstartRoots, isPaused,
  limits, git, isGitRepo, countLines, globToRegex, logError, dataDir,
};
