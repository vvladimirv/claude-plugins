// Verzije koje se ručno podižu na više mjesta: plugin.json = marketplace.json, a šabloni = verzija_sablona.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sablon = require('./sablon-hash');
const plugin = require('./plugin-hash');

const ROOT = path.join(__dirname, '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('verzije: plugin.json i marketplace.json se slažu', () => {
  const market = readJson('.claude-plugin/marketplace.json');
  for (const p of market.plugins) {
    const own = readJson(path.join(p.source, '.claude-plugin', 'plugin.json'));
    assert.strictEqual(own.version, p.version, `${p.name}: plugin.json ${own.version}, marketplace.json ${p.version}`);
  }
});

test('šabloni: verzija_sablona ima stavku na vrhu CHANGELOG-SABLONA.md', () => {
  assert.strictEqual(sablon.changelogVersion(), sablon.skillVersion());
});

test('šabloni: izmjena šablona podiže verzija_sablona', () => {
  const rec = sablon.record();
  assert.strictEqual(sablon.hash(), rec.hash, 'Šabloni su promijenjeni. Podigni verzija_sablona u kickstart SKILL.md, '
    + 'dopiši CHANGELOG-SABLONA.md, pa pokreni `node test/sablon-hash.js --upisi`.');
  assert.strictEqual(sablon.skillVersion(), rec.verzija, 'verzija_sablona je podignuta: pokreni `node test/sablon-hash.js --upisi`.');
});

test('pluginovi: izmjena plugina podiže njegovu verziju', () => {
  const rec = plugin.record();
  for (const n of plugin.names()) {
    const r = rec[n] || {};
    assert.ok(r.hash === plugin.hash(n) || r.verzija !== plugin.version(n),
      `${n} je promijenjen, a verzija je i dalje ${plugin.version(n)}. Podigni verziju (.claude-plugin/plugin.json, `
      + 'marketplace.json), pa pokreni `node test/plugin-hash.js --upisi`.');
    assert.ok(r.hash === plugin.hash(n), `${n}: verzija je podignuta, pokreni \`node test/plugin-hash.js --upisi\`.`);
  }
});
