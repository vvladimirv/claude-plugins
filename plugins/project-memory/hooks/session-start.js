// SessionStart hook: ubacuje STATUS.md i zadnje commitove u kontekst sesije.
// Fail-open: svaka greška se upiše u ~/.claude/pravila.log, a sesija normalno nastavlja.

const fs = require('fs');
const path = require('path');
const { sessionText } = require('./lib/progress');
const util = require('./lib/util');

const { git } = util;

const MAX_STATUS_LINES = 40;
const MAX_STATUS_CHARS = 3000;
const GIT_LOG_COUNT = 10;

// Korisnik nije programer: projekat ga vodi korak po korak, pa svaki završen korak kaže šta je sljedeće.
const GUIDE = '## Vođenje korisnika\n'
  + 'Korisnik nije programer i želi da ga projekat vodi. Kad završiš korak ili čekaš korisnika, zadnja linija odgovora je '
  + '`➡️ Sljedeće:` sa jednom konkretnom stvari: komanda koju kuca (npr. `/kraj-sesije`), šta da proba i kako, '
  + 'ili odluka koju treba donijeti. Bez žargona; nov pojam objasni u pola rečenice.';

// Glavna sesija samostalne zadatke daje pomoćnim sesijama (kartica, klik korisnika). Pomoćna radi u worktreeu, ali u
// worktreeu je i nova sesija iz štafete, pa pomoćnu prepoznaje po svom promptu.
const HELPERS_MAIN = '## Pomoćne sesije\n'
  + 'Samostalan zadatak (može se uraditi bez korisnika, usput) ne radi ovdje: napravi karticu pomoćne sesije po `/pomocna` '
  + '(prompt je gotov, korisnik samo klikne).';
const HELPERS_WORKTREE = '## Pomoćne sesije\n'
  + 'Ovo je worktree. Ako prompt kaže „Ti si pomoćna sesija": STATUS.md ne diraj, kartice ne pravi, a kad je zadatak '
  + 'gotov i provjeren, sam pokreni `/kraj-sesije auto <bazna grana>`. Inače radi kao glavna (samostalan zadatak ide na '
  + 'karticu po `/pomocna`).';

const CUT_NOTE = '\n… (skraćeno: STATUS.md je predugačak, treba ga skratiti na ≤ 30 linija)';

// Staro skraćivanje: od vrha, po linijama pa po znakovima.
function trimFlat(text) {
  let lines = text.split('\n');
  let cut = lines.length > MAX_STATUS_LINES;
  lines = lines.slice(0, MAX_STATUS_LINES);
  let out = lines.join('\n');
  if (out.length > MAX_STATUS_CHARS) {
    out = out.slice(0, MAX_STATUS_CHARS);
    cut = true;
  }
  return cut ? out + CUT_NOTE : out;
}

// STATUS razbijen po `## ` naslovima: prvi dio je zaglavlje (`# STATUS` + „Ažurirano“).
function splitSections(text) {
  const sections = [];
  let current = { title: '', lines: [] };
  for (const line of text.split('\n')) {
    if (/^## /.test(line)) {
      sections.push(current);
      current = { title: line, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

// Dugačak „Radi“ ne smije progutati „Sljedeće“ i „Blokere“: oni (i zaglavlje) idu cijeli, a „Radi“ dobija ostatak
// budžeta linija i znakova. Bez tih naslova ostaje staro skraćivanje od vrha.
function trimStatus(text) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  const sections = splitSections(clean);
  const radi = sections.find((s) => /^## Radi\b/i.test(s.title));
  const sljedece = sections.find((s) => /^## Sljede[ćc]e\b/i.test(s.title));
  if (!radi || !sljedece) return trimFlat(clean);

  const others = sections.filter((s) => s !== radi);
  const otherLines = others.reduce((n, s) => n + s.lines.length, 0);
  const otherChars = others.reduce((n, s) => n + s.lines.join('\n').length + 1, 0);
  const lineBudget = Math.max(2, MAX_STATUS_LINES - otherLines);
  const charBudget = Math.max(radi.title.length + 1, MAX_STATUS_CHARS - otherChars);

  let radiText = radi.lines.join('\n');
  let cut = false;
  if (radi.lines.length > lineBudget) {
    radiText = radi.lines.slice(0, lineBudget).join('\n');
    cut = true;
  }
  if (radiText.length > charBudget) {
    radiText = radiText.slice(0, charBudget);
    cut = true;
  }
  if (cut) radiText += CUT_NOTE + '\n';

  return sections.map((s) => (s === radi ? radiText : s.lines.join('\n'))).join('\n').trimEnd();
}

function buildContext({ statusText, gitLog, uncommitted, progress, worktree }) {
  const parts = [];
  if (progress) parts.push(progress);
  if (statusText) {
    parts.push('## STATUS.md (trenutno stanje projekta)\n' + trimStatus(statusText));
  }
  if (gitLog) {
    parts.push(`## Zadnjih ${GIT_LOG_COUNT} commitova\n` + gitLog.trim());
  }
  if (uncommitted > 0) {
    parts.push(`## Necommitovano\n${uncommitted} izmijenjenih fajlova od prošle sesije. Pitaj korisnika da li ih prvo commitovati.`);
  }
  if (parts.length === 0) return '';
  if (worktree === true) parts.push(HELPERS_WORKTREE);
  else if (worktree === false) parts.push(HELPERS_MAIN);
  parts.push(GUIDE);
  return '# Memorija projekta (project-memory)\n\n' + parts.join('\n\n');
}

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const logError = (err) => util.logError('session-start', err);

function main() {
  const input = readInput();
  const cwd = util.projectDir(input);

  const statusPath = path.join(cwd, 'STATUS.md');
  const statusText = fs.existsSync(statusPath) ? fs.readFileSync(statusPath, 'utf8') : '';

  const isRepo = git(cwd, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  const gitLog = isRepo ? git(cwd, ['log', '--oneline', '--no-decorate', `-${GIT_LOG_COUNT}`]) : '';
  const worktree = isRepo ? util.isWorktreeRoot(cwd) : undefined;
  const uncommitted = isRepo ? git(cwd, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean).length : 0;

  let progress = null;
  try {
    progress = sessionText(cwd);
  } catch (err) {
    logError(err);
  }
  const context = buildContext({ statusText, gitLog, uncommitted, progress, worktree });
  if (!context) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    logError(err);
  }
  process.exit(0);
}

module.exports = { buildContext, trimStatus };
