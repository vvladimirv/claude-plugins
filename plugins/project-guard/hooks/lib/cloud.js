// `claude --cloud "zadatak"` (staro ime `--remote`) pravi novu cloud sesiju iz ovog repoa.
// Bez GitHub remotea (ili GitHub Appa) CLI šalje bundle: historiju i necommitovane izmjene praćenih
// fajlova kakve jesu; na Windowsu ne izostavlja ni `.env` (claude-licno, kartica claude-code-sesije-i-cloud).
// Pravilo jednom blokira takvu komandu kad repo nema `origin` na github.com ili ima necommitovane
// izmjene praćenih fajlova. Ista komanda drugi put u istoj sesiji prolazi. Poruka postojećoj sesiji
// (`claude -p "..." --cloud <id>`) se ne dira. Bez mreže: `git remote get-url`, `git status` i, samo kad
// tajna postoji na disku, `git ls-files` za nju.

const fs = require('fs');
const path = require('path');
const { git, isGitRepo, loadState, saveState } = require('./common');

const QUICK = /--(cloud|remote)(?![\w-])/;
const SEPARATOR = /^(;|&&|\|\||\||\n)$/;
const CLOUD_FLAG = /^--(cloud|remote)(?:=(.*))?$/;
// Tajne u korijenu koje se najčešće prate greškom; git se pita samo za one koje postoje na disku
// (cijeli `git ls-files` traje ~150 ms na Windowsu). Sadržaj se ne čita.
const SECRET_FILES = ['.env', '.env.local', '.env.production'];

// Jednostavan tokenizer: navodnici drže razmake, a ; && || | i novi red odvajaju komande.
function tokenize(cmd) {
  const tokens = [];
  let cur = '';
  let quote = null;
  let has = false;
  const push = () => { if (has) tokens.push(cur); cur = ''; has = false; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (c === '\n' || c === ';') { push(); tokens.push(c); continue; }
    if ((c === '&' || c === '|') && cmd[i + 1] === c) { push(); tokens.push(c + c); i++; continue; }
    if (c === '|') { push(); tokens.push(c); continue; }
    if (/\s/.test(c)) { push(); continue; }
    cur += c;
    has = true;
  }
  push();
  return tokens;
}

function isClaude(token) {
  return /(^|[\\/])claude(\.exe|\.cmd)?$/i.test(token);
}

// ID ili adresa postojeće sesije: URL, UUID ili dug token bez razmaka sa ciframa (npr. session_01Ab…).
function isSessionRef(value) {
  if (/^https?:\/\//i.test(value)) return true;
  return !/\s/.test(value) && value.length >= 16 && /\d/.test(value) && /^[\w-]+$/.test(value);
}

// Vraća true kad bar jedna komanda u liniji pravi NOVU cloud sesiju.
function createsCloudSession(cmd) {
  if (!QUICK.test(cmd)) return false;
  const tokens = tokenize(cmd);
  let start = true;
  let inClaude = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (SEPARATOR.test(t)) { start = true; inClaude = false; continue; }
    if (start) {
      if (t === '&' || /^\w+=/.test(t)) continue; // PowerShell `& "putanja"` ili `VAR=x claude`
      start = false;
      inClaude = isClaude(t);
      continue;
    }
    if (!inClaude) continue;
    const m = t.match(CLOUD_FLAG);
    if (!m) continue;
    const next = tokens[i + 1];
    const value = m[2] !== undefined ? m[2] : (next !== undefined && !SEPARATOR.test(next) && !next.startsWith('-') ? next : '');
    if (!value || !isSessionRef(value)) return true;
  }
  return false;
}

function problems(root) {
  const found = [];
  const origin = git(root, ['remote', 'get-url', 'origin']);
  if (!/github\.com[:/]/i.test(origin)) {
    found.push(origin ? `\`origin\` nije na github.com (${origin})` : 'repo nema `origin` remote');
  }
  const dirty = git(root, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) {
    const n = dirty.split('\n').filter(Boolean).length;
    found.push(`${n} praćen${n === 1 ? ' fajl ima' : 'ih fajlova ima'} necommitovane izmjene`);
  }
  if (!found.length) return null;
  const present = SECRET_FILES.filter((f) => fs.existsSync(path.join(root, f)));
  const secrets = present.length ? git(root, ['ls-files', '--', ...present]).split('\n').filter(Boolean) : [];
  return { found, secrets };
}

function message(p) {
  const secretLine = p.secrets.length
    ? `\nPraćeni fajlovi koji liče na tajne: ${p.secrets.slice(0, 5).map((f) => '`' + f + '`').join(', ')}.`
    : '';
  return `☁️ \`claude --cloud\` pravi novu cloud sesiju iz ovog repoa, a ovdje: ${p.found.join('; ')}.\n`
    + 'Bez GitHub remotea ili Claude GitHub Appa CLI šalje bundle: cijelu historiju i necommitovane izmjene '
    + 'praćenih fajlova kakve jesu. Na Windowsu se pri tome ne izostavlja ni `.env` ako je praćen.'
    + secretLine + '\nPrije slanja:\n'
    + '1. `git status`: izmjene commitaj ili ih skloni (`git stash push -m <opis>`), a tajne izbaci iz praćenja (`git rm --cached .env`).\n'
    + '2. Granu pushaj na GitHub (`origin` na github.com, `git push -u origin HEAD`).\n'
    + '3. Za repo instaliraj Claude GitHub App (claude.ai/code), pa cloud klonira s GitHuba umjesto bundlea.\n'
    + 'Ako je slanje ovakvo namjerno, ponovi istu komandu: druga prolazi.';
}

function check(input, root) {
  const tool = input.tool_name;
  if (tool !== 'Bash' && tool !== 'PowerShell') return null;
  const cmd = (input.tool_input || {}).command || '';
  if (!createsCloudSession(cmd) || !isGitRepo(root)) return null;
  const state = loadState('cloud', input.session_id);
  const key = `${root}\u0000${cmd.trim()}`;
  if ((state.seen || []).includes(key)) return null;
  const p = problems(root);
  if (!p) return null;
  saveState('cloud', input.session_id, { seen: [...(state.seen || []), key] });
  return message(p);
}

module.exports = { check, createsCloudSession, tokenize };
