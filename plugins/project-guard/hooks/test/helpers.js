// Zajednički setup za testove: izolovan ~/.claude, izolovan korijen projekata, pomoćnici za projekte.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'));
const HOME = path.join(BASE, 'claude-home');
const DEV = path.join(BASE, 'dev');
fs.mkdirSync(HOME, { recursive: true });
fs.mkdirSync(DEV, { recursive: true });
fs.writeFileSync(path.join(HOME, 'kickstart-korijeni.txt'), DEV + '\n');

// Mora prije require('../lib/...'): moduli čitaju env pri učitavanju.
process.env.CC_GUARD_HOME = HOME;
process.env.CLAUDE_PLUGIN_DATA = path.join(BASE, 'data');
delete process.env.CLAUDE_PROJECT_DIR;
delete process.env.CC_PRAVILA;

let n = 0;

function write(root, rel, content = 'x\n') {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

function git(root, ...args) {
  execFileSync('git', args, { cwd: root, stdio: 'ignore' });
}

// opts: { outside, git, commit, marker, files: { rel: content } }
function project(opts = {}) {
  const root = path.join(opts.outside ? BASE : DEV, `p${++n}`);
  fs.mkdirSync(root, { recursive: true });
  for (const [rel, content] of Object.entries(opts.files || {})) write(root, rel, content);
  if (opts.marker) write(root, '.claude/kickstart.json', '{"status":"gotovo"}');
  if (opts.git || opts.commit) {
    git(root, 'init', '-q', '-b', 'main');
    git(root, 'config', 'user.email', 't@t');
    git(root, 'config', 'user.name', 't');
  }
  if (opts.commit) {
    write(root, 'README.md', '# p\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'init');
  }
  return root;
}

function lines(count) {
  return Array.from({ length: count }, (_, i) => `const a${i} = ${i};`).join('\n') + '\n';
}

function pre(root, tool, toolInput, sid = 'A') {
  return { hook_event_name: 'PreToolUse', cwd: root, session_id: sid, tool_name: tool, tool_input: toolInput };
}

function decision(out) {
  return out && out.hookSpecificOutput ? out.hookSpecificOutput.permissionDecision : undefined;
}

function pause(on) {
  const f = path.join(HOME, 'pravila-pauza.json');
  if (on) fs.writeFileSync(f, JSON.stringify({ do: new Date(Date.now() + 3600000).toISOString() }));
  else if (fs.existsSync(f)) fs.unlinkSync(f);
}

module.exports = { BASE, HOME, DEV, project, write, git, lines, pre, decision, pause };
