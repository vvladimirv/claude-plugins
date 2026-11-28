// Otisak svakog plugina: izmjena skilla, hooka, agenta ili PODSJETNIKA mora podići verziju plugina (CLAUDE.md).
// Bez toga `claude plugin update` ne vidi novu verziju, pa instalirana kopija ostane stara pod istim brojem.
// `node test/plugin-hash.js --upisi` zapiše nove otiske, ali samo za pluginove kojima je verzija podignuta.
// Testovi plugina (`test/`, `tests/`, `*.test.js`, `*.test.tsx`) ne ulaze u otisak: ne mijenjaju ono što se instalira.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const RECORD = path.join(__dirname, 'plugin-hash.json');
const TEST_FILE = /(^|\/)tests?\/|\.test\.(js|tsx?)$/;

// Fajlovi koje git prati ili bi pratio (bez ignorisanih), da otisak bude isti na svakom računaru i u CI-ju.
function files(dir) {
  const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '.'], { cwd: dir, encoding: 'utf8' });
  return out.split(/\r?\n/).filter((rel) => rel && !TEST_FILE.test(rel))
    .map((rel) => path.join(dir, rel))
    .filter((p) => fs.existsSync(p));
}

function names() {
  return fs.readdirSync(PLUGINS).filter((n) => fs.existsSync(path.join(PLUGINS, n, '.claude-plugin', 'plugin.json'))).sort();
}

// Otisak plugina bez verzije (manifesti se čitaju bez polja version), nezavisno od CRLF/LF.
function hash(name) {
  const dir = path.join(PLUGINS, name);
  const h = crypto.createHash('sha256');
  for (const f of files(dir).sort()) {
    let text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    if (path.basename(f) === 'plugin.json') text = text.replace(/"version":\s*"[^"]*"/, '');
    h.update(path.relative(dir, f).split(path.sep).join('/') + '\n' + text);
  }
  return h.digest('hex').slice(0, 16);
}

function version(name) {
  return JSON.parse(fs.readFileSync(path.join(PLUGINS, name, '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

function record() {
  return fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : {};
}

if (require.main === module && process.argv.includes('--upisi')) {
  const old = record();
  const out = {};
  const stale = [];
  for (const n of names()) {
    const h = hash(n);
    const v = version(n);
    if (old[n] && old[n].hash !== h && old[n].verzija === v) stale.push(`${n} (${v})`);
    out[n] = { verzija: v, hash: h };
  }
  if (stale.length) {
    console.error(`Promijenjeno bez nove verzije: ${stale.join(', ')}. Podigni verziju u plugin.json (sva tri) i marketplace.json.`);
    process.exit(1);
  }
  fs.writeFileSync(RECORD, JSON.stringify(out, null, 2) + '\n');
  console.log('Upisano: ' + names().map((n) => `${n} ${out[n].verzija}`).join(', '));
}

module.exports = { hash, version, names, record };
