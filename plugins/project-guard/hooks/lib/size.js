// Granice koda: monolit ne smije rasti preko limita, a boje žive samo u fajlu tokena.

const fs = require('fs');
const path = require('path');
const { relToRoot, limits, countLines, globToRegex } = require('./common');

const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|cs|php|vue|svelte|html?|css|scss|sass|less|sh|ps1|swift|dart|c|cc|cpp|h|hpp|lua|gd|gdshader)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|out|vendor|fixtures|coverage|__snapshots__|\.next|\.venv|venv|migrations|\.godot)\/|\.min\.|generated/i;
// Treći dodaci Godot projekta (game/addons/...) nisu naš kod, pa ih ne mjerimo ni ne provjeravamo.
const GODOT_ADDONS = /(^|\/)addons\/.*\.(gd|gdshader)$/i;
const STYLE_EXT = /\.(css|scss|sass|less|jsx|tsx|vue|svelte|html?)$/i;
// `*_colors.gd`, `colors.css`: fajl palete je izvor boja kao i fajl tokena (`color_goals.gd` nije).
const TOKEN_FILE = /token|theme|variables|palette|colou?rs(\.|$)/i;
// Mockup i prototip namjerno predlažu nove boje (prijedlog tokena), pa tu nema upozorenja na boju.
const MOCKUP_DIR = /(^|\/)(mockupi?|mockups?|prototipi?|prototypes?)\//i;
// GDScript: boja iz brojeva ili teksta (Color(1, 0, 0), Color("#f00"), Color8(...), Color.html("#f00")).
// Ne ulaze: Color(Tokens.X, 0.5) i Color.WHITE (varijanta tokena, ime boje), crna i bijela sa ili bez
// alfe (Color(0, 0, 0, 0) providno, Color(1, 1, 1, 0.3) odsjaj) i Color.from_hsv(c.h, ...) iz postojeće boje.
const GD_COLOR_CALL = /\b(Color8?|Color\.(?:html|from_string|from_hsv|from_ok_hsl|from_rgba8))\s*\(/g;
const GD_LITERAL = /^\s*(?:["'#]|-?\.?\d)/;
// Testovi i alati projekta (game/tools/: fixture, mjerenja) nisu UI igre.
const GD_TEST = /(^|\/)(tests?|testovi|tools)\/|(^|\/)test_[^/]*\.gd$|_test\.gd$/i;

// Argumenti poziva do zagrade koja ga zatvara (podržava ugniježđene zagrade).
function callArgs(line, from) {
  let depth = 1;
  for (let i = from; i < line.length; i++) {
    if (line[i] === '(') depth++;
    else if (line[i] === ')' && --depth === 0) return line.slice(from, i);
  }
  return line.slice(from);
}

function isNeutral(fn, args) {
  if (fn !== 'Color' && fn !== 'Color8') return false;
  const rgb = args.split(',').slice(0, 3).map((x) => x.trim());
  if (rgb.length !== 3 || !rgb.every((x) => /^-?\d*\.?\d+$/.test(x))) return false;
  const v = rgb.map(Number);
  const max = fn === 'Color8' ? 255 : 1;
  return (v.every((x) => x === 0) || v.every((x) => x === max));
}

function gdHardcodedColor(line) {
  if (/^\s*#/.test(line)) return false;
  for (const m of line.matchAll(GD_COLOR_CALL)) {
    const args = callArgs(line, m.index + m[0].length);
    if (GD_LITERAL.test(args) && !isNeutral(m[1], args)) return true;
  }
  return false;
}
const HARDCODED_COLOR = /(color|background|border|fill|stroke|shadow|outline)[\w-]*\s*[:=]\s*[^;{}\n]*?(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|rgba?\(|hsla?\()/i;

function target(input, root) {
  const t = input.tool_input || {};
  const rel = relToRoot(t.file_path, root);
  if (rel === null || !CODE_EXT.test(rel) || SKIP.test(rel) || GODOT_ADDONS.test(rel)) return null;
  const lim = limits(root);
  if (lim.iskljuci.some((g) => globToRegex(g).test(rel))) return null;
  return { rel, abs: path.resolve(root, t.file_path), lim, t };
}

function readText(abs) {
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return '';
  }
}

function occurrences(text, s) {
  return s ? text.split(s).length - 1 : 0;
}

// Razlika u linijama za jednu zamjenu: "a\nb" → "a" je -1 (broje se novi redovi, ne linije).
function lineDelta(t) {
  return occurrences(t.new_string || '', '\n') - occurrences(t.old_string || '', '\n');
}

// text = sadržaj fajla prije izmjene (replace_all mijenja svako pojavljivanje).
function projectedLines(input, cur, text = '') {
  const t = input.tool_input || {};
  if (input.tool_name === 'Write') return countLines(t.content || '');
  if (input.tool_name === 'Edit') {
    const times = t.replace_all ? Math.max(1, occurrences(text, t.old_string)) : 1;
    return t.replace_all ? cur + times * lineDelta(t) : cur - countLines(t.old_string || '') + countLines(t.new_string || '');
  }
  return cur;
}

// PreToolUse: blokira samo ako fajl prelazi maks I raste (stari monoliti se smiju smanjivati).
function preCheck(input, root) {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') return null;
  const tg = target(input, root);
  if (!tg) return null;
  const text = readText(tg.abs);
  const cur = countLines(text);
  const next = projectedLines(input, cur, text);
  if (next <= tg.lim.maks || next <= cur) return null;
  return `📏 Limit fajla: \`${tg.rel}\` bi imao ${next} linija (maks ${tg.lim.maks}). `
    + 'Ne dodaj kod u ovaj fajl. Prvo ga podijeli po odgovornostima (vidi docs/PRAVILA-KODA.md), '
    + 'ili novi kod stavi u novi fajl u folderu te funkcije.';
}

// PostToolUse: upozorenja (ne blokiraju).
function postCheck(input, root) {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') return null;
  const tg = target(input, root);
  if (!tg) return null;
  const notes = [];
  const text = readText(tg.abs);
  const now = countLines(text);
  const t = tg.t;
  let before = 0;
  if (input.tool_name === 'Edit') {
    before = t.replace_all
      ? now - Math.max(1, occurrences(text, t.new_string)) * lineDelta(t)
      : now - countLines(t.new_string || '') + countLines(t.old_string || '');
  }
  if (input._patch?.action === 'Update' && !input._patch.move) {
    before = now - input._patch.lines.filter(l => l.startsWith('+')).length
      + input._patch.lines.filter(l => l.startsWith('-')).length;
  }
  if (now > tg.lim.upozorenje && now > before) {
    notes.push(`📏 \`${tg.rel}\` ima ${now} linija (upozorenje od ${tg.lim.upozorenje}, maks ${tg.lim.maks}). Planiraj podjelu prije sljedećeg dodavanja.`);
  }
  const added = input._patch ? input._patch.lines.filter(l => l.startsWith('+')).map(l => l.slice(1)).join('\n')
    : input.tool_name === 'Write' ? t.content : t.new_string;
  if (STYLE_EXT.test(tg.rel) && !TOKEN_FILE.test(path.basename(tg.rel)) && !MOCKUP_DIR.test(tg.rel)
    && fs.existsSync(path.join(root, 'docs', 'DIZAJN-SISTEM.md')) && HARDCODED_COLOR.test(added || '')) {
    notes.push(`🎨 \`${tg.rel}\`: hardkodovana boja. Koristi token iz fajla tokena (docs/DIZAJN-SISTEM.md); ako token ne postoji, prvo ga dodaj tamo.`);
  }
  // Pravilo "boje samo iz tokens.gd": GDScript van fajla tokena i van testova.
  if (/\.gd$/i.test(tg.rel) && !TOKEN_FILE.test(path.basename(tg.rel)) && !GD_TEST.test(tg.rel)
    && fs.existsSync(path.join(root, 'docs', 'DIZAJN-SISTEM.md'))
    && (added || '').split('\n').some(gdHardcodedColor)) {
    notes.push(`🎨 \`${tg.rel}\`: boja zadana brojevima ili tekstom (Color(...)). Koristi token iz tokens.gd (docs/DIZAJN-SISTEM.md); ako token ne postoji, prvo ga dodaj tamo.`);
  }
  return notes.length ? notes.join('\n') : null;
}

module.exports = { preCheck, postCheck, projectedLines, HARDCODED_COLOR, gdHardcodedColor };
