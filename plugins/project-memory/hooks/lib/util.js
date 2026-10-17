// Zajedničke funkcije project-memory hookova: korijen projekta, git, log grešaka.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Isti redoslijed kao project-guard: folder sesije (CLAUDE_PROJECT_DIR), pa cwd iz hooka.
function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function logError(where, err) {
  try {
    const line = `${new Date().toISOString()} project-memory/${where}: ${err && err.stack ? err.stack : err}\n`;
    fs.appendFileSync(path.join(os.homedir(), '.claude', 'pravila.log'), line);
  } catch {
    // ni log nije uspio: tiho odustani, sesija ne smije pasti zbog hooka
  }
}

module.exports = { projectDir, git, logError };
