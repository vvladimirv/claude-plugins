// /zdravlje: da li su plugini ispravno postavljeni na ovom računaru. Samo čita, ništa ne mijenja.
// node zdravlje-cli.js [--root <projekat>]

const fs = require('fs');
const path = require('path');
const { CLAUDE_HOME, kickstartRoots, isPaused, git, readJson } = require('./lib/common');

const personal = require('./lib/personal');

const DAY = 86400000;
const PLUGINS = ['project-guard', 'project-memory', 'project-kickstart', 'project-quality', 'project-market'];
const MARKET = 'moji-pluginsi';
const ENTRY = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z) (.+?): (.*)$/;

function tool(cmd, args) {
  try {
    return require('child_process').execFileSync(cmd, args, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// Svih pet pluginova: instaliran i uključen, sa verzijom.
function pluginLines(settings, ok, warn) {
  const installed = readJson(path.join(CLAUDE_HOME, 'plugins', 'installed_plugins.json'), { plugins: {} }).plugins || {};
  const enabled = settings.enabledPlugins || {};
  const have = [];
  for (const name of PLUGINS) {
    const key = `${name}@${MARKET}`;
    const entry = (installed[key] || [])[0];
    if (!entry) warn.push(`${name} nije instaliran: u ${personal.pluginsRepo()} pokreni node scripts/setup.js --apply`);
    else if (enabled[key] === false) warn.push(`${name} je isključen (aplikacija → Plugins, ili claude plugin enable ${key})`);
    else have.push(`${name.replace('project-', '')} ${entry.version}`);
  }
  if (have.length) ok.push(`pluginovi: ${have.join(', ')}`);
}

// Repo prema GitHubu, bez mijenjanja ičega lokalno (ls-remote samo čita). null: ne zna se (bez mreže ili remotea).
function vsGitHub(repo) {
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const line = branch && branch !== 'HEAD' ? tool('git', ['-C', repo, 'ls-remote', 'origin', `refs/heads/${branch}`]) : '';
  if (!line) return null;
  const remote = line.split(/\s+/)[0];
  if (remote === git(repo, ['rev-parse', 'HEAD'])) return { behind: 0, ahead: 0 };
  const behind = git(repo, ['rev-list', '--count', `HEAD..${remote}`]);
  return { behind: behind === '' ? 1 : Number(behind), ahead: Number(git(repo, ['rev-list', '--count', `${remote}..HEAD`])) || 0, unknown: behind === '' };
}

function repoLine(name, repo, ok, warn) {
  const s = vsGitHub(repo);
  if (!s) warn.push(`${name}: stanje prema GitHubu se ne zna (mreža ili origin)`);
  else if (s.behind) warn.push(`${name} je iza GitHuba${s.unknown ? '' : ` (${s.behind})`}: git -C "${repo}" pull --ff-only`);
  else if (s.ahead) warn.push(`${name} ima ${s.ahead} commita koji nisu na GitHubu: git -C "${repo}" push`);
  else ok.push(`${name} je isti kao na GitHubu`);
}

// Lični sloj: ~/.claude/CLAUDE.md uvozi claude-licno, a repo postoji i nije iza GitHuba.
function personalLines(ok, warn) {
  const repo = personal.personalRepo();
  let md = '';
  try { md = fs.readFileSync(path.join(CLAUDE_HOME, 'CLAUDE.md'), 'utf8'); } catch { /* nema fajla */ }
  if (/^@.*claude-licno[\\/]GLOBALNO\.md\s*$/m.test(md)) ok.push('~/.claude/CLAUDE.md uvozi claude-licno');
  else warn.push('~/.claude/CLAUDE.md ne uvozi claude-licno (README u claude-licno → postavljanje na novom računaru)');
  if (fs.existsSync(path.join(repo, '.git'))) repoLine('claude-licno', repo, ok, warn);
  else warn.push(`lični repo nije kloniran u ${repo}: gh repo clone vvladimirv/claude-licno "${repo}"`);
  const plugins = personal.pluginsRepo();
  if (fs.existsSync(path.join(plugins, '.git'))) repoLine('claude-plugins', plugins, ok, warn);
}

// Unosi iz pravila.log u zadnjih `days` dana (jedan unos = linija sa datumom; stack ispod se preskače).
function logEntries(text, now, days = 7) {
  return text.split(/\r?\n/).map((l) => l.match(ENTRY)).filter(Boolean)
    .map((m) => ({ at: Date.parse(m[1]), where: m[2], msg: m[3] }))
    .filter((e) => now - e.at <= days * DAY);
}

function report({ root, now = Date.now() } = {}) {
  const ok = [];
  const warn = [];
  const node = process.versions.node.split('.').map(Number);
  (node[0] >= 18 ? ok : warn).push(`Node ${process.version}${node[0] >= 18 ? '' : ' (treba 18 ili noviji)'}`);
  const gitV = tool('git', ['--version']);
  (gitV ? ok : warn).push(gitV || 'git nije instaliran (hookovi i commitovi ga trebaju)');
  if (!tool('gh', ['--version'])) warn.push('GitHub CLI (`gh`) nije instaliran: PR-ovi i `/codex-worktree spoji` rade lokalno');

  // autoUpdate je u settings.json (ručno, po README-u) ili u plugins/known_marketplaces.json (uključen iz aplikacije).
  const settings = readJson(path.join(CLAUDE_HOME, 'settings.json'), {});
  const known = readJson(path.join(CLAUDE_HOME, 'plugins', 'known_marketplaces.json'), {});
  const auto = [((settings.extraKnownMarketplaces || {})['moji-pluginsi']), known['moji-pluginsi']].some((m) => m && m.autoUpdate);
  const localSource = known['moji-pluginsi']?.source?.source === 'directory';
  if (localSource) ok.push('lokalni izvor plugina: ažuriranje kroz git pull i setup');
  else if (auto) ok.push('auto-update plugina uključen');
  else warn.push('auto-update nije uključen za udaljeni izvor: README → Instalacija');
  pluginLines(settings, ok, warn);
  personalLines(ok, warn);

  let entries = [];
  try {
    entries = logEntries(fs.readFileSync(path.join(CLAUDE_HOME, 'pravila.log'), 'utf8'), now);
  } catch {
    // nema loga = nema grešaka
  }
  const slow = entries.filter((e) => e.where.includes('/sporo/'));
  const errors = entries.filter((e) => !e.where.includes('/sporo/'));
  if (errors.length) {
    const last = errors.slice(-3).map((e) => `  - ${e.where}: ${e.msg.slice(0, 140)}`).join('\n');
    warn.push(`${errors.length} grešaka hookova u zadnjih 7 dana (~/.claude/pravila.log), zadnje:\n${last}`);
  } else {
    ok.push('hookovi bez grešaka u zadnjih 7 dana');
  }
  if (slow.length) {
    const max = Math.max(...slow.map((e) => parseInt(e.msg, 10) || 0));
    warn.push(`${slow.length} sporih poziva hookova (> 200 ms, najsporiji ${max} ms) u zadnjih 7 dana`);
  }

  const roots = kickstartRoots();
  const missing = roots.filter((r) => !fs.existsSync(r));
  if (missing.length) warn.push(`korijen projekata ne postoji: ${missing.join(', ')} (~/.claude/kickstart-korijeni.txt)`);
  else ok.push(`korijen projekata: ${roots.join(', ')}`);
  if (fs.existsSync(path.join(roots[0], 'ideje', '.git'))) ok.push('lista ideja klonirana');
  else warn.push(`lista ideja nije klonirana u ${path.join(roots[0], 'ideje')} (README → Podešavanje po računaru)`);

  if (isPaused(now)) warn.push('blokirajuća pravila su pauzirana (`/pravila-pauza stop` ih vraća)');

  if (root && fs.existsSync(path.join(root, '.githooks'))) {
    const hp = git(root, ['config', '--get', 'core.hooksPath']);
    if (hp === '.githooks') ok.push(`git hookovi uključeni u ${path.basename(root)}`);
    else warn.push(`git hookovi nisu uključeni u ${path.basename(root)}: \`git config core.hooksPath .githooks\``);
  }
  if (root && !fs.existsSync(path.join(root, '.githooks')) && fs.existsSync(path.join(root, '.git'))) {
    warn.push('projekat nema .githooks/: nije potvrđena lokalna Git kontrola prije commita');
  }
  for (const item of require('./lib/runtime-status').inspect(CLAUDE_HOME, now)) {
    if (item.fresh) ok.push(`${item.runtime}: zabilježeno izvršavanje guarda ${item.version}; nije dokaz pokrivenosti svih alata`);
    else warn.push(`${item.runtime}: ${item.observed ? 'staro izvršavanje hooka' : 'nema zabilježenog izvršavanja hooka'}; provjerite učitavanje i povjerenje u novom chatu`);
  }
  const codexHome = process.env.CODEX_HOME || path.join(require('os').homedir(), '.codex');
  if (!fs.existsSync(path.join(codexHome, 'hooks.json'))) warn.push('Codex nema korisnički registar hookova: u zajedničkom repozitoriju pokrenite node scripts/setup.js --apply --codex');
  if (root && fs.existsSync(path.join(root, '.agent-checks.json'))) {
    const verified = require('../scripts/checks').verify(root);
    (verified.ok ? ok : warn).push(verified.message);
  }
  return { ok, warn };
}

function format({ ok, warn }) {
  return [...ok.map((l) => `✅ ${l}`), ...warn.map((l) => `⚠️ ${l}`)].join('\n');
}

if (require.main === module) {
  const i = process.argv.indexOf('--root');
  console.log(format(report({ root: i > 0 ? path.resolve(process.argv[i + 1]) : null })));
}

module.exports = { report, format, logEntries };
