// Bez --apply samo ispisuje plan. Koristi javne CLI-je; ne prepisuje config.toml ili settings.json.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const names = ['project-guard', 'project-kickstart', 'project-memory', 'project-quality'];

function operations(surface, source = root) {
  const result = [];
  if (surface === 'both' || surface === 'claude') {
    result.push(['claude', ['plugin', 'marketplace', 'add', source, '--scope', 'user']]);
    for (const name of names) {
      result.push(['claude', ['plugin', 'install', name + '@moji-pluginsi', '--scope', 'user']]);
      result.push(['claude', ['plugin', 'update', name + '@moji-pluginsi', '--scope', 'user']]);
    }
  }
  if (surface === 'both' || surface === 'codex') {
    result.push(['codex', ['plugin', 'marketplace', 'add', source]]);
    for (const name of names) result.push(['codex', ['plugin', 'add', name + '@moji-pluginsi', '--json']]);
  }
  return result;
}

function syncProfiles(home) {
  const source = path.join(root, 'plugins/project-kickstart/codex-agents');
  const target = path.join(home, 'agents');
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(source).filter(f => f.endsWith('.toml'))) {
    const dest = path.join(target, file), text = fs.readFileSync(path.join(source, file));
    if (fs.existsSync(dest) && !fs.readFileSync(dest).equals(text)) {
      fs.copyFileSync(dest, dest + '.backup-' + Date.now());
    }
    fs.writeFileSync(dest, text);
  }
}

function main(args) {
  const installed = [];
  const surface = args.includes('--claude') ? 'claude' : args.includes('--codex') ? 'codex' : 'both';
  for (const [cmd, params] of operations(surface)) {
    console.log(cmd + ' ' + params.map(s => JSON.stringify(s)).join(' '));
    if (args.includes('--apply')) {
      const jsonResult = cmd === 'codex' && params.includes('--json');
      const result = spawnSync(cmd, params, { cwd: root, stdio: jsonResult ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8', windowsHide: true, timeout: 120000 });
      if (result.error || result.status !== 0) throw new Error('Instalacija nije završena: ' + cmd + ' ' + params.join(' '));
      if (jsonResult) {
        const value = JSON.parse(result.stdout);
        if (!value.installedPath || !names.includes(value.name)) throw new Error('Codex nije vratio putanju instaliranog paketa.');
        installed.push(value);
        console.log(value.name + ' ' + value.version + ': ' + value.installedPath);
      }
    }
  }
  if (surface !== 'codex') {
    const home = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const registrations = require('./project-registrations');
    for (const item of registrations.inspect(home, root)) {
      if (item.skip) { console.log('Sačuvano: ' + item.root + ' — ' + item.skip); continue; }
      console.log('Projektna registracija: ' + item.root + ' (backup prije izmjene)');
      if (args.includes('--apply')) registrations.backup(home, item);
      for (const params of item.operations) {
        console.log('claude ' + params.map(s => JSON.stringify(s)).join(' '));
        if (args.includes('--apply')) {
          const result = spawnSync('claude', params, { cwd: item.root, stdio: 'inherit', windowsHide: true, timeout: 120000 });
          if (result.error || result.status !== 0) throw new Error('Projektna registracija nije završena: ' + item.root);
        }
      }
    }
  }
  if (surface !== 'claude') {
    console.log('Codex: korisnički hooks.json povezuje iste instalirane skripte; zapis povjerenja se ne mijenja.');
    if (args.includes('--apply')) {
      const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
      const result = require('./codex-hooks').register(home, installed);
      console.log(`Codex: registrovano ${result.count} hookova (${result.changed ? 'osvježeno' : 'bez izmjene'}).`);
      syncProfiles(home);
    }
  }
  console.log(args.includes('--apply')
    ? 'Paketi su osvježeni. Otvorite novi chat u oba alata. U Codexu pregledajte /hooks; instalacija ne odobrava hookove umjesto vas.'
    : 'Ovo je plan. --apply izvršava instalaciju za korisnika; --claude ili --codex ograničava alat. Projektne instalacije se ne brišu.');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { operations, syncProfiles };
