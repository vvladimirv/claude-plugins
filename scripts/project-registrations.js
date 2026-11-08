// Usklađuje samo postojeće registracije istog privatnog marketplacea. Tuđi izvori i aktivne brave se čuvaju.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const names = new Set(['project-guard', 'project-kickstart', 'project-memory', 'project-quality']);

function inspect(home, source, now = Date.now()) {
  const registry = path.join(home, 'plugins/installed_plugins.json');
  if (!fs.existsSync(registry)) return [];
  const roots = new Map();
  const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
  for (const [name, entries] of Object.entries(data.plugins || {})) {
    if (!name.endsWith('@moji-pluginsi') || !names.has(name.split('@')[0])) continue;
    for (const entry of entries) if (entry.scope === 'project' && entry.projectPath) {
      const root = path.resolve(entry.projectPath);
      if (!roots.has(root)) roots.set(root, new Set());
      roots.get(root).add(name);
    }
  }
  return [...roots].map(([root, plugins]) => {
    const file = path.join(root, '.claude/settings.json');
    if (!fs.existsSync(file)) return { root, skip: 'nema projektne konfiguracije' };
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    const origin = config.extraKnownMarketplaces?.['moji-pluginsi']?.source;
    const ours = origin?.source === 'github' && origin.repo === 'vvladimirv/claude-plugins';
    const local = origin?.source === 'directory' && path.resolve(origin.path || '') === path.resolve(source);
    if (!ours && !local) return { root, skip: 'poseban projektni izvor; sačuvan bez izmjene' };
    const lockFile = path.join(root, '.agent-lock.json');
    if (fs.existsSync(lockFile)) {
      try {
        const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        if (!Number.isFinite(Date.parse(lock.heartbeat)) || now - Date.parse(lock.heartbeat) < 1200000) {
          return { root, skip: 'aktivna ili nepoznata brava; sačuvano bez izmjene' };
        }
      } catch { return { root, skip: 'nečitljiva brava; sačuvano bez izmjene' }; }
    }
    return { root, file, operations: [
      ['plugin', 'marketplace', 'add', source, '--scope', 'project'],
      ...[...plugins].map(name => ['plugin', 'update', name, '--scope', 'project'])
    ] };
  });
}

function backup(home, item) {
  const dir = path.join(home, 'backups/universal-plugins');
  fs.mkdirSync(dir, { recursive: true });
  const name = crypto.createHash('sha256').update(item.root).digest('hex').slice(0, 12) + '-' + Date.now() + '.json';
  fs.copyFileSync(item.file, path.join(dir, name), fs.constants.COPYFILE_EXCL);
}
module.exports = { inspect, backup };
