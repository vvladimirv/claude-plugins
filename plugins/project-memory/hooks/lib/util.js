// Zajedničke funkcije project-memory hookova: korijen projekta, git, log grešaka.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const IS_WIN = process.platform === 'win32';
const CLAUDE_HOME = path.join(os.homedir(), '.claude');

// Kopije iz project-guard/hooks/lib/common.js (pluginovi ne dijele kod). test/kopije-funkcija.test.js pazi da ostanu iste.
function norm(p) {
  const r = path.resolve(p);
  return IS_WIN ? r.toLowerCase() : r;
}

function isUnder(child, parent) {
  const c = norm(child);
  const p = norm(parent);
  return c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep);
}

// Worktree unutar projekta (npr. `.claude/worktrees/x` iz aplikacije): `.git` je fajl koji pokazuje na `.../worktrees/...`.
function isWorktreeRoot(dir) {
  try {
    return /^gitdir:.*[\\/]worktrees[\\/]/m.test(fs.readFileSync(path.join(dir, '.git'), 'utf8'));
  } catch {
    return false;
  }
}

// Isti redoslijed kao project-guard: folder sesije (CLAUDE_PROJECT_DIR), pa cwd iz hooka. Aplikacija sesiji u
// worktreeu daje CLAUDE_PROJECT_DIR glavnog repoa, pa tada važi worktree iz cwd.
function projectDir(input) {
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

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function logError(where, err) {
  try {
    const line = `${new Date().toISOString()} project-memory/${where}: ${err && err.stack ? err.stack : err}\n`;
    fs.appendFileSync(path.join(CLAUDE_HOME, 'pravila.log'), line);
  } catch {
    // ni log nije uspio: tiho odustani
  }
}

module.exports = { norm, isUnder, projectDir, isWorktreeRoot, git, logError };
