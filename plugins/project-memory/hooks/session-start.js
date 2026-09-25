// SessionStart hook: ubacuje STATUS.md i zadnje commitove u kontekst sesije.
// Fail-open: svaka greška se upiše u ~/.claude/pravila.log, a sesija normalno nastavlja.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { sessionText } = require('./lib/progress');

const MAX_STATUS_LINES = 40;
const MAX_STATUS_CHARS = 3000;
const GIT_LOG_COUNT = 10;

function trimStatus(text) {
  let lines = text.replace(/\r\n/g, '\n').trim().split('\n');
  let cut = lines.length > MAX_STATUS_LINES;
  lines = lines.slice(0, MAX_STATUS_LINES);
  let out = lines.join('\n');
  if (out.length > MAX_STATUS_CHARS) {
    out = out.slice(0, MAX_STATUS_CHARS);
    cut = true;
  }
  return cut ? out + '\n… (skraćeno: STATUS.md je predugačak, treba ga skratiti na ≤ 30 linija)' : out;
}

function buildContext({ statusText, gitLog, uncommitted, progress }) {
  const parts = [];
  if (progress) parts.push(progress);
  if (statusText) {
    parts.push('## STATUS.md (trenutno stanje projekta)\n' + trimStatus(statusText));
  }
  if (gitLog) {
    parts.push(`## Zadnjih ${GIT_LOG_COUNT} commitova\n` + gitLog.trim());
  }
  if (uncommitted > 0) {
    parts.push(`## Necommitovano\n${uncommitted} izmijenjenih fajlova od prošle sesije. Pitaj korisnika da li ih prvo commitovati.`);
  }
  if (parts.length === 0) return '';
  return '# Memorija projekta (project-memory)\n\n' + parts.join('\n\n');
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function logError(err) {
  try {
    const line = `${new Date().toISOString()} project-memory/session-start: ${err && err.stack ? err.stack : err}\n`;
    fs.appendFileSync(path.join(os.homedir(), '.claude', 'pravila.log'), line);
  } catch {
    // ni log nije uspio: tiho odustani, sesija ne smije pasti zbog hooka
  }
}

function main() {
  const input = readInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  const statusPath = path.join(cwd, 'STATUS.md');
  const statusText = fs.existsSync(statusPath) ? fs.readFileSync(statusPath, 'utf8') : '';

  const isRepo = git(cwd, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  const gitLog = isRepo ? git(cwd, ['log', '--oneline', '--no-decorate', `-${GIT_LOG_COUNT}`]) : '';
  const uncommitted = isRepo ? git(cwd, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean).length : 0;

  let progress = null;
  try {
    progress = sessionText(cwd);
  } catch (err) {
    logError(err);
  }
  const context = buildContext({ statusText, gitLog, uncommitted, progress });
  if (!context) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    logError(err);
  }
  process.exit(0);
}

module.exports = { buildContext, trimStatus };
