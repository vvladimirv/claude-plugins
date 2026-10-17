// Zaštita tajni i stvarnih podataka. Jedino pravilo koje prekidač NE isključuje.

const fs = require('fs');
const path = require('path');
const { relToRoot, globToRegex } = require('./common');

const SAFE_ENV = /^\.env\.(example|sample|template|dist)$/i;
const SECRET_NAMES = [
  /^\.env$/i,
  /^\.env\..+$/i,
  // samo fajlovi sa podacima (secrets.json), ne kod koji se tako zove (secrets.js)
  /^secrets?(\.(json|ya?ml|toml|env|txt|ini|cfg|conf))?$/i,
  /^\.?credentials(\.(json|ya?ml|toml|txt|ini))?$/i,
  /\.(pem|key|p12|pfx)$/i,
  /^id_(rsa|ed25519|ecdsa)(\.pub)?$/i,
];

function isSecretName(base) {
  if (SAFE_ENV.test(base)) return false;
  return SECRET_NAMES.some((re) => re.test(base));
}

function protectedGlobs(root) {
  try {
    return fs.readFileSync(path.join(root, '.claude', 'zasticeno.txt'), 'utf8')
      .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

// Vraća razlog blokade ili null.
function checkPath(file, root) {
  if (!file) return null;
  const base = path.basename(file);
  if (isSecretName(base)) return `\`${base}\` je fajl sa tajnama`;
  const rel = relToRoot(file, root);
  if (rel === null) return null;
  if (rel === 'data' || rel.startsWith('data/')) return '`data/` sadrži stvarne podatke';
  const hit = protectedGlobs(root).find((g) => globToRegex(g).test(rel));
  if (hit) return `\`${rel}\` je zaštićen u .claude/zasticeno.txt (\`${hit}\`)`;
  return null;
}

const ENV_IN_CMD = /(^|[\s'"=/\\(])(\.env(\.[\w-]+)?)(?=$|[\s'";|&)>])/g;
const KEY_IN_CMD = /(^|[\s'"=/\\])(id_(rsa|ed25519|ecdsa)|[\w.-]+\.(pem|p12|pfx))(?=$|[\s'";|&)])/i;

// U komandi samo imena sa ekstenzijom: riječ "secrets" u poruci commita nije fajl.
const SECRET_IN_CMD = /^(secrets?\.(json|ya?ml|toml|env|txt|ini|cfg|conf)|\.?credentials\.(json|ya?ml|toml|txt|ini))$/i;

// Riječi komande koje liče na putanju: secrets.json, data/…, zaštićeni globovi iz .claude/zasticeno.txt.
function checkCommandPaths(cmd, root) {
  const globs = root ? protectedGlobs(root).map((g) => [g, globToRegex(g)]) : [];
  for (const raw of cmd.split(/[\s'"`;|&()<>=,]+/)) {
    if (!raw || raw.includes('://')) continue;
    const tok = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    const base = tok.replace(/\/+$/, '').split('/').pop();
    if (SECRET_IN_CMD.test(base)) return `komanda koristi \`${base}\` (tajne)`;
    const rel = root ? relToRoot(tok, root) : tok;
    if (rel && (rel.startsWith('data/') || (rel === 'data' && tok.endsWith('/')))) return 'komanda dira `data/` (stvarni podaci)';
    const hit = rel && globs.find(([, re]) => re.test(rel));
    if (hit) return `komanda dira \`${rel}\`, zaštićen u .claude/zasticeno.txt (\`${hit[0]}\`)`;
  }
  return null;
}

function checkCommand(cmd, root) {
  if (!cmd) return null;
  for (const m of cmd.matchAll(ENV_IN_CMD)) {
    if (!SAFE_ENV.test(m[2])) return `komanda koristi \`${m[2]}\` (tajne)`;
  }
  const k = cmd.match(KEY_IN_CMD);
  if (k) return `komanda koristi \`${k[2]}\` (ključ)`;
  return checkCommandPaths(cmd, root);
}

function toolTarget(input) {
  const t = input.tool_input || {};
  return t.file_path || t.notebook_path || t.path || null;
}

const SECRET_SAMPLES = ['.env', '.env.local', 'secrets.json', 'credentials.json', 'id_rsa', 'server.pem'];

// Grep: putanja (fajl ili folder) i glob filter ne smiju ciljati tajne.
function checkGrep(t, root) {
  const byPath = t.path ? checkPath(t.path, root) : null;
  if (byPath) return byPath;
  const glob = t.glob ? globToRegex(t.glob.replace(/^\*\*\//, '')) : null;
  const sample = glob && SECRET_SAMPLES.find((s) => glob.test(s) && !SAFE_ENV.test(s));
  return sample ? `glob \`${t.glob}\` hvata fajlove sa tajnama (npr. \`${sample}\`)` : null;
}

function check(input, root) {
  const tool = input.tool_name;
  const t = input.tool_input || {};
  let reason;
  if (tool === 'Bash' || tool === 'PowerShell') reason = checkCommand(t.command, root);
  else if (tool === 'Grep') reason = checkGrep(t, root);
  else reason = checkPath(toolTarget(input), root);
  if (!reason) return null;
  return `🔒 Zaštita tajni: ${reason}. Agent ne čita i ne mijenja tajne ni stvarne podatke. `
    + 'Ako to stvarno treba, korisnik to radi ručno. Primjer ključeva ide u `.env.example`, a test podaci u `fixtures/`.';
}

module.exports = { check, checkPath, checkCommand, isSecretName, toolTarget };
