// Napredak projekta iz docs/BLUEPRINT.md i docs/INVENTAR-FUNKCIJA.md. Čiste funkcije, bez LLM-a.
// Tolerantno: stari blueprint bez kolona Rok/Status i dalje daje napredak (status se izvodi iz funkcija).

const fs = require('fs');
const path = require('path');

const DAY = 86400000;
const DATE = /\d{4}-\d{2}-\d{2}/g;

// Svi redovi tabela čija prva ćelija odgovara idRe, svaki sa zaglavljem svoje tabele.
function tableRows(md, idRe) {
  const out = [];
  let header = [];
  for (const raw of md.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l.startsWith('|')) { header = []; continue; }
    const cells = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (/^:?-{2,}/.test(cells[0])) continue;
    if (idRe.test(cells[0])) out.push({ header, cells });
    else header = cells.map((c) => c.toLowerCase());
  }
  return out;
}

function col(header, cells, name, fallback = -1) {
  const i = header.findIndex((h) => h.startsWith(name));
  const idx = i >= 0 ? i : fallback;
  return idx >= 0 && idx < cells.length ? cells[idx] : '';
}

function normStatus(s) {
  const t = s.toLowerCase();
  if (t.includes('uklonjen')) return 'uklonjena';
  if (t.includes('odložen') || t.includes('odlozen') || t.includes('v2')) return 'odlozeno';
  if (t.includes('izradi')) return 'u izradi';
  if (t.includes('radi')) return 'radi';
  return 'planirano';
}

function parseInventory(md) {
  return tableRows(md, /^F-\d+/).map(({ header, cells }) => ({
    id: cells[0].match(/F-\d+/)[0],
    status: normStatus(col(header, cells, 'status', cells.length - 1)),
  }));
}

function parseBlueprint(md) {
  return tableRows(md, /^M\d+/).map(({ header, cells }) => {
    const rokCell = col(header, cells, 'rok');
    const statusCell = header.some((h) => h.startsWith('status')) ? col(header, cells, 'status') : null;
    const roks = rokCell.match(DATE) || [];
    let status = null;
    let done = null;
    if (statusCell !== null) {
      const s = statusCell.toLowerCase();
      if (s.includes('gotovo') || s.includes('✅')) { status = 'gotovo'; done = (statusCell.match(DATE) || [])[0] || null; }
      else status = s.includes('u toku') ? 'u toku' : 'planirano';
    }
    return {
      id: cells[0].match(/M\d+/)[0],
      features: col(header, cells, 'funkcij').match(/F-\d+/g) || [],
      rok: roks.length ? roks[roks.length - 1] : null,
      rokPrvi: roks[0] || null,
      status,
      done,
    };
  });
}

function parseStart(md) {
  const m = md.match(/^##\s+Tempo[\s\S]*?(\d{4}-\d{2}-\d{2})/im);
  return m ? m[1] : null;
}

const day = (iso) => Date.parse(iso + 'T00:00:00Z');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// Stari blueprint bez kolone Status: status milestonea se izvodi iz statusa njegovih funkcija.
function inferStatuses(milestones, features) {
  const st = new Map(features.map((f) => [f.id, f.status]));
  const anyStarted = features.some((f) => f.status === 'radi' || f.status === 'u izradi');
  for (const m of milestones) {
    if (m.status) continue;
    const fs_ = m.features.map((id) => st.get(id)).filter((s) => s && s !== 'uklonjena' && s !== 'odlozeno');
    if (!fs_.length) m.status = anyStarted ? 'gotovo' : 'planirano';
    else if (fs_.every((s) => s === 'radi')) m.status = 'gotovo';
    else m.status = fs_.some((s) => s === 'radi' || s === 'u izradi') ? 'u toku' : 'planirano';
    m.inferred = true;
  }
}

function summarize({ milestones, features, start = null, today }) {
  inferStatuses(milestones, features);
  const now = day(today);
  const active = features.filter((f) => f.status !== 'uklonjena' && f.status !== 'odlozeno');
  const radi = active.filter((f) => f.status === 'radi').length;
  const doneMs = milestones.filter((m) => m.status === 'gotovo');
  const current = milestones.find((m) => m.status !== 'gotovo') || null;
  const late = milestones.filter((m) => m.status !== 'gotovo' && m.rok && day(m.rok) < now)
    .map((m) => ({ id: m.id, dana: Math.floor((now - day(m.rok)) / DAY) }));
  const plan = [...milestones].reverse().find((m) => m.rok);

  // Prognoza: prosječno stvarno trajanje završenih milestonea × broj preostalih.
  const dates = [start, ...doneMs.map((m) => m.done)].filter(Boolean).map(day).sort((a, b) => a - b);
  let prognoza = null;
  const remaining = milestones.length - doneMs.length;
  if (remaining === 0) prognoza = doneMs.length && doneMs[doneMs.length - 1].done ? doneMs[doneMs.length - 1].done : today;
  else if (dates.length >= 2) {
    const avg = (dates[dates.length - 1] - dates[0]) / (dates.length - 1);
    prognoza = iso(Math.max(now, dates[dates.length - 1] + remaining * avg));
  } else if (plan) prognoza = plan.rok;

  return {
    milestones, features, start, current, late, prognoza,
    plan: plan ? plan.rok : null,
    ukupnoM: milestones.length, gotovoM: doneMs.length,
    ukupnoF: active.length, radiF: radi,
    procenat: active.length ? Math.round((radi / active.length) * 100) : 0,
    poStatusu: features.reduce((a, f) => ({ ...a, [f.status]: (a[f.status] || 0) + 1 }), {}),
    imaRokove: milestones.some((m) => m.rok),
    mvpGotov: active.length > 0 && radi === active.length && milestones.every((m) => m.status === 'gotovo'),
  };
}

function line(s) {
  const f = `funkcije ${s.radiF}/${s.ukupnoF} radi (${s.procenat}%)`;
  if (s.mvpGotov) return `Napredak: MVP gotov · ${f} · milestonei ${s.gotovoM}/${s.ukupnoM}`;
  const parts = [`Napredak: ${s.current ? s.current.id : '—'} od ${s.ukupnoM} (${s.current ? s.current.status : ''})`, f];
  for (const l of s.late) parts.push(`${l.id} kasni ${l.dana} ${l.dana === 1 ? 'dan' : 'dana'}`);
  if (s.prognoza) parts.push(`prognoza MVP ${s.prognoza}` + (s.plan && s.plan !== s.prognoza ? ` (plan ${s.plan})` : ''));
  return parts.join(' · ');
}

function readDoc(root, rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

function load(root, today = iso(Date.now())) {
  const bp = readDoc(root, 'docs/BLUEPRINT.md');
  const inv = readDoc(root, 'docs/INVENTAR-FUNKCIJA.md');
  if (!bp && !inv) return null;
  let meta = {};
  try { meta = JSON.parse(readDoc(root, '.claude/kickstart.json') || '{}'); } catch { /* bez meta */ }
  const s = summarize({ milestones: parseBlueprint(bp), features: parseInventory(inv), start: parseStart(bp), today });
  const izdanja = Array.isArray(meta.izdanja) ? meta.izdanja : [];
  return { ...s, faza: meta.faza || 'razvoj', izdanje: izdanja[izdanja.length - 1] || null, today };
}

// Tekst za kontekst sesije: jedna linija + uputa kad treba odluka.
function sessionText(root, today) {
  const s = load(root, today);
  if (!s || (!s.ukupnoM && !s.ukupnoF)) return null;
  if (s.faza === 'odrzavanje' && s.izdanje) return `## Napredak\n${s.izdanje.verzija} izdat (${s.izdanje.datum}) · održavanje.`;
  const out = [line(s)];
  if (s.mvpGotov) {
    out.push('MVP je gotov. Umjesto novih funkcija predloži korisniku `/izdanje` (tag v1.0 i zamrzavanje obima).');
  } else if (s.late.length) {
    out.push(`${s.late[0].id} kasni. Jednom, na početku, ponudi korisniku: (a) smanji obim (funkcija → \`odloženo (v2)\` + ADR), `
      + '(b) novi rok sa razlogom u BLUEPRINT.md, (c) nastavi.');
  }
  if (!s.imaRokove) out.push('Blueprint nema rokove: predloži `/kickstart --nadogradi` (dodaje Rok i Status).');
  return '## Napredak\n' + out.join('\n');
}

module.exports = { parseBlueprint, parseInventory, parseStart, summarize, line, load, sessionText };
