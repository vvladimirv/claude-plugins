// Claude manifesti ostaju izvor verzije; Codex katalozi se generišu, ne održavaju ručno.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
function save(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
for (const entry of catalog.plugins) {
  const dir = path.join(root, entry.source);
  const own = JSON.parse(fs.readFileSync(path.join(dir, '.claude-plugin/plugin.json'), 'utf8'));
  const hooks = fs.existsSync(path.join(dir, 'hooks/hooks.json'));
  save(path.join(dir, 'plugin.json'), {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...own,
    ...(hooks ? { extensions: { 'com.openai': { hooks: [] } } } : {})
  });
  save(path.join(dir, '.codex-plugin/plugin.json'), { ...own, skills: './skills/', ...(hooks ? { hooks: [] } : {}) });
}
save(path.join(root, '.agents/plugins/marketplace.json'), {
  name: catalog.name, interface: { displayName: 'Moji plugini — Claude i Codex' },
  plugins: catalog.plugins.map(entry => ({ name: entry.name,
    source: { source: 'local', path: entry.source }, category: 'Productivity',
    policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' } }))
});
