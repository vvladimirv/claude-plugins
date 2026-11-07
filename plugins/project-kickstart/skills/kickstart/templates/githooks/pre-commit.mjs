// Pre-commit (kickstart šablon): važi za svakog ko commituje, bilo da je to Claude, Codex ili čovjek.
// Provjerava: bravu drugog agenta, tajne, veličinu fajlova i brze testove. Bez npm zavisnosti.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const root = git(['rev-parse', '--show-toplevel']).trim();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const lines = (t) => (t ? t.split('\n').length - (t.endsWith('\n') ? 1 : 0) : 0);
const problems = [];

// 1. Brava: u folderu u kojem radi druga sesija ne commituje niko drugi.
const lock = readJson(path.join(root, '.agent-lock.json'), null);
if (lock && Date.now() - Date.parse(lock.heartbeat) < 20 * 60 * 1000) {
  const session = process.env.CC_AGENT_SESSION_ID || process.env.CLAUDE_CODE_SESSION_ID || process.env.CODEX_THREAD_ID;
  const mine = session === lock.session_id;
  if (!mine) {
    problems.push(`Brava: ovaj folder uređuje druga sesija (${lock.agent}, od ${new Date(lock.since).toLocaleTimeString()}). `
      + 'Radi u svom worktreeu. Ako je ta sesija zatvorena, provjeri vlasnika i preuzmi bravu kroz /preuzmi-lock.');
  }
}

// 2. Staged fajlovi: tajne i veličina.
const SECRET_NAME = /(^|\/)(\.env(\.(?!example$|sample$|template$)[\w-]+)?|secrets?(\.(json|ya?ml|toml|env|txt|ini|cfg|conf))?|\.?credentials(\.(json|ya?ml|toml|txt|ini))?|id_(rsa|ed25519|ecdsa))$|\.(pem|key|p12|pfx)$/i;
const SECRET_TEXT = [
  /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, /\bgithub_pat_[A-Za-z0-9_]{50,}/,
  /\bsk-ant-[A-Za-z0-9_-]{20,}/, /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /\bAIza[0-9A-Za-z_-]{35}\b/,
];
const CODE = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|cs|php|vue|svelte|html?|css|scss|sass|less|sh|ps1|swift|dart|c|cc|cpp|h|hpp|lua)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|out|vendor|fixtures|coverage|__snapshots__|migrations)\/|\.min\./i;
const cfg = readJson(path.join(root, '.claude', 'granice.json'), {});
const maks = Number(cfg.maks) || 500;
const iskljuci = (cfg.iskljuci || []).map((g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$', 'i'));

const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
for (const f of staged) {
  if (SECRET_NAME.test(f) || /^data\//.test(f)) {
    problems.push(`Tajne/podaci: ${f} ne smije u repo (dodaj u .gitignore, pa \`git rm --cached ${f}\`).`);
    continue;
  }
  let text = '';
  try { text = git(['show', `:${f}`]); } catch { continue; }
  if (text.includes('\0') || text.length > 1_000_000) continue;
  const hit = SECRET_TEXT.find((re) => re.test(text));
  if (hit) problems.push(`Tajne: ${f} sadrži nešto što liči na ključ ili token. Premjesti ga u .env.`);
  if (CODE.test(f) && !SKIP.test(f) && !iskljuci.some((re) => re.test(f))) {
    const now = lines(text);
    let before = 0;
    try { before = lines(git(['show', `HEAD:${f}`])); } catch { /* nov fajl */ }
    if (now > maks && now > before) problems.push(`Veličina: ${f} ima ${now} linija (maks ${maks}) i raste. Podijeli ga.`);
  }
}

// 3. Brzi testovi (crveno = stop).
const testScript = ['scripts/test.mjs', 'scripts/test.js', 'scripts/test.ps1', 'scripts/test'].find((s) => fs.existsSync(path.join(root, s)));
const hasPlan = fs.existsSync(path.join(root, '.agent-checks.json'));
if (!problems.length && hasPlan) {
  const runner = path.join(root, 'scripts', 'checks.cjs');
  if (!fs.existsSync(runner)) problems.push('Testovi: postoji plan, ali nema scripts/checks.cjs.');
  else {
    const r = spawnSync(process.execPath, [runner, '--verify', '--root', root], { cwd: root, stdio: 'inherit' });
    if (r.error || r.status !== 0) problems.push('Testovi: dokaz nedostaje ili je zastario; git add pa node scripts/checks.cjs.');
  }
} else if (!problems.length && testScript) {
  // PowerShell se na Windowsu zove `powershell`, a na Linuxu i Macu `pwsh`.
  const ps = process.platform === 'win32' ? 'powershell' : 'pwsh';
  const cmd = testScript.endsWith('.ps1') ? [ps, ['-NoProfile', '-File', testScript]]
    : testScript.endsWith('js') ? ['node', [testScript]] : ['sh', [testScript]];
  const r = spawnSync(cmd[0], cmd[1], { cwd: root, stdio: 'inherit' });
  if (r.error) {
    const why = r.error.code === 'ENOENT' ? `nema \`${cmd[0]}\` na ovom računaru` : r.error.message;
    problems.push(`Testovi: ${testScript} se ne može pokrenuti (${why}). Testove pokreći preko scripts/test.mjs (Node radi svuda).`);
  } else if (r.status !== 0) problems.push(`Testovi: ${testScript} nije prošao. Popravi prije commita.`);
}

if (problems.length) {
  console.error('\n⛔ pre-commit: commit odbijen\n' + problems.map((p) => '  - ' + p).join('\n') + '\n');
  process.exit(1);
}
