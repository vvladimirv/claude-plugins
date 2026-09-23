// Zaštita tajni i stvarnih podataka. Jedino pravilo koje prekidač NE isključuje.

const fs = require('fs');
const path = require('path');
const { relToRoot, globToRegex } = require('./common');

const SAFE_ENV = /^\.env\.(example|sample|template|dist)$/i;
const SECRET_NAMES = [
  /^\.env$/i,
  /^\.env\..+$/i,
  /^secrets?(\..+)?$/i,
  /^\.?credentials(\.json)?$/i,
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

function checkCommand(cmd) {
  if (!cmd) return null;
  for (const m of cmd.matchAll(ENV_IN_CMD)) {
    if (!SAFE_ENV.test(m[2])) return `komanda koristi \`${m[2]}\` (tajne)`;
  }
  const k = cmd.match(KEY_IN_CMD);
  if (k) return `komanda koristi \`${k[2]}\` (ključ)`;
  return null;
}

function toolTarget(input) {
  const t = input.tool_input || {};
  return t.file_path || t.notebook_path || t.path || null;
}

function check(input, root) {
  const tool = input.tool_name;
  const reason = tool === 'Bash' || tool === 'PowerShell'
    ? checkCommand((input.tool_input || {}).command)
    : checkPath(toolTarget(input), root);
  if (!reason) return null;
  return `🔒 Zaštita tajni: ${reason}. Agent ne čita i ne mijenja tajne ni stvarne podatke. `
    + 'Ako to stvarno treba, korisnik to radi ručno. Primjer ključeva ide u `.env.example`, a test podaci u `fixtures/`.';
}

module.exports = { check, checkPath, checkCommand, isSecretName, toolTarget };
