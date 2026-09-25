// HTML pregled napretka: samostalan fajl (bez biblioteka i vanjskih resursa), svijetla i tamna tema.

const DAY = 86400000;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const day = (iso) => Date.parse(iso + 'T00:00:00Z');

const STATUS = {
  radi: ['radi', 'var(--ok)'], 'u izradi': ['u izradi', 'var(--warn)'], planirano: ['planirano', 'var(--muted)'],
  odlozeno: ['odloženo (v2)', 'var(--line)'], uklonjena: ['uklonjena', 'var(--line)'],
};

function featureBar(s) {
  const total = s.features.length || 1;
  const segs = Object.entries(STATUS).map(([k, [label, color]]) => {
    const n = s.poStatusu[k] || 0;
    return n ? `<span class="seg" style="width:${(n / total) * 100}%;background:${color}" title="${label}: ${n}"></span>` : '';
  }).join('');
  const legend = Object.entries(STATUS).filter(([k]) => s.poStatusu[k])
    .map(([k, [label, color]]) => `<span><i style="background:${color}"></i>${label} ${s.poStatusu[k]}</span>`).join('');
  return `<div class="bar">${segs}</div><div class="legend">${legend}</div>`;
}

function timeline(s) {
  const pts = [s.start, s.today, s.prognoza, s.plan, ...s.milestones.flatMap((m) => [m.rok, m.rokPrvi, m.done])].filter(Boolean).map(day);
  if (pts.length < 2 || !s.imaRokove) return '<p class="hint">Vremenska linija se pojavi kad milestonei imaju rokove (<code>/kickstart --nadogradi</code>).</p>';
  const min = Math.min(...pts) - DAY;
  const max = Math.max(...pts) + DAY;
  // Procenti bez viewBox-a: krugovi ostaju okrugli, a tekst se ne rasteže. Lijevih 10% je za oznake.
  const x = (iso) => (10 + ((day(iso) - min) / (max - min)) * 88).toFixed(2);
  const rows = s.milestones.map((m, i) => {
    const y = 18 + i * 26;
    const plan = m.rok ? `<circle cx="${x(m.rok)}%" cy="${y}" r="5" class="plan"><title>${m.id} rok ${m.rok}</title></circle>` : '';
    const moved = m.rokPrvi && m.rokPrvi !== m.rok ? `<circle cx="${x(m.rokPrvi)}%" cy="${y}" r="4" class="moved"><title>${m.id} prvobitni rok ${m.rokPrvi}</title></circle>` : '';
    const done = m.done ? `<circle cx="${x(m.done)}%" cy="${y}" r="5" class="done"><title>${m.id} gotovo ${m.done}</title></circle>` : '';
    return `<text x="0" y="${y + 4}" class="lbl">${esc(m.id)}</text><line x1="10%" x2="98%" y1="${y}" y2="${y}" class="track"/>${moved}${plan}${done}`;
  }).join('');
  const h = 18 + s.milestones.length * 26;
  return `<svg class="tl" width="100%" height="${h}" role="img" aria-label="Vremenska linija milestonea">
<line x1="${x(s.today)}%" x2="${x(s.today)}%" y1="0" y2="${h}" class="today"/>${rows}</svg>
<div class="legend"><span><i class="c-plan"></i>rok</span><span><i class="c-done"></i>završeno</span><span><i class="c-moved"></i>prvobitni rok</span><span><i class="c-today"></i>danas ${esc(s.today)}</span></div>`;
}

function milestoneRows(s) {
  const st = new Map(s.features.map((f) => [f.id, f.status]));
  const late = new Map(s.late.map((l) => [l.id, l.dana]));
  return s.milestones.map((m) => {
    const fs = m.features.filter((id) => !['uklonjena', 'odlozeno'].includes(st.get(id)));
    const ok = fs.filter((id) => st.get(id) === 'radi').length;
    const pct = fs.length ? Math.round((ok / fs.length) * 100) : (m.status === 'gotovo' ? 100 : 0);
    const badge = m.status === 'gotovo' ? `<b class="b ok">gotovo${m.done ? ' ' + esc(m.done) : ''}</b>`
      : late.has(m.id) ? `<b class="b bad">kasni ${late.get(m.id)} d</b>` : `<b class="b ${m.status === 'u toku' ? 'warn' : ''}">${esc(m.status)}</b>`;
    const rok = m.rok ? (m.rokPrvi !== m.rok ? `<s>${esc(m.rokPrvi)}</s> ${esc(m.rok)}` : esc(m.rok)) : '—';
    return `<tr><td><strong>${esc(m.id)}</strong></td><td>${badge}</td><td>${rok}</td>
<td><div class="mini"><span style="width:${pct}%"></span></div> ${ok}/${fs.length}</td><td class="f">${esc(m.features.join(' ')) || '—'}</td></tr>`;
  }).join('');
}

function render(s, name) {
  const state = s.mvpGotov ? 'MVP gotov: vrijeme za <code>/izdanje</code>'
    : s.late.length ? `${esc(s.late[0].id)} kasni ${s.late[0].dana} d` : s.current ? `${esc(s.current.id)} ${esc(s.current.status)}` : '';
  const prog = s.prognoza ? `Prognoza MVP: <strong>${esc(s.prognoza)}</strong>${s.plan && s.plan !== s.prognoza ? ` (plan ${esc(s.plan)})` : ''}` : '';
  return `<!doctype html><html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Napredak: ${esc(name)}</title><style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#8a877f;--line:#dcd8cf;--card:#fff;--ok:#2f8f5b;--warn:#c98a12;--bad:#c2412d;--acc:#3a6ea5}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#ecebe6;--muted:#8f8c84;--line:#3a3935;--card:#1f1f1c;--ok:#4fb57f;--warn:#e0a53a;--bad:#e2654f;--acc:#6f9fd6}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px;font-size:22px}h2{font-size:15px;margin:28px 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.big{font-size:48px;font-weight:700;line-height:1}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.top{display:flex;gap:24px;align-items:center;flex-wrap:wrap}.bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--line)}.seg{height:100%}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:13px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:8px 6px;border-top:1px solid var(--line);vertical-align:middle}td.f{color:var(--muted);font-size:12px}
.b{font-weight:600;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--line)}.b.ok{background:var(--ok);color:#fff}.b.warn{background:var(--warn);color:#fff}.b.bad{background:var(--bad);color:#fff}
.mini{display:inline-block;width:80px;height:8px;border-radius:4px;background:var(--line);overflow:hidden;vertical-align:middle}.mini span{display:block;height:100%;background:var(--ok)}
.tl{width:100%;overflow:visible}.track{stroke:var(--line);stroke-width:2;vector-effect:non-scaling-stroke}.today{stroke:var(--acc);stroke-dasharray:3 3;vector-effect:non-scaling-stroke}
.plan{fill:var(--card);stroke:var(--fg);stroke-width:2;vector-effect:non-scaling-stroke}.done{fill:var(--ok)}.moved{fill:var(--line)}.lbl{font-size:12px;fill:var(--muted);font-weight:600}
.c-plan{border:2px solid var(--fg);background:transparent!important}.c-done{background:var(--ok)}.c-moved{background:var(--line)}.c-today{background:var(--acc)}
.hint{color:var(--muted);font-size:13px}.scroll{overflow-x:auto}
</style></head><body><main>
<h1>${esc(name)}</h1><p class="hint">Stanje ${esc(s.today)} · izvor: docs/BLUEPRINT.md i docs/INVENTAR-FUNKCIJA.md</p>
<div class="card top"><div><div class="big">${s.procenat}%</div><div class="hint">${s.radiF}/${s.ukupnoF} funkcija radi</div></div>
<div><div><strong>${state}</strong></div><div>Milestonei ${s.gotovoM}/${s.ukupnoM}</div><div>${prog}</div></div></div>
<h2>Funkcije</h2><div class="card">${featureBar(s)}</div>
<h2>Vremenska linija</h2><div class="card">${timeline(s)}</div>
<h2>Milestonei</h2><div class="card scroll"><table>${milestoneRows(s)}</table></div>
</main></body></html>`;
}

module.exports = { render };
