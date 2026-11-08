#!/usr/bin/env node
// Snimci ekrana po ulogama i širinama + mjerenja koja se ne vide u HTTP 200: vodoravni prelom, elementi
// šire od prozora, greške u konzoli i pristupačnost (axe-core). Bez npm zavisnosti plugina: Playwright i
// axe-core se traže u projektu, u ~/.cache/provjera-izgleda ili globalno. Upotreba: vidi SKILL.md.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const DEFAULT_WIDTHS = [1440, 1280, 1024];

function slug(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// "$IME" ili "${IME}" čita se iz okruženja, da lozinke ne idu u repo. Ostalo je doslovno.
function resolveValue(value, env = process.env) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (!m) return value;
  if (env[m[1]] === undefined) throw new Error(`varijabla okruženja ${m[1]} nije postavljena`);
  return env[m[1]];
}

function validate(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['konfiguracija nije JSON objekat'];
  if (typeof config.adresa !== 'string' || !/^https?:\/\//.test(config.adresa)) errors.push('"adresa" mora biti http(s) URL');
  const widths = config.sirine ?? DEFAULT_WIDTHS;
  if (!Array.isArray(widths) || !widths.length || widths.some(w => !Number.isInteger(w) || w < 200)) {
    errors.push('"sirine" mora biti lista cijelih brojeva >= 200');
  }
  const roles = config.uloge ?? [{ ime: 'gost' }];
  if (!Array.isArray(roles) || !roles.length) errors.push('"uloge" mora biti neprazna lista');
  const roleNames = new Set();
  for (const r of Array.isArray(roles) ? roles : []) {
    if (!r || typeof r.ime !== 'string' || !r.ime) { errors.push('svaka uloga treba "ime"'); continue; }
    if (roleNames.has(r.ime)) errors.push(`uloga "${r.ime}" je navedena dvaput`);
    roleNames.add(r.ime);
    if (r.prijava) {
      const p = r.prijava;
      if (typeof p.putanja !== 'string') errors.push(`uloga "${r.ime}": prijava treba "putanja"`);
      if (!p.polja || typeof p.polja !== 'object') errors.push(`uloga "${r.ime}": prijava treba "polja" {selektor: vrijednost}`);
      if (typeof p.dugme !== 'string') errors.push(`uloga "${r.ime}": prijava treba "dugme" (selektor)`);
    }
  }
  if (!Array.isArray(config.ekrani) || !config.ekrani.length) errors.push('"ekrani" mora biti neprazna lista');
  const screenNames = new Set();
  for (const s of Array.isArray(config.ekrani) ? config.ekrani : []) {
    if (!s || typeof s.ime !== 'string' || typeof s.putanja !== 'string') { errors.push('svaki ekran treba "ime" i "putanja"'); continue; }
    if (screenNames.has(s.ime)) errors.push(`ekran "${s.ime}" je naveden dvaput`);
    screenNames.add(s.ime);
    for (const u of s.uloge || []) if (!roleNames.has(u)) errors.push(`ekran "${s.ime}": nepoznata uloga "${u}"`);
  }
  return errors;
}

function loadConfig(file) {
  let config;
  try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    throw new Error(`ne mogu pročitati ${file}: ${e.message}`);
  }
  const errors = validate(config);
  if (errors.length) throw new Error(`${file}:\n- ` + errors.join('\n- '));
  return { sirine: DEFAULT_WIDTHS, uloge: [{ ime: 'gost' }], visina: 900, sakrij: [], ...config };
}

// Sve kombinacije uloga × širina × ekran, uz ograničenje ekrana na uloge i filtere iz komandne linije.
function plan(config, filters = {}) {
  const items = [];
  for (const role of config.uloge) {
    if (filters.uloga && role.ime !== filters.uloga) continue;
    for (const width of config.sirine) {
      if (filters.sirina && width !== filters.sirina) continue;
      for (const screen of config.ekrani) {
        if (filters.ekran && screen.ime !== filters.ekran) continue;
        if (screen.uloge && !screen.uloge.includes(role.ime)) continue;
        items.push({ role, width, screen, file: path.join(slug(role.ime), String(width), slug(screen.ime) + '.png') });
      }
    }
  }
  return items;
}

const IMPACT = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function summarize(results, meta = {}) {
  const lines = ['# Provjera izgleda', ''];
  if (meta.adresa) lines.push(`Adresa: ${meta.adresa} · ${meta.vrijeme || ''}`.trim(), '');
  if (meta.axe === false) lines.push('⚠ axe-core nije pronađen: pristupačnost nije mjerena.', '');
  lines.push('| Uloga | Širina | Ekran | HTTP | Prelom | Šire od prozora | Konzola | Pristupačnost |', '|---|---|---|---|---|---|---|---|');
  const rules = new Map();
  for (const r of results) {
    const a11y = r.axe ? r.axe.map(v => `${v.impact}:${v.id}`).join(', ') || '—' : r.axeGreska ? 'nije izmjereno' : 'n/a';
    lines.push(`| ${r.uloga} | ${r.sirina} | [${r.ekran}](${r.snimak.split(path.sep).join('/')}) | ${r.greska ? 'GREŠKA' : r.status ?? '?'} | `
      + `${r.prelom ? 'DA' : '—'} | ${r.siroki?.length || '—'} | ${r.konzola?.length || '—'} | ${a11y} |`);
    for (const v of r.axe || []) {
      const cur = rules.get(v.id) || { ...v, ekrani: new Set() };
      cur.ekrani.add(r.ekran);
      rules.set(v.id, cur);
    }
  }
  if (rules.size) {
    lines.push('', '## Pristupačnost po pravilu', '');
    const sorted = [...rules.values()].sort((a, b) => (IMPACT[a.impact] ?? 9) - (IMPACT[b.impact] ?? 9) || b.ekrani.size - a.ekrani.size);
    for (const v of sorted) lines.push(`- **${v.impact}** \`${v.id}\`: ${v.help} (ekrana: ${v.ekrani.size}: ${[...v.ekrani].join(', ')})`);
  }
  const forbidden = results.filter(r => !r.greska && r.status >= 400);
  if (forbidden.length) {
    lines.push('', '## Ekrani zabranjeni ulozi (HTTP 4xx)', '', 'Provjeri da je zabrana namjerna (prava pristupa). Pristupačnost se tu ne mjeri.', '');
    for (const key of new Set(forbidden.map(r => `${r.uloga}: ${r.ekran} (${r.status})`))) lines.push(`- ${key}`);
  }
  const axeFailed = results.filter(r => r.axeGreska);
  if (axeFailed.length) {
    lines.push('', '## Pristupačnost nije izmjerena (snimak postoji)', '');
    for (const r of axeFailed) lines.push(`- ${r.uloga} / ${r.sirina} / ${r.ekran}: ${r.axeGreska}`);
  }
  const failed = results.filter(r => r.greska || r.prijavaPala);
  if (failed.length) {
    lines.push('', '## Nije snimljeno ili je završilo na prijavi', '');
    for (const r of failed) lines.push(`- ${r.uloga} / ${r.sirina} / ${r.ekran}: ${r.greska || 'stranica je preusmjerila na prijavu'}`);
  }
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const out = { config: '.claude/izgled.json', izlaz: null, axe: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--config') out.config = next();
    else if (a === '--izlaz') out.izlaz = next();
    else if (a === '--uloga') out.uloga = next();
    else if (a === '--ekran') out.ekran = next();
    else if (a === '--sirina') out.sirina = Number(next());
    else if (a === '--bez-axe') out.axe = false;
    else throw new Error(`nepoznat argument: ${a}`);
  }
  return out;
}

let globalRoot;
function npmGlobalRoot() {
  if (globalRoot === undefined) {
    const r = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32', timeout: 15000, windowsHide: true });
    globalRoot = r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  }
  return globalRoot;
}

// Redom: projekt, ~/.cache/provjera-izgleda, NODE_PATH/folder plugina, pa globalni npm. Globalna instalacija
// je često ona uz koju je već instaliran Chromium, pa je bolja od nove kopije druge verzije.
function findModule(name, cwd = process.cwd(), opts = {}) {
  const bases = [path.join(cwd, 'package.json'), path.join(os.homedir(), '.cache', 'provjera-izgleda', 'package.json'), __filename];
  for (const base of bases) {
    try { return createRequire(base).resolve(name); } catch { /* sljedeće mjesto */ }
  }
  const global = opts.globalRoot !== undefined ? opts.globalRoot : npmGlobalRoot();
  if (global) {
    try { return require.resolve(path.join(global, name)); } catch { /* nema ni globalno */ }
  }
  return null;
}

async function login(page, base, role) {
  const p = role.prijava;
  await page.goto(new URL(p.putanja, base).href, { waitUntil: 'networkidle' });
  for (const [selector, value] of Object.entries(p.polja)) await page.fill(selector, String(resolveValue(value)));
  await Promise.all([page.waitForLoadState('networkidle'), page.click(p.dugme)]);
  if (p.cekaj) await page.waitForURL(u => u.pathname.startsWith(p.cekaj), { timeout: 15000 });
}

async function measure(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const prelom = document.documentElement.scrollWidth > vw + 1;
    const siroki = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
        const parent = el.parentElement && el.parentElement.getBoundingClientRect();
        if (parent && parent.right > vw + 1) continue; // prijavi najviši element koji izlazi
        siroki.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList[0] ? '.' + el.classList[0] : '')));
        if (siroki.length >= 5) break;
      }
    }
    return { prelom, siroki };
  });
}

async function main(argv) {
  const args = parseArgs(argv);
  const config = loadConfig(args.config);
  const outDir = path.resolve(args.izlaz || path.join(os.tmpdir(), 'provjera-izgleda', new Date().toISOString().slice(0, 10)));
  const pw = findModule('playwright') || findModule('@playwright/test');
  if (!pw) throw new Error('Playwright nije pronađen. Instaliraj ga u projekt (npm i -D playwright) ili u ~/.cache/provjera-izgleda (npm i playwright axe-core), pa `npx playwright install chromium`.');
  const { chromium } = require(pw);
  const axePath = args.axe ? findModule('axe-core') : null;
  const axeSource = axePath ? fs.readFileSync(path.join(path.dirname(axePath), 'axe.min.js'), 'utf8') : null;
  const items = plan(config, args);
  if (!items.length) throw new Error('filteri ne daju nijedan ekran');
  const browser = await chromium.launch(process.env.PROVJERA_IZGLEDA_CHROMIUM ? { executablePath: process.env.PROVJERA_IZGLEDA_CHROMIUM } : {});
  const results = [];
  try {
    for (const role of config.uloge) {
      const mine = items.filter(i => i.role === role);
      if (!mine.length) continue;
      // bypassCSP: axe se ubacuje kao inline skripta, a stroga CSP (script-src 'self') bi je blokirala.
      const context = await browser.newContext({ viewport: { width: config.sirine[0], height: config.visina }, deviceScaleFactor: 1, bypassCSP: true });
      const page = await context.newPage();
      let loginError = null;
      if (role.prijava) { try { await login(page, config.adresa, role); } catch (e) { loginError = 'prijava nije uspjela: ' + e.message.split('\n')[0]; } }
      const total = new Map();
      for (const item of mine) total.set(item.width, (total.get(item.width) || 0) + 1);
      const doneCount = new Map();
      for (const item of mine) {
        doneCount.set(item.width, (doneCount.get(item.width) || 0) + 1);
        const n = doneCount.get(item.width), all = total.get(item.width);
        if (n === all || n % 10 === 0) console.log(`${role.ime} ${item.width}: ${n}/${all}`);
        const row = { uloga: role.ime, sirina: item.width, ekran: item.screen.ime, snimak: item.file };
        results.push(row);
        if (loginError) { row.greska = loginError; continue; }
        const konzola = [];
        const onConsole = m => { if (m.type() === 'error') konzola.push(m.text().slice(0, 200)); };
        page.on('console', onConsole);
        try {
          await page.setViewportSize({ width: item.width, height: config.visina });
          const resp = await page.goto(new URL(item.screen.putanja, config.adresa).href, { waitUntil: 'networkidle' });
          row.status = resp ? resp.status() : null;
          if (role.prijava && new URL(page.url()).pathname === role.prijava.putanja) row.prijavaPala = true;
          Object.assign(row, await measure(page));
          const file = path.join(outDir, item.file);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          const mask = (config.sakrij || []).map(s => page.locator(s));
          await page.screenshot({ path: file, fullPage: true, mask, animations: 'disabled' });
          if (axeSource && !(row.status >= 400) && !row.prijavaPala) {
            try {
              await page.addScriptTag({ content: axeSource });
              const res = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
              row.axe = res.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, cvorova: v.nodes.length,
                primjeri: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
            } catch (e) {
              row.axeGreska = e.message.split('\n')[0]; // snimak postoji; samo mjerenje nije uspjelo
            }
          }
        } catch (e) {
          row.greska = e.message.split('\n')[0];
        } finally {
          row.konzola = konzola;
          page.off('console', onConsole);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'izvjestaj.json'), JSON.stringify({ adresa: config.adresa, axe: !!axeSource, rezultati: results }, null, 2));
  fs.writeFileSync(path.join(outDir, 'izvjestaj.md'), summarize(results, { adresa: config.adresa, vrijeme: new Date().toISOString(), axe: !!axeSource }));
  console.log(`Snimljeno ${results.filter(r => !r.greska).length}/${results.length}. Izvještaj: ${path.join(outDir, 'izvjestaj.md')}`);
  return results.some(r => r.greska) ? 1 : 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(code => process.exit(code), e => { console.error(e.message); process.exit(2); });
}

module.exports = { slug, resolveValue, validate, loadConfig, plan, summarize, parseArgs, findModule, DEFAULT_WIDTHS };
