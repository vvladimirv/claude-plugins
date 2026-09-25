// /napredak: `node progress-cli.js [--root <folder>] [--html <izlazni.html>]`
// Bez --html ispisuje tekstualni pregled sa trakama; sa --html pravi samostalan HTML pregled.

const fs = require('fs');
const path = require('path');
const { load, line } = require('./lib/progress');
const { render } = require('./lib/progress-html');

function bar(pct, width = 10) {
  const full = Math.round((pct / 100) * width);
  return '█'.repeat(full) + '░'.repeat(width - full);
}

function text(s) {
  const st = new Map(s.features.map((f) => [f.id, f.status]));
  const late = new Map(s.late.map((l) => [l.id, l.dana]));
  const rows = s.milestones.map((m) => {
    const fs_ = m.features.filter((id) => !['uklonjena', 'odlozeno'].includes(st.get(id)));
    const ok = fs_.filter((id) => st.get(id) === 'radi').length;
    const pct = fs_.length ? Math.round((ok / fs_.length) * 100) : (m.status === 'gotovo' ? 100 : 0);
    const status = m.status === 'gotovo' ? `✅ gotovo${m.done ? ' ' + m.done : ''}`
      : late.has(m.id) ? `⚠️ kasni ${late.get(m.id)} d` : m.status === 'u toku' ? '▶ u toku' : '· planirano';
    const rok = m.rok ? (m.rokPrvi !== m.rok ? `${m.rokPrvi}→${m.rok}` : m.rok) : '—';
    return `${m.id.padEnd(4)} ${status.padEnd(20)} ${rok.padEnd(23)} ${bar(pct)} ${ok}/${fs_.length}`;
  });
  const counts = Object.entries(s.poStatusu).map(([k, v]) => `${k === 'odlozeno' ? 'odloženo (v2)' : k} ${v}`).join(' · ');
  const kraj = s.mvpGotov ? 'MVP je gotov: sljedeći korak je `/izdanje` (tag v1.0 i zamrzavanje obima).'
    : s.prognoza ? `Prognoza MVP: ${s.prognoza}${s.plan ? ` (plan ${s.plan})` : ''}`
      : 'Prognoza: nema rokova ni završenih milestonea sa datumom.';
  return [
    line(s), '',
    'Milestone  Status               Rok                     Funkcije',
    ...rows, '',
    `Funkcije: ${counts || 'nema inventara'}`,
    `${bar(s.procenat, 30)} ${s.procenat}%`,
    kraj,
    s.imaRokove ? null : 'Rokovi fale: `/kickstart --nadogradi` dodaje kolone Rok i Status.',
    s.izdanje ? `Izdanje: ${s.izdanje.verzija} (${s.izdanje.datum}) · faza: ${s.faza}` : null,
  ].filter((l) => l !== null).join('\n');
}

function main(argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(arg('--root') || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const s = load(root);
  if (!s) {
    console.log('Nema docs/BLUEPRINT.md ni docs/INVENTAR-FUNKCIJA.md: projekat nema blueprint (`/kickstart`).');
    return;
  }
  const out = arg('--html');
  if (out) {
    fs.writeFileSync(out, render(s, path.basename(root)));
    console.log(out);
  } else {
    console.log(text(s));
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { text };
