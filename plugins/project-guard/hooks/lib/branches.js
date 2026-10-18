// Opis grana: šta je koja grana (baza, zadatak, šta čeka, preporučen model). Hook ga upisuje sam
// (nova grana, start sesije), a pregled svih grana je u branch-map.js.
// Opis je u git konfiguraciji (branch.<x>.base/zadatak/ceka/model/effort): dijele je svi worktreeovi,
// ne commituje se, a brisanje grane briše i njega.

const fs = require('fs');
const path = require('path');
const { git, isGitRepo } = require('./common');

const FIELDS = ['base', 'zadatak', 'ceka', 'model', 'effort'];
const MANY_DONE = 3;

const MODELS = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };
const EFFORTS = { low: 'nizak', medium: 'srednji', high: 'visok' };

// Ista pravila kao „Preporuka modela" u skillovima grane i kraj-sesije (i „Koji model za šta" u podsjetniku).
const HEAVY = /arhitekt|refaktor|istraž|istraz|analiz|\bplan|odluk|migrac|sigurnost|težak bug|tezak bug|teški bug|teski bug/i;
const LIGHT = /status|dokumentac|\bdocs?\b|pravopis|dijakriti|\btekst|readme|changelog|čišćenj|ciscenj|počisti|pocisti/i;

function recommend(text) {
  const t = String(text || '');
  if (HEAVY.test(t)) return { model: 'opus', effort: 'high' };
  if (LIGHT.test(t)) return { model: 'haiku', effort: 'low' };
  return { model: 'sonnet', effort: 'medium' };
}

function label(rec) {
  return `${MODELS[rec.model] || rec.model}/${EFFORTS[rec.effort] || rec.effort}`;
}

// Git fajlove čitamo direktno kad god može: svaki poziv gita na Windowsu traje ~150 ms, a ovo ide na startu sesije.
// U worktreeu je .git fajl koji pokazuje na njegov folder; grane i konfiguracija su u zajedničkom .git folderu.
function gitDirs(root) {
  const p = path.join(root, '.git');
  const gitDir = fs.statSync(p).isFile() ? path.resolve(root, fs.readFileSync(p, 'utf8').replace(/^gitdir:\s*/, '').trim()) : p;
  const cd = path.join(gitDir, 'commondir');
  return { gitDir, common: fs.existsSync(cd) ? path.resolve(gitDir, fs.readFileSync(cd, 'utf8').trim()) : gitDir };
}

// Commit na koji pokazuje ref (npr. `refs/heads/main`, `HEAD`); '' ako ga nema.
function readRef(dirs, ref, depth = 0) {
  for (const d of [dirs.gitDir, dirs.common]) {
    try {
      const v = fs.readFileSync(path.join(d, ...ref.split('/')), 'utf8').trim();
      return v.startsWith('ref: ') ? (depth < 5 ? readRef(dirs, v.slice(5), depth + 1) : '') : v;
    } catch {
      // nema slobodnog fajla: traži u packed-refs
    }
  }
  try {
    const line = fs.readFileSync(path.join(dirs.common, 'packed-refs'), 'utf8').split(/\r?\n/).find((l) => l.endsWith(' ' + ref));
    return line ? line.split(' ')[0] : '';
  } catch {
    return '';
  }
}

function currentBranch(root) {
  try {
    const h = fs.readFileSync(path.join(gitDirs(root).gitDir, 'HEAD'), 'utf8').trim();
    return h.startsWith('ref: refs/heads/') ? h.slice(16) : '';
  } catch {
    return '';
  }
}

// `HEAD`, `origin/<x>` ili lokalna grana.
function tipOf(root, name) {
  try {
    const ref = name === 'HEAD' ? 'HEAD' : name.startsWith('origin/') ? `refs/remotes/${name}` : `refs/heads/${name}`;
    return readRef(gitDirs(root), ref);
  } catch {
    return '';
  }
}

function branchExists(root, b) {
  return Boolean(b) && tipOf(root, b) !== '';
}

// Glavna grana: ona na koju pokazuje origin/HEAD, inače main ili master.
function defaultBranch(root) {
  try {
    const h = fs.readFileSync(path.join(gitDirs(root).common, 'refs', 'remotes', 'origin', 'HEAD'), 'utf8').trim();
    if (h.startsWith('ref: refs/remotes/origin/')) return h.slice(25);
  } catch {
    // nema origin/HEAD
  }
  for (const b of ['main', 'master']) if (branchExists(root, b)) return b;
  return currentBranch(root) || 'main';
}

// Vrijednost iz git konfiguracije: navodnici, escape znakovi i komentar na kraju linije.
function configValue(raw) {
  let out = '';
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const n = raw[++i];
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
    } else if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '#' || c === ';')) break;
    else out += c;
  }
  return out.trim();
}

// Svi opisi grana iz .git/config: { grana: { base, zadatak, … } }. Upisuje ih git (writeMeta).
function allMeta(root) {
  const out = {};
  let text;
  try {
    text = fs.readFileSync(path.join(gitDirs(root).common, 'config'), 'utf8');
  } catch {
    return out;
  }
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const sec = line.match(/^\s*\[\s*([^\s\]"]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]/);
    if (sec) {
      cur = sec[1].toLowerCase() === 'branch' && sec[2] !== undefined ? sec[2].replace(/\\(.)/g, '$1') : null;
      continue;
    }
    const kv = cur && line.match(/^\s*([A-Za-z][\w-]*)\s*(?:=\s*(.*))?$/);
    if (kv && FIELDS.includes(kv[1].toLowerCase())) (out[cur] = out[cur] || {})[kv[1].toLowerCase()] = configValue(kv[2] || '');
  }
  return out;
}

function readMeta(root, branch) {
  return allMeta(root)[branch] || {};
}

// Prazna vrijednost briše polje.
function writeMeta(root, branch, fields) {
  for (const [k, v] of Object.entries(fields)) {
    if (!FIELDS.includes(k) || v === undefined || v === null) continue;
    if (v === '') git(root, ['config', '--unset', `branch.${branch}.${k}`]);
    else git(root, ['config', `branch.${branch}.${k}`, String(v)]);
  }
}

const unquote = (s) => s.replace(/^["']|["']$/g, '');

// Nova grana iz komande: `git switch -c X [od]`, `git checkout -b X [od]`, `git worktree add … -b X`.
const NEW_BRANCH = /\bgit\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)\s+)?(switch\s+(?:-c|-C|--create)|checkout\s+-[bB]|worktree\s+add\b[^;&|\n]*?\s-[bB])\s+("[^"]+"|'[^']+'|[^\s;&|]+)(?:\s+("[^"]+"|'[^']+'|[^\s;&|-][^\s;&|]*))?/i;

function parseNewBranch(cmd) {
  const m = String(cmd || '').match(NEW_BRANCH);
  if (!m) return null;
  const worktree = /^worktree/i.test(m[1]);
  // Kod worktree add iza imena grane je putanja, pa početnu tačku ne tražimo.
  const from = !worktree && m[3] ? unquote(m[3]).replace(/^origin\//, '') : null;
  return { branch: unquote(m[2]), worktree, from };
}

// PostToolUse: nova grana dobija bazu = grana iz koje je nastala (postojeći opis se ne prepisuje).
function recordNewBranch(input, root) {
  const t = input.tool_input || {};
  if (!isGitRepo(root) || !t.command) return null;
  const nb = parseNewBranch(t.command);
  if (!nb || !branchExists(root, nb.branch) || readMeta(root, nb.branch).base) return null;
  let base = nb.from && branchExists(root, nb.from) ? nb.from : null;
  if (!base) base = nb.worktree ? git(root, ['branch', '--show-current']) : git(root, ['rev-parse', '--abbrev-ref', '@{-1}']);
  if (base && base !== nb.branch && branchExists(root, base)) writeMeta(root, nb.branch, { base });
  return null;
}

function mergedInto(root, ref) {
  if (!tipOf(root, ref)) return [];
  return git(root, ['for-each-ref', '--merged', ref, 'refs/heads', '--format=%(refname:short)']).split('\n').filter(Boolean);
}

function modelId(model) {
  if (!model) return '';
  return String(typeof model === 'object' ? model.id || model.display_name || '' : model).toLowerCase();
}

function describe(branch, meta, model) {
  const parts = [`\`${branch}\``];
  if (meta.zadatak) parts.push(`zadatak: ${meta.zadatak}`);
  parts.push(`baza: ${meta.base ? '`' + meta.base + '`' : 'nepoznata'}`);
  if (meta.ceka) parts.push(`čeka: \`${meta.ceka}\``);
  const rec = meta.model ? { model: meta.model, effort: meta.effort || 'medium' } : meta.zadatak ? recommend(meta.zadatak) : null;
  if (rec) parts.push(`preporuka: ${label(rec)}`);
  let line = parts.join(' · ');
  const id = modelId(model);
  if (rec && id && MODELS[rec.model] && !id.includes(rec.model)) {
    line += `. Ova sesija radi na drugom modelu: predloži korisniku da u meniju modela izabere ${MODELS[rec.model]} `
      + `i effort ${EFFORTS[rec.effort] || rec.effort} (sesija sama sebi ne može promijeniti model).`;
  }
  return line;
}

// SessionStart: opis trenutne grane i broj gotovih grana, najviše dvije linije.
function sessionMessage(input, root) {
  if (!isGitRepo(root)) return null;
  const branch = currentBranch(root);
  const main = defaultBranch(root);
  const lines = [];
  if (branch && branch !== main) {
    const meta = readMeta(root, branch);
    // Tek napravljena grana (npr. worktree aplikacije) stoji na vrhu glavne: to joj je baza.
    if (!meta.base) {
      const head = tipOf(root, 'HEAD');
      if (head && (head === tipOf(root, main) || head === tipOf(root, `origin/${main}`))) {
        writeMeta(root, branch, { base: main });
        meta.base = main;
      }
    }
    if (meta.base || meta.zadatak || meta.ceka || meta.model) lines.push(describe(branch, meta, input.model));
  }
  const done = mergedInto(root, main).filter((b) => b !== main && b !== branch).length;
  if (done >= MANY_DONE) lines.push(`${done} grana je već spojeno u \`${main}\`: \`/grane\` pokaže sve grane i počisti gotove.`);
  return lines.length ? '## Grane\n' + lines.join('\n') : null;
}

module.exports = {
  FIELDS, MODELS, EFFORTS, recommend, label, allMeta, readMeta, writeMeta, gitDirs, currentBranch, branchExists, defaultBranch, tipOf, mergedInto,
  describe, parseNewBranch, recordNewBranch, sessionMessage,
};
