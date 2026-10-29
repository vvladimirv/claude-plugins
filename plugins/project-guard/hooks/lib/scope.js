// Čuvar obima: jedan projekat = jedna tema. Procjenu "je li u obimu" radi Claude;
// hook samo drži obim u kontekstu i mehanički hvata nove foldere koji nisu u planu.
// Projekat sa `.claude/bez-kickstarta` ima svoj sistem dokumenata, pa tamo čuvar ne radi ništa.

const fs = require('fs');
const path = require('path');
const { relToRoot, noKickstart } = require('./common');

// Bosanski su korijeni glagola (dodaj, dodajte…); engleske riječi moraju biti cijele ("add" nije "address").
const CHANGE = /(^|[\s,.;:!?"'(])(dodaj|napravi|kreiraj|ubaci|implementiraj|izmijeni|promijeni|prepravi|obriš|izbriš|ukloni|popravi|refaktor|preimenuj|instaliraj|integriš|poveži|napiši|sredi(?!n)|(add|create|implement|build|make|write|change|remove|delete|fix|refactor|install|integrate)(?:s|es|d|ed|ing)?(?![a-z]))/i;
const STANDARD_TOP = new Set(['docs', '.claude', '.codex', '.agents', 'src', 'app', 'lib', 'tests', 'test', 'e2e', 'scripts', 'fixtures', 'public', 'static', 'assets', '.github', '.githooks']);

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
  if (noKickstart(root)) return null;
  const md = readDoc(root, 'docs/VIZIJA.md');
  if (!md) return null;
  const obim = section(md, 'Obim');
  if (!obim.length) return null;
  return { obim, van: section(md, 'Van obima') };
}

// Poslije /izdanje projekat je u održavanju: obim je zamrznut dok se ne isplanira nova verzija.
// Projekat bez kickstarta se ne zamrzava ni kad ima kickstart.json sa fazom održavanja.
function frozen(root) {
  if (noKickstart(root)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'kickstart.json'), 'utf8'));
    if (meta.faza !== 'odrzavanje') return null;
    const izdanja = Array.isArray(meta.izdanja) ? meta.izdanja : [];
    return (izdanja[izdanja.length - 1] || {}).verzija || 'izdanje';
  } catch {
    return null;
  }
}

const FREEZE = (v) => `Projekat je izdat (${v}) i obim je zamrznut. Popravke bugova su slobodne. Nova funkcija ide u plan nove verzije `
  + '(`/izdanje` → planiraj sljedeću verziju) ili u `/ideja`. Ne dodaji je usput.';

function sessionMessage(root) {
  const v = frozen(root);
  if (v) return '## Čuvar obima: održavanje\n' + FREEZE(v);
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
  if (!CHANGE.test(prompt)) return null;
  const v = frozen(root);
  if (v) return 'Čuvar obima: ' + FREEZE(v);
  if (!readScope(root)) return null;
  return 'Čuvar obima: prije izmjena provjeri da li je ovaj zahtjev u Obimu iz docs/VIZIJA.md. Ako nije, pitaj za vezu i ponudi 4 izbora.';
}

// PreToolUse (Write): nov top-level folder ili nova funkcija koja nije u planu → pitaj korisnika.
function newFolderCheck(input, root) {
  if (input.tool_name !== 'Write' || noKickstart(root)) return null;
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
