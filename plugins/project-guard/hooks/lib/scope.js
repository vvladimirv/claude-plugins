// Čuvar obima: jedan projekat = jedna tema. Procjenu "je li u obimu" radi Claude;
// hook samo drži obim u kontekstu i mehanički hvata nove foldere koji nisu u planu.

const fs = require('fs');
const path = require('path');
const { relToRoot } = require('./common');

const CHANGE = /(^|[\s,.;:!?"'(])(dodaj|napravi|kreiraj|ubaci|implementiraj|izmijeni|promijeni|prepravi|obriš|izbriš|ukloni|popravi|refaktor|preimenuj|instaliraj|integriš|poveži|napiši|sredi|add|create|implement|build|make|write|change|remove|delete|fix|refactor|install|integrate)/i;
const STANDARD_TOP = new Set(['docs', '.claude', 'src', 'app', 'lib', 'tests', 'test', 'e2e', 'scripts', 'fixtures', 'public', 'static', 'assets', '.github', '.githooks']);

function readDoc(root, rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

function section(md, title) {
  const m = md.match(new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, 'im'));
  if (!m) return [];
  return m[1].split(/\r?\n/).map((l) => l.replace(/^\s*[-*]\s*/, '').trim()).filter((l) => l && !l.startsWith('<!--'));
}

function readScope(root) {
  const md = readDoc(root, 'docs/VIZIJA.md');
  if (!md) return null;
  const obim = section(md, 'Obim');
  if (!obim.length) return null;
  return { obim, van: section(md, 'Van obima') };
}

function sessionMessage(root) {
  const s = readScope(root);
  if (!s) return null;
  return '## Čuvar obima (docs/VIZIJA.md)\n'
    + `Obim: ${s.obim.join('; ')}\n`
    + (s.van.length ? `Van obima: ${s.van.join('; ')}\n` : '')
    + 'Pitanja i objašnjenja su uvijek slobodna. Zahtjev koji mijenja fajlove, a nije u obimu: ne kreći u rad, nego pitaj za vezu '
    + 'i ponudi: (1) povezano je → nastavi; (2) proširenje obima → prvo VIZIJA.md + ADR; (3) nova tema → `/novi-projekat`; '
    + '(4) samo zapamti → `/ideja`. Ako korisnik kaže "svjesno, nastavi": radi i zapiši izuzetak u STATUS.md.';
}

function promptCheck(input, root) {
  const prompt = (input.prompt || '').trim();
  if (!prompt || prompt.startsWith('/') || /svjesno,?\s+nastavi/i.test(prompt)) return null;
  if (!CHANGE.test(prompt) || !readScope(root)) return null;
  return 'Čuvar obima: prije izmjena provjeri da li je ovaj zahtjev u Obimu iz docs/VIZIJA.md. Ako nije, pitaj za vezu i ponudi 4 izbora.';
}

// PreToolUse (Write): nov top-level folder ili nova funkcija koja nije u planu → pitaj korisnika.
function newFolderCheck(input, root) {
  if (input.tool_name !== 'Write') return null;
  const rel = relToRoot((input.tool_input || {}).file_path, root);
  if (!rel || !rel.includes('/')) return null;
  const top = rel.split('/')[0];
  if (!fs.existsSync(path.join(root, top)) && !STANDARD_TOP.has(top)) {
    const arh = readDoc(root, 'docs/ARHITEKTURA.md');
    if (arh && !arh.includes(top)) {
      return `Nov folder \`${top}/\` nije u docs/ARHITEKTURA.md. Da li je ovo u obimu projekta? (ako jeste, dopuni ARHITEKTURA.md)`;
    }
  }
  const f = rel.match(/^src\/features\/([^/]+)\//);
  if (f && !fs.existsSync(path.join(root, 'src', 'features', f[1]))) {
    const inv = readDoc(root, 'docs/INVENTAR-FUNKCIJA.md');
    if (inv && !inv.includes(f[1])) {
      return `Nova funkcija \`${f[1]}\` nije u docs/INVENTAR-FUNKCIJA.md. Da li je u obimu? (ako jeste, koristi \`/nova-funkcija\`)`;
    }
  }
  return null;
}

module.exports = { readScope, sessionMessage, promptCheck, newFolderCheck, section };
