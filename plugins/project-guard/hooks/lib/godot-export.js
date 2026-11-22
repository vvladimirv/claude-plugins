// Godot izvoz: čita export_presets.cfg i javlja (1) test foldere koje exclude_filter ne pokriva i
// (2) podatke koji nisu resursi (npr. maps/*.txt) a nisu u include_filter, pa bi izvezena igra ostala bez njih.
// Okida se samo kad se mijenja export_presets.cfg, test folder ili fajl podataka u Godot projektu.

const fs = require('fs');
const path = require('path');
const { relToRoot, loadState, saveState } = require('./common');

const PRESETS = 'export_presets.cfg';
const TEST_DIR = /(^|\/)tests?\//i;
// Ekstenzije koje Godot ne uvozi kao resurs: bez include_filter ne ulaze u izvoz. csv je izostavljen
// jer ga Godot uvozi kao prevod, json jer ga Godot 4 uvozi kao resurs, md jer su to dokumenti.
const DATA_EXT = /\.(txt|xml|dat|bin|ini|yaml|yml|tsv)$/i;
const SKIP_DIRS = new Set(['.git', '.godot', '.import', 'addons', 'node_modules']);
const SKIP_FILES = new Set(['export_presets.cfg', 'project.godot', 'requirements.txt']);
// Licence i slični dokumenti (OFL.txt, LICENSE.txt, README.txt...) nisu podaci igre.
const DOC_FILE = /^(ofl|licen[sc]e|copying|copyright|notice|authors|credits|readme|changelog)([-_.].*)?$/i;
const MAX_ENTRIES = 20000;
const MAX_LISTED = 5;

// Godot poredi `res://<putanja>` sa uzorkom bez razlike u veličini slova; * i ? važe i preko '/'.
// Uzorak koji ne počinje sa `*` ni `res://` dobija prefiks `res://` (pretpostavka prema ponašanju Godota).
function patternRegex(p) {
  let pat = p.trim();
  if (!pat) return null;
  if (!pat.startsWith('res://') && !pat.startsWith('*')) pat = 'res://' + pat;
  const esc = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + esc + '$', 'i');
}

function filterList(value) {
  return (value || '').split(',').map(patternRegex).filter(Boolean);
}

function parsePresets(text) {
  const presets = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const sec = line.match(/^\[(.+)\]\s*$/);
    if (sec) {
      cur = /^preset\.\d+$/.test(sec[1]) ? { name: sec[1], include: [], exclude: [] } : null;
      if (cur) presets.push(cur);
      continue;
    }
    const kv = cur && line.match(/^(\w+)\s*=\s*(.*)$/);
    if (!kv) continue;
    const val = kv[2].trim().replace(/^"(.*)"$/, '$1');
    if (kv[1] === 'name') cur.name = val;
    else if (kv[1] === 'include_filter') cur.include = filterList(val);
    else if (kv[1] === 'exclude_filter') cur.exclude = filterList(val);
  }
  return presets;
}

const hit = (list, rel) => list.some((re) => re.test('res://' + rel));

// Folder sa `.gdignore` Godot ne vidi, pa ga preskačemo (npr. android/build).
function walk(dir, base = '', out = []) {
  if (fs.existsSync(path.join(dir, '.gdignore'))) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (out.length > MAX_ENTRIES) break;
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel, out);
    else out.push(rel);
  }
  return out;
}

// Folder sa project.godot iznad datog fajla (u granicama korijena projekta), ili null.
function godotDir(abs, root) {
  let d = path.dirname(abs);
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'project.godot'))) return d;
    const up = path.dirname(d);
    if (up === d || !relToRoot(up, root) && up !== root) break;
    d = up;
  }
  return null;
}

function analyze(gameDir) {
  const cfg = path.join(gameDir, PRESETS);
  if (!fs.existsSync(cfg)) return [];
  const presets = parsePresets(fs.readFileSync(cfg, 'utf8'));
  const files = walk(gameDir);
  const testFiles = files.filter((f) => TEST_DIR.test(f));
  const data = files.filter((f) => DATA_EXT.test(f) && !TEST_DIR.test(f) && !SKIP_FILES.has(path.basename(f).toLowerCase()) && !DOC_FILE.test(path.basename(f)));
  const notes = [];
  for (const p of presets) {
    const testDirs = [...new Set(testFiles.filter((f) => !hit(p.exclude, f)).map((f) => f.replace(/\/[^/]*$/, '')))];
    const missing = data.filter((f) => !hit(p.include, f) && !hit(p.exclude, f));
    const dataDirs = [...new Set(missing.map(suggest))];
    if (testDirs.length) notes.push({ key: `t|${p.name}|${testDirs.join(',')}`, text: `preset „${p.name}“: test folder nije u exclude_filter (${list(testDirs)}); testovi ulaze u izvoz. Dovoljan je jedan uzorak, npr. \`*/test/*\`.` });
    if (dataDirs.length) notes.push({ key: `d|${p.name}|${dataDirs.join(',')}`, text: `preset „${p.name}“: podaci koji nisu resursi nisu u include_filter (${list(dataDirs)}); izvezena igra ih neće imati.` });
  }
  return notes;
}

// Uzorak za include_filter koji bi pokrio fajl: folder/*.ekstenzija.
function suggest(f) {
  const ext = '*.' + f.split('.').pop();
  return f.includes('/') ? f.slice(0, f.lastIndexOf('/') + 1) + ext : ext;
}

function list(a) {
  return a.slice(0, MAX_LISTED).map((x) => '`' + x + '`').join(', ') + (a.length > MAX_LISTED ? ` i još ${a.length - MAX_LISTED}` : '');
}

function postCheck(input, root) {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') return null;
  const t = input.tool_input || {};
  const rel = relToRoot(t.file_path, root);
  if (!rel) return null;
  const base = path.basename(rel).toLowerCase();
  const relevant = base === PRESETS || TEST_DIR.test(rel) || DATA_EXT.test(rel);
  if (!relevant || SKIP_DIRS.has(rel.split('/')[0])) return null;
  const abs = path.resolve(root, rel);
  const dir = godotDir(abs, root);
  if (!dir) return null;
  const notes = analyze(dir);
  if (!notes.length) return null;
  const state = loadState('godot-export', input.session_id);
  const seen = new Set(state[root] || []);
  const fresh = notes.filter((n) => !seen.has(n.key));
  if (!fresh.length) return null;
  state[root] = [...seen, ...fresh.map((n) => n.key)];
  saveState('godot-export', input.session_id, state);
  return '📦 Godot izvoz (' + path.relative(root, path.join(dir, PRESETS)).split(path.sep).join('/') + '):\n- '
    + fresh.map((n) => n.text).join('\n- ');
}

module.exports = { postCheck, parsePresets, analyze, patternRegex };
