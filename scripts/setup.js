// Bez --apply samo ispisuje plan. Koristi javni Claude CLI; ne prepisuje settings.json.
// Codex se više ne koristi (2026-11-28); --claude se i dalje prihvata radi starih uputstava.
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const names = ['project-guard', 'project-kickstart', 'project-memory', 'project-quality', 'project-market', 'radni-stol'];

function operations(source = root) {
  const result = [['claude', ['plugin', 'marketplace', 'add', source, '--scope', 'user']]];
  for (const name of names) {
    result.push(['claude', ['plugin', 'install', name + '@moji-pluginsi', '--scope', 'user']]);
    result.push(['claude', ['plugin', 'update', name + '@moji-pluginsi', '--scope', 'user']]);
  }
  return result;
}

function main(args) {
  for (const [cmd, params] of operations()) {
    console.log(cmd + ' ' + params.map(s => JSON.stringify(s)).join(' '));
    if (args.includes('--apply')) {
      const result = spawnSync(cmd, params, { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 120000 });
      if (result.error || result.status !== 0) throw new Error('Instalacija nije završena: ' + cmd + ' ' + params.join(' '));
    }
  }
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
  console.log(args.includes('--apply')
    ? 'Paketi su osvježeni. Otvorite novi chat.'
    : 'Ovo je plan. --apply izvršava instalaciju za korisnika. Projektne instalacije se ne brišu.');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { operations };
