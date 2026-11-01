// Cloud sesija: pluginovi su git klon iz setup skripte okruženja (CLAUDE_CODE_PLUGIN_DIRS), a okruženje svakoj
// novoj sesiji daje snimak napravljen poslije setup skripte, pa klon zastari. Na startu sesije klon se povuče
// sa GitHuba: samo fast-forward i samo čist klon, pa se ništa ne može izgubiti. Lokalno (van clouda) ne radi ništa:
// tu verzije donosi auto-update marketplacea, a klon u CLAUDE_CODE_PLUGIN_DIRS je obično razvojni repo.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { git, readJson, logError } = require('./common');

const PULL_MS = 4000;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

// Korijeni git klonova koji su marketplace (imaju .claude-plugin/marketplace.json), bez duplikata.
function marketplaceRoots(env) {
  const roots = new Set();
  for (const dir of (env.CLAUDE_CODE_PLUGIN_DIRS || '').split(path.delimiter).map((d) => d.trim()).filter(Boolean)) {
    if (!fs.existsSync(dir)) continue;
    const top = git(dir, ['rev-parse', '--show-toplevel']);
    if (top && fs.existsSync(path.join(top, '.claude-plugin', 'marketplace.json'))) roots.add(path.resolve(top));
  }
  return [...roots];
}

function versions(root) {
  const market = readJson(path.join(root, '.claude-plugin', 'marketplace.json'), { plugins: [] });
  return new Map((market.plugins || []).map((p) => [p.name, p.version]));
}

// true kad je klon pomjeren naprijed; izmijenjen klon se ne dira.
function pull(root) {
  if (git(root, ['status', '--porcelain', '--untracked-files=no']) !== '') {
    logError('selfupdate', `${root}: klon ima lokalne izmjene, pa nije povučen`);
    return false;
  }
  const before = git(root, ['rev-parse', 'HEAD']);
  try {
    execFileSync('git', ['pull', '--ff-only', '--quiet'], { cwd: root, timeout: PULL_MS, stdio: 'ignore', env: GIT_ENV, windowsHide: true });
  } catch (err) {
    logError('selfupdate', `${root}: git pull nije uspio (${err.code || err.status || err.message})`);
    return false;
  }
  return git(root, ['rev-parse', 'HEAD']) !== before;
}

function changes(before, after) {
  const out = [];
  for (const [name, v] of after) {
    if (!before.has(name)) out.push(`${name} ${v} (nov)`);
    else if (before.get(name) !== v) out.push(`${name} ${before.get(name)} → ${v}`);
  }
  return out;
}

function sessionMessage(input, env = process.env) {
  if (env.CLAUDE_CODE_REMOTE !== 'true') return null;
  if (input.source !== 'startup') return null;
  const list = [];
  for (const root of marketplaceRoots(env)) {
    const before = versions(root);
    if (pull(root)) list.push(...changes(before, versions(root)));
  }
  if (!list.length) return null;
  return `## Pluginovi\n🔄 Pluginovi su osvježeni sa GitHuba: ${list.join(', ')}. Korisniku to reci jednom rečenicom.`;
}

module.exports = { sessionMessage };
