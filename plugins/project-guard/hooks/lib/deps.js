// Nova zavisnost = ADR. Nakon izmjene manifesta ili install komande uporedi zavisnosti sa zadnjim
// commitom. Ako nova biblioteka nije spomenuta ni u jednom ADR-u, agent dobija podsjetnik.

const fs = require('fs');
const path = require('path');
const { relToRoot, git, loadState, saveState, noKickstart } = require('./common');

const MANIFEST = /(^|\/)(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|Cargo\.toml|pubspec\.yaml)$/i;
const ROOT_MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'pubspec.yaml'];
const INSTALL = /\b(npm|pnpm|yarn|bun)\s+(add|install|i)\s+[^-\s]|\b(pip3?|uv\s+pip)\s+install\s+[^-\s]|\b(poetry|uv)\s+add\b|\bcargo\s+add\b|\b(flutter|dart)\s+pub\s+add\b/i;

function tomlSection(text, header) {
  const m = text.match(new RegExp(`^\\[${header.replace(/[.[\]]/g, '\\$&')}\\]\\s*$([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, 'm'));
  return m ? m[1] : '';
}

function parse(file, text) {
  const base = path.basename(file).toLowerCase();
  const names = new Set();
  const add = (n) => n && names.add(n.trim().toLowerCase());
  if (!text) return names;
  if (base === 'package.json') {
    const j = JSON.parse(text);
    for (const k of ['dependencies', 'devDependencies', 'optionalDependencies']) Object.keys(j[k] || {}).forEach(add);
  } else if (base.startsWith('requirements')) {
    for (const l of text.split(/\r?\n/)) {
      if (/^\s*($|#|-)/.test(l)) continue;
      add(l.split(/[<>=!~;[\s]/)[0]);
    }
  } else if (base === 'pyproject.toml') {
    for (const block of text.matchAll(/dependencies\s*=\s*\[([\s\S]*?)\]/g)) {
      for (const s of block[1].matchAll(/["']([^"']+)["']/g)) add(s[1].split(/[<>=!~;[\s]/)[0]);
    }
    for (const l of tomlSection(text, 'tool.poetry.dependencies').split(/\r?\n/)) {
      const k = l.match(/^\s*([\w.-]+)\s*=/);
      if (k && k[1].toLowerCase() !== 'python') add(k[1]);
    }
  } else if (base === 'cargo.toml') {
    for (const sec of ['dependencies', 'dev-dependencies']) {
      for (const l of tomlSection(text, sec).split(/\r?\n/)) {
        const k = l.match(/^\s*([\w-]+)\s*=/);
        if (k) add(k[1]);
      }
    }
  } else if (base === 'pubspec.yaml') {
    // Bez YAML biblioteke: paket je ključ uvučen za 2 razmaka ispod `dependencies:` / `dev_dependencies:`.
    // `flutter:` i paketi sa `sdk: flutter` (flutter_test, flutter_localizations...) su dio SDK-a, ne biblioteke.
    let section = null;
    let last = null;
    for (const l of text.split(/\r?\n/)) {
      if (/^\s*(#|$)/.test(l)) continue;
      const top = l.match(/^([\w-]+):/);
      if (top) { section = /^(dev_)?dependencies$/.test(top[1]) ? top[1] : null; last = null; continue; }
      if (!section) continue;
      const pkg = l.match(/^ {2}([A-Za-z_][\w-]*):/);
      if (pkg) {
        last = /^(flutter|sdk)$/.test(pkg[1]) ? null : pkg[1];
        add(last);
      } else if (last && /^ {4}sdk:/.test(l)) {
        names.delete(last.toLowerCase());
        last = null;
      }
    }
  }
  return names;
}

function newDeps(root, rel) {
  const cur = fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
  const old = git(root, ['show', `HEAD:${rel}`]);
  if (!old) return []; // nov manifest = početni setup (ADR 0001)
  const before = parse(rel, old);
  return [...parse(rel, cur)].filter((d) => !before.has(d));
}

function adrText(root) {
  const dir = path.join(root, 'docs', 'adr');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n').toLowerCase();
}

function manifestsToCheck(input, root) {
  const t = input.tool_input || {};
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    const rel = relToRoot(t.file_path, root);
    return rel && MANIFEST.test(rel) && !rel.includes('node_modules/') ? [rel] : [];
  }
  if ((input.tool_name === 'Bash' || input.tool_name === 'PowerShell') && INSTALL.test(t.command || '')) {
    return ROOT_MANIFESTS.filter((m) => fs.existsSync(path.join(root, m)));
  }
  return [];
}

function postCheck(input, root) {
  if (!fs.existsSync(path.join(root, 'docs', 'adr'))) return null;
  const rels = manifestsToCheck(input, root);
  if (!rels.length) return null;
  const adr = adrText(root);
  const missing = [...new Set(rels.flatMap((rel) => newDeps(root, rel)))].filter((d) => !adr.includes(d));
  if (!missing.length) return null;

  const state = loadState('deps', input.session_id);
  const seen = new Set(state[root] || []);
  const fresh = missing.filter((d) => !seen.has(d));
  if (!fresh.length) return null;
  state[root] = [...seen, ...fresh];
  saveState('deps', input.session_id, state);
  // U projektu bez kickstarta /adr stane, pa odluka ide po pravilima projekta.
  const how = noKickstart(root) ? 'zapiši odluku po pravilima projekta (AGENTS.md/CLAUDE.md)' : 'napiši kratak ADR (`/adr`)';
  return `📦 Nova zavisnost bez ADR-a: ${fresh.join(', ')}. Prije nastavka ${how}: `
    + 'zašto baš ta biblioteka, koje su alternative i može li bez nje.';
}

module.exports = { postCheck, parse, INSTALL };
