// Otisak šablona projekta: svaka izmjena šablona mora podići `verzija_sablona` (CLAUDE.md).
// `node test/sablon-hash.js --upisi` zapiše novi otisak, ali samo ako je verzija podignuta i ima stavku u CHANGELOG-SABLONA.md.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KICKSTART = path.join(__dirname, '..', 'plugins', 'project-kickstart', 'skills', 'kickstart');
const TEMPLATES = path.join(KICKSTART, 'templates');
const RECORD = path.join(__dirname, 'sablon-hash.json');
const CHANGELOG = 'CHANGELOG-SABLONA.md';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p) : [p];
  });
}

// Otisak svih šablona osim CHANGELOG-a, nezavisno od CRLF/LF.
function hash() {
  const h = crypto.createHash('sha256');
  for (const f of files(TEMPLATES).filter((p) => path.basename(p) !== CHANGELOG).sort()) {
    h.update(path.relative(TEMPLATES, f).split(path.sep).join('/') + '\n');
    h.update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
  }
  return h.digest('hex').slice(0, 16);
}

function skillVersion() {
  const m = fs.readFileSync(path.join(KICKSTART, 'SKILL.md'), 'utf8').match(/"verzija_sablona":\s*"([\d.]+)"/);
  return m ? m[1] : null;
}

function changelogVersion() {
  const m = fs.readFileSync(path.join(TEMPLATES, CHANGELOG), 'utf8').match(/^##\s+([\d.]+)/m);
  return m ? m[1] : null;
}

function record() {
  return JSON.parse(fs.readFileSync(RECORD, 'utf8'));
}

if (require.main === module && process.argv.includes('--upisi')) {
  const v = skillVersion();
  const old = fs.existsSync(RECORD) ? record() : null;
  if (old && old.hash !== hash() && old.verzija === v) {
    console.error(`Šabloni su promijenjeni, a verzija_sablona je i dalje ${v}. Prvo je podigni u kickstart SKILL.md i dopiši ${CHANGELOG}.`);
    process.exit(1);
  }
  if (changelogVersion() !== v) {
    console.error(`${CHANGELOG} nema stavku za ${v} na vrhu.`);
    process.exit(1);
  }
  fs.writeFileSync(RECORD, JSON.stringify({ verzija: v, hash: hash() }, null, 2) + '\n');
  console.log(`Upisano: šabloni ${v}`);
}

module.exports = { hash, skillVersion, changelogVersion, record };
