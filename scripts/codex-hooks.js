// Korisnički registar radi i kada CLI ne učita hookove iz plugina. Ne dira zapis povjerenja.
const fs = require('node:fs');
const path = require('node:path');
const PREFIX = 'moji-pluginsi managed hook: ';

function commandFor(file) {
  if (process.platform === 'win32') {
    if (/["$%`&|<>^!\r\n]/.test(file)) throw new Error('Putanja hooka sadrži nepodržane shell znakove.');
    return 'node "' + file.replace(/\\/g, '/') + '"';
  }
  return "node '" + file.replace(/'/g, "'\\''") + "'";
}

function register(home, installations) {
  const file = path.join(home, 'hooks.json');
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const doc = previous ? JSON.parse(previous) : { description: 'Korisnički hookovi za Claude/Codex zajedničke plugine.', hooks: {} };
  if (doc && typeof doc === 'object' && !Array.isArray(doc) && !Object.hasOwn(doc, 'hooks')) doc.hooks = {};
  if (!doc || typeof doc !== 'object' || !doc.hooks || Array.isArray(doc.hooks) || typeof doc.hooks !== 'object') {
    throw new Error('Postojeći hooks.json nema podržanu strukturu; sačuvan je bez izmjene.');
  }
  if (['project-guard', 'project-memory'].some(name => !installations.some(item => item.name === name))) {
    throw new Error('Nedostaje potvrđena instalacija oba hook paketa; prethodni registar je sačuvan.');
  }
  for (const [event, groups] of Object.entries(doc.hooks)) {
    if (!Array.isArray(groups) || groups.some(g => !Array.isArray(g.hooks))) throw new Error('Neispravne postojeće hook grupe.');
    doc.hooks[event] = groups.map(g => ({ ...g, hooks: g.hooks.filter(h => !h.statusMessage?.startsWith(PREFIX)) })).filter(g => g.hooks.length);
  }
  let count = 0;
  for (const item of installations) {
    if (!['project-guard', 'project-memory'].includes(item.name)) continue;
    const config = JSON.parse(fs.readFileSync(path.join(item.installedPath, 'hooks/hooks.json'), 'utf8'));
    for (const [event, groups] of Object.entries(config.hooks)) for (const group of groups) {
      const hooks = group.hooks.map(handler => {
        const match = handler.command?.match(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\n]+\.js)"$/);
        if (handler.type !== 'command' || !match) throw new Error('Nepodržana hook komanda u paketu ' + item.name);
        const script = path.resolve(item.installedPath, match[1]);
        const relative = path.relative(path.resolve(item.installedPath), script);
        if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(script)) throw new Error('Neispravna putanja skripte hooka.');
        return { ...handler, command: commandFor(script), statusMessage: PREFIX + item.name,
          ...(['SessionEnd', 'Interrupt'].includes(event) ? { timeout: Math.min(handler.timeout || 3, 3) } : {}) };
      });
      (doc.hooks[event] ||= []).push({ ...group, hooks });
      count += hooks.length;
    }
  }
  const text = JSON.stringify(doc, null, 2) + '\n';
  if (text === previous) return { changed: false, count };
  fs.mkdirSync(home, { recursive: true });
  if (previous !== null) fs.copyFileSync(file, file + '.backup-' + Date.now(), fs.constants.COPYFILE_EXCL);
  const temporary = file + '.tmp-' + process.pid;
  fs.writeFileSync(temporary, text);
  fs.renameSync(temporary, file);
  return { changed: true, count };
}
module.exports = { register, commandFor, PREFIX };
