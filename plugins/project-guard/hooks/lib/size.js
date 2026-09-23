// Granice koda: monolit ne smije rasti preko limita, a boje žive samo u fajlu tokena.

const fs = require('fs');
const path = require('path');
const { relToRoot, limits, countLines, globToRegex } = require('./common');

const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|cs|php|vue|svelte|html?|css|scss|sass|less|sh|ps1|swift|dart|c|cc|cpp|h|hpp|lua)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|out|vendor|fixtures|coverage|__snapshots__|\.next|\.venv|venv|migrations)\/|\.min\.|generated/i;
const STYLE_EXT = /\.(css|scss|sass|less|jsx|tsx|vue|svelte|html?)$/i;
const TOKEN_FILE = /token|theme|variables|palette/i;
const HARDCODED_COLOR = /(color|background|border|fill|stroke|shadow|outline)[\w-]*\s*[:=]\s*[^;{}\n]*?(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|rgba?\(|hsla?\()/i;

function target(input, root) {
  const t = input.tool_input || {};
  const rel = relToRoot(t.file_path, root);
  if (rel === null || !CODE_EXT.test(rel) || SKIP.test(rel)) return null;
  const lim = limits(root);
  if (lim.iskljuci.some((g) => globToRegex(g).test(rel))) return null;
  return { rel, abs: path.resolve(root, t.file_path), lim, t };
}

function currentLines(abs) {
  try {
    return countLines(fs.readFileSync(abs, 'utf8'));
  } catch {
    return 0;
  }
}

function projectedLines(input, cur) {
  const t = input.tool_input || {};
  if (input.tool_name === 'Write') return countLines(t.content || '');
  if (input.tool_name === 'Edit') return cur - countLines(t.old_string || '') + countLines(t.new_string || '');
  return cur;
}

// PreToolUse: blokira samo ako fajl prelazi maks I raste (stari monoliti se smiju smanjivati).
function preCheck(input, root) {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') return null;
  const tg = target(input, root);
  if (!tg) return null;
  const cur = currentLines(tg.abs);
  const next = projectedLines(input, cur);
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
  const now = currentLines(tg.abs);
  const t = tg.t;
  const before = input.tool_name === 'Edit' ? now - countLines(t.new_string || '') + countLines(t.old_string || '') : 0;
  if (now > tg.lim.upozorenje && now > before) {
    notes.push(`📏 \`${tg.rel}\` ima ${now} linija (upozorenje od ${tg.lim.upozorenje}, maks ${tg.lim.maks}). Planiraj podjelu prije sljedećeg dodavanja.`);
  }
  const added = input.tool_name === 'Write' ? t.content : t.new_string;
  if (STYLE_EXT.test(tg.rel) && !TOKEN_FILE.test(path.basename(tg.rel))
    && fs.existsSync(path.join(root, 'docs', 'DIZAJN-SISTEM.md')) && HARDCODED_COLOR.test(added || '')) {
    notes.push(`🎨 \`${tg.rel}\`: hardkodovana boja. Koristi token iz fajla tokena (docs/DIZAJN-SISTEM.md); ako token ne postoji, prvo ga dodaj tamo.`);
  }
  return notes.length ? notes.join('\n') : null;
}

module.exports = { preCheck, postCheck, projectedLines, HARDCODED_COLOR };
