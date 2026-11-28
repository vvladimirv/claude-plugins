// Lični sloj na računaru: `claude-licno` (globalna pravila, činjenice o računaru, znanje) i lokalni izvor pluginova
// (`claude-plugins`). Na startu sesije, najviše jednom u 10 minuta, čist repo se povuče sa GitHuba (samo fast-forward,
// pa se ništa ne može izgubiti). Kad su pluginovi u izvoru noviji od instaliranih, jedna linija kaže da treba setup.
// Putanje nisu fiksne: korijen projekata iz kickstart-korijeni.txt (inače C:\dev), a izvor pluginova iz
// marketplacea `moji-pluginsi` kad je lokalni folder. Cloud sesiju preskače (tamo radi selfupdate).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CLAUDE_HOME, git, readJson, kickstartRoots, loadState, saveState } = require('./common');

const PULL_EVERY_MS = 10 * 60 * 1000;
const FETCH_MS = 4000;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
const MARKET = 'moji-pluginsi';

function personalRepo() {
  return path.join(kickstartRoots()[0], 'claude-licno');
}

function pluginsRepo() {
  const src = readJson(path.join(CLAUDE_HOME, 'plugins', 'known_marketplaces.json'), {})[MARKET]?.source;
  if (src && src.source === 'directory' && src.path) return src.path;
  return path.join(kickstartRoots()[0], 'claude-plugins');
}

const isRepo = (dir) => fs.existsSync(path.join(dir, '.git'));

// Stanje repoa poslije pokušaja povlačenja: { pulled, ahead, dirty, noUpstream }.
function pullFastForward(repo) {
  const state = { pulled: 0, ahead: 0, dirty: false, noUpstream: false };
  if (git(repo, ['status', '--porcelain', '--untracked-files=no']) !== '') state.dirty = true;
  if (!git(repo, ['rev-parse', '--abbrev-ref', '@{u}'])) {
    state.noUpstream = true;
    return state;
  }
  try {
    execFileSync('git', ['fetch', '--quiet'], { cwd: repo, timeout: FETCH_MS, stdio: 'ignore', env: GIT_ENV, windowsHide: true });
  } catch {
    // bez mreže: radi sa onim što je zadnji fetch donio
  }
  state.ahead = Number(git(repo, ['rev-list', '--count', '@{u}..HEAD'])) || 0;
  const behind = Number(git(repo, ['rev-list', '--count', 'HEAD..@{u}'])) || 0;
  if (!behind || state.ahead || state.dirty) return state;
  try {
    execFileSync('git', ['merge', '--ff-only', '--quiet', '@{u}'], { cwd: repo, timeout: 3000, stdio: 'ignore', env: GIT_ENV, windowsHide: true });
    state.pulled = behind;
  } catch {
    // npr. neprateni fajl bi bio prepisan: ostavi korisniku
  }
  return state;
}

// Pluginovi iz izvora (marketplace.json na grani main) čija se verzija razlikuje od instalirane.
function outdatedPlugins(repo) {
  if (git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') return [];
  const market = readJson(path.join(repo, '.claude-plugin', 'marketplace.json'), { plugins: [] });
  const installed = readJson(path.join(CLAUDE_HOME, 'plugins', 'installed_plugins.json'), { plugins: {} }).plugins || {};
  const out = [];
  for (const p of market.plugins || []) {
    const entry = (installed[`${p.name}@${MARKET}`] || [])[0];
    if (entry && entry.version !== p.version) out.push(`${p.name} ${entry.version} → ${p.version}`);
  }
  return out;
}

function describe(name, repo, s) {
  const lines = [];
  if (s.pulled) lines.push(`🔄 \`${name}\` je povučen sa GitHuba (${s.pulled} ${s.pulled === 1 ? 'commit' : 'commita'}).`);
  if (s.ahead) lines.push(`⚠️ \`${name}\` ima ${s.ahead} ${s.ahead === 1 ? 'commit' : 'commita'} koji nisu na GitHubu, pa ih drugi računar ne vidi: \`git -C "${repo}" push\`.`);
  return lines;
}

function sessionMessage(input, env = process.env, now = Date.now()) {
  if (env.CLAUDE_CODE_REMOTE === 'true') return null;
  if (input.source && input.source !== 'startup' && input.source !== 'resume') return null;
  const lines = [];
  const state = loadState('licni-sloj', 'racunar');
  if (!state.at || now - state.at > PULL_EVERY_MS) {
    state.at = now;
    saveState('licni-sloj', 'racunar', state);
    const personal = personalRepo();
    if (isRepo(personal)) {
      const s = pullFastForward(personal);
      lines.push(...describe('claude-licno', personal, s));
      if (s.pulled) lines.push('Nova globalna pravila važe od sljedeće sesije.');
    }
    const plugins = pluginsRepo();
    if (isRepo(plugins)) lines.push(...describe('claude-plugins', plugins, pullFastForward(plugins)));
  }
  const plugins = pluginsRepo();
  const outdated = isRepo(plugins) ? outdatedPlugins(plugins) : [];
  if (outdated.length) {
    lines.push(`📦 Pluginovi u izvoru su noviji od instaliranih (${outdated.join(', ')}). Predloži korisniku: \`node scripts/setup.js --apply\` u \`${plugins}\`, pa nova sesija.`);
  }
  return lines.length ? '## Lični sloj\n' + lines.join('\n') + '\nKorisniku to reci jednom rečenicom.' : null;
}

module.exports = { sessionMessage, personalRepo, pluginsRepo, pullFastForward, outdatedPlugins, PULL_EVERY_MS };
