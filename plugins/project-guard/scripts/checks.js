// Samostalan runner bez zavisnosti: dokaz važi samo za isti sadržaj, indeks i plan provjera.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();

function fingerprint(root) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(path.join(root, '.agent-checks.json')));
  hash.update(git(root, ['ls-files', '--stage', '-z']));
  const files = [...new Set(git(root, ['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
  for (const rel of files) {
    hash.update(rel + '\0');
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { hash.update('MISSING\0'); continue; }
    const stat = fs.lstatSync(file);
    hash.update(String(stat.mode & 0o111));
    if (stat.isSymbolicLink()) hash.update('LINK:' + fs.readlinkSync(file));
    else if (stat.isFile()) hash.update(fs.readFileSync(file));
    else throw new Error('Nepodržana putanja u provjeri: ' + rel);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function receiptPath(root) { return path.resolve(root, git(root, ['rev-parse', '--git-path', 'agent-checks.json'])); }
function plan(root) {
  const value = JSON.parse(fs.readFileSync(path.join(root, '.agent-checks.json'), 'utf8'));
  if (!Array.isArray(value.checks) || !value.checks.length) throw new Error('Nema definisanih provjera u .agent-checks.json.');
  const names = new Set();
  for (const c of value.checks) {
    if (!c.name || names.has(c.name) || typeof c.command !== 'string' || !c.command ||
      !Array.isArray(c.args) || c.args.some(a => typeof a !== 'string') || c.required === false) {
      throw new Error('Svaka provjera mora imati jedinstven name, command i args; sve navedene provjere su obavezne.');
    }
    names.add(c.name);
  }
  return value.checks;
}

function verify(root) {
  try {
    const checks = plan(root);
    const record = JSON.parse(fs.readFileSync(receiptPath(root), 'utf8'));
    if (record.status !== 'passed' || record.fingerprint !== fingerprint(root) ||
      record.results.length !== checks.length || record.results.some((r, i) => r.name !== checks[i].name || r.exitCode !== 0)) {
      return { ok: false, message: 'Provjera je nepotpuna, neuspješna ili zastarjela. Ponovo pokrenite provjere nakon posljednje izmjene i git add.' };
    }
    return { ok: true, message: `Provjereno ${checks.length} obaveznih provjera nad trenutnim kodom i Git indeksom.` };
  } catch { return { ok: false, message: 'Nema važećeg dokaza provjera. Provjerite .agent-checks.json i pokrenite runner.' }; }
}

function run(root) {
  // Odmah ukloni staru potvrdu: pad runnera ne smije ostaviti ranije zeleno stanje.
  fs.rmSync(receiptPath(root), { force: true });
  const checks = plan(root);
  const before = fingerprint(root);
  const results = checks.map(c => {
    console.log('Provjera: ' + c.name);
    // Bez shell:true i string spajanja; npm.cmd na Windowsu pozvati kroz node npm-cli.js u planu.
    const result = spawnSync(c.command, c.args, { cwd: root, stdio: 'inherit', timeout: 600000, windowsHide: true });
    return { name: c.name, exitCode: result.status, error: result.error?.code || null };
  });
  const same = fingerprint(root) === before;
  const passed = same && results.every(r => r.exitCode === 0 && !r.error);
  const receipt = { version: 1, status: passed ? 'passed' : 'incomplete', at: new Date().toISOString(), fingerprint: before, results };
  fs.writeFileSync(receiptPath(root), JSON.stringify(receipt, null, 2) + '\n');
  console.log(passed ? 'SVE OBAVEZNE PROVJERE PROŠLE.' : 'PROVJERA NIJE POTPUNA ILI NIJE PROŠLA.' + (same ? '' : ' Testovi su promijenili sadržaj projekta.'));
  return passed ? 0 : 1;
}

if (require.main === module) {
  try {
    const i = process.argv.indexOf('--root');
    const root = path.resolve(i >= 0 ? process.argv[i + 1] : process.cwd());
    if (process.argv.includes('--verify')) {
      const result = verify(root); console.log(result.message); process.exitCode = result.ok ? 0 : 1;
    } else process.exitCode = run(root);
  } catch (err) { console.error('PROVJERA NIJE POTPUNA: ' + err.message); process.exitCode = 1; }
}
module.exports = { fingerprint, receiptPath, plan, verify, run };
