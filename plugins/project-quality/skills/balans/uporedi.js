#!/usr/bin/env node
// Poredi dva tekstualna izvještaja bota (docs/bot-*.txt) red po red: ključ = odjeljak + oznaka reda + naziv mjere.
// Bez zavisnosti. Upotreba: node uporedi.js <stari.txt> <novi.txt> [--prag N] [--json]
// Mjere sa % porede se u procentnim poenima (prag po zadanom 5), ostale apsolutno (prag 0.25).
const fs = require('node:fs');

const METRIC = /([\p{L}_+]+(?: [\p{L}_+]+)*)\s+(-?\d+(?:[.,]\d+)?)(\s*%)?/gu;

function parseReport(text) {
  const values = new Map();
  const seen = new Map();
  let section = '';
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\(\d+[^)]*\)/g, ' ');
    if (!line.trim()) continue;
    // reči poput "cilj 85.0 %" i "pobjede 7.0 %": naziv mjere je tekst neposredno ispred broja
    const metrics = [];
    const rest = line.replace(METRIC, (m, name, num, pct) => {
      metrics.push({ name: name.trim(), value: parseFloat(num.replace(',', '.')), pct: Boolean(pct) });
      return ' ';
    });
    const hasRow = metrics.length > 0 && /\|/.test(raw) || metrics.length > 0 && /^\s+\S/.test(raw);
    if (!hasRow) {
      if (!/^\s/.test(raw) && !/^(Čitanje|preporuka)/.test(raw.trim())) section = raw.trim().replace(/\s*\([\d.,]+ s\)\s*$/, '');
      continue;
    }
    const label = rest.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const m of metrics) {
      const base = `${section}§${label}§${m.name}`;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      values.set(n > 1 ? `${base}#${n}` : base, { section, label, name: m.name, value: m.value, pct: m.pct });
    }
  }
  return values;
}

function compare(oldText, newText, opts = {}) {
  const thresholdPct = opts.prag ?? 5;
  const thresholdAbs = opts.prag != null ? opts.prag : 0.25;
  const a = parseReport(oldText);
  const b = parseReport(newText);
  const changed = [], same = [];
  let onlyOld = 0;
  for (const [key, o] of a) {
    const n = b.get(key);
    if (!n) { onlyOld++; continue; }
    const delta = Math.round((n.value - o.value) * 100) / 100;
    const row = { ...n, old: o.value, delta };
    (Math.abs(delta) >= (n.pct ? thresholdPct : thresholdAbs) ? changed : same).push(row);
  }
  const onlyNew = [...b.keys()].filter(k => !a.has(k)).length;
  changed.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { changed, unchanged: same.length, onlyOld, onlyNew, compared: changed.length + same.length };
}

function render(result) {
  const lines = [`Poređeno ${result.compared} vrijednosti; promijenjeno ${result.changed.length}, isto ${result.unchanged}` +
    (result.onlyOld || result.onlyNew ? `; samo u starom ${result.onlyOld}, samo u novom ${result.onlyNew}` : '') + '.'];
  if (result.compared === 0) lines.push('Nema zajedničkih redova: format ili imena politika/poglavlja se razlikuju. Uporedi ručno.');
  if (result.changed.length) {
    lines.push('', '| Odjeljak | Red | Mjera | Staro | Novo | Razlika |', '|---|---|---|---|---|---|');
    for (const r of result.changed) {
      const u = r.pct ? ' %' : '';
      lines.push(`| ${r.section || '-'} | ${r.label || '-'} | ${r.name} | ${r.old}${u} | ${r.value}${u} | ${r.delta > 0 ? '+' : ''}${r.delta}${r.pct ? ' p.p.' : ''} |`);
    }
  }
  return lines.join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const files = args.filter((x, i) => !x.startsWith('--') && args[i - 1] !== '--prag');
  const pi = args.indexOf('--prag');
  if (files.length !== 2) { console.error('Upotreba: node uporedi.js <stari.txt> <novi.txt> [--prag N] [--json]'); process.exit(2); }
  const result = compare(fs.readFileSync(files[0], 'utf8'), fs.readFileSync(files[1], 'utf8'), { prag: pi >= 0 ? Number(args[pi + 1]) : undefined });
  console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : render(result));
}

module.exports = { parseReport, compare, render };
