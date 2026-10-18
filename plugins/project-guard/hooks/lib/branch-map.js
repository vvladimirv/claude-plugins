// Pregled svih grana (/grane): stanje svake grane i worktreea, jedna preporučena radnja po grani, i čišćenje
// gotovih. Stanje (spojena, PR, brava, nesnimljen rad) se uvijek računa iz gita i GitHuba, pa ne može zastarjeti;
// opis grane (baza, zadatak, čeka, model) čita se iz branches.js.
// Git pozivi idu paralelno: na Windowsu svaki traje ~150 ms, a projekat može imati desetine grana i worktreeova.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { readJson, norm } = require('./common');
const { isFresh, LOCK } = require('./lock');
const {
  recommend, label, allMeta, readMeta, writeMeta, gitDirs, currentBranch, branchExists, defaultBranch, tipOf, describe,
} = require('./branches');

const DAY = 86400000;
const OLD_DAYS = 14;

// { ok, out, err } umjesto izuzetka.
function run(cmd, args, cwd, timeout = 15000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, encoding: 'utf8', timeout, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' } },
      (err, out, stderr) => resolve({ ok: !err, out: String(out || '').trim(), err: err ? String(stderr || err.message).trim().split('\n')[0] : '' }));
  });
}

const gitOut = async (cwd, args) => (await run('git', args, cwd)).out;
const gitOk = async (cwd, args) => (await run('git', args, cwd)).ok;

function parseWorktrees(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('worktree ')) out.push((cur = { path: path.resolve(line.slice(9)), branch: null, head: '' }));
    else if (!cur) continue;
    else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (line.startsWith('prunable')) cur.prunable = true;
  }
  if (out[0]) out[0].main = true;
  return out;
}

function lockOf(wtPath, now) {
  const lock = readJson(path.join(wtPath, LOCK), null);
  return isFresh(lock, now) ? lock : null;
}

async function isDirty(wtPath) {
  return fs.existsSync(wtPath) && (await gitOut(wtPath, ['status', '--porcelain'])) !== '';
}

// Reflog grane: broj zapisa (1 = samo napravljena, nikad commit) i kad je napravljena.
function reflog(commonDir, branch) {
  try {
    const lines = fs.readFileSync(path.join(commonDir, 'logs', 'refs', 'heads', ...branch.split('/')), 'utf8')
      .split('\n').filter(Boolean);
    const m = lines[0].match(/> (\d+) [+-]\d{4}\t/);
    return { count: lines.length, created: m ? Number(m[1]) * 1000 : 0 };
  } catch {
    return null;
  }
}

// PR-ovi sa GitHuba. null kad gh ne radi (nema ga, nije prijavljen, nema origin).
async function fetchPrs(root) {
  const r = await run('gh', ['pr', 'list', '--state', 'all', '--limit', '200', '--json', 'number,headRefName,state,url,headRefOid'], root);
  try {
    return r.ok ? JSON.parse(r.out) : null;
  } catch {
    return null;
  }
}

// Najnoviji PR po grani (gh ih daje od najnovijeg).
function prMap(prs) {
  const map = {};
  for (const pr of prs || []) if (!map[pr.headRefName]) map[pr.headRefName] = pr;
  return map;
}

// [ikona, naslov grupe, riječ za sažetak]
const STATES = {
  pr: ['👀', 'Čeka tvoj pregled', 'čeka pregled'],
  stala: ['⏸️', 'Stala sa nesnimljenim radom', 'stala'],
  radi: ['🔒', 'Radi se', 'radi se'],
  ceka: ['⏳', 'Čeka drugu granu', 'čeka granu'],
  otvorena: ['🌿', 'Otvorena', 'otvorena'],
  nova: ['🌱', 'Tek napravljena', 'nova'],
  stara: ['💤', 'Stara', 'stara'],
  prazna: ['🗑️', 'Prazna (ništa urađeno)', 'prazna'],
  gotova: ['✅', 'Gotova', 'gotova'],
};
const ORDER = ['pr', 'stala', 'radi', 'ceka', 'otvorena', 'nova', 'stara', 'prazna', 'gotova'];
const CLEANABLE = new Set(['gotova', 'prazna']);

function folderName(mainRoot, p) {
  return path.relative(path.dirname(mainRoot), p).split(path.sep).join('/');
}

function action(r, mainRoot) {
  const where = r.worktree && !r.worktreeIsMain ? `folderu \`${folderName(mainRoot, r.worktree)}\`` : r.worktreeIsMain ? 'glavnom folderu' : null;
  switch (r.state) {
    case 'radi': return `nastavi u sesiji koja radi u ${where}`;
    case 'pr': return `pregledaj PR i klikni Merge: ${r.pr.url}`;
    case 'stala': return `otvori sesiju u ${where} i pokreni \`/kraj-sesije\``;
    case 'ceka': return `prvo završi \`${r.ceka}\``;
    case 'nova': return 'počni rad u njenoj sesiji';
    case 'stara': return `${r.ageDays} dana bez rada: odluči da li nastavljaš ili je baciš`;
    case 'prazna':
    case 'gotova': return r.worktreeIsMain ? `prebaci glavni folder na \`${r.main}\`, pa \`/grane pocisti\`` : '`/grane pocisti`';
    default: return `nastavi u ${where || `sesiji na grani \`${r.branch}\``}; kad je gotova: \`/kraj-sesije\``;
  }
}

function classify(rows) {
  for (const r of rows) {
    if (r.lockSince) r.state = 'radi';
    else if (r.pr && r.pr.state === 'OPEN') r.state = 'pr';
    else if (r.dirty) r.state = 'stala';
    else if (r.merged) r.state = r.empty ? (r.fresh ? 'nova' : 'prazna') : 'gotova';
  }
  const byName = Object.fromEntries(rows.map((r) => [r.branch, r]));
  for (const r of rows) {
    if (r.state) continue;
    const waitsFor = byName[r.ceka];
    if (waitsFor && !CLEANABLE.has(waitsFor.state)) r.state = 'ceka';
    else if (r.ageDays > OLD_DAYS) r.state = 'stara';
    else r.state = 'otvorena';
  }
}

// prs: lista sa GitHuba, null kad GitHub nije dostupan, ili Promise jednog od toga (gh radi paralelno sa gitom).
async function collect(root, { prs = null, now = Date.now() } = {}) {
  const dirs = gitDirs(root);
  const main = defaultBranch(root);
  const originMain = tipOf(root, `origin/${main}`) ? `origin/${main}` : null;
  const mergedArgs = (ref) => ['for-each-ref', '--merged', ref, ...(ref === main && originMain ? ['--merged', originMain] : []), 'refs/heads', '--format=%(refname:short)'];
  const [wtText, refsText, intoMainText] = await Promise.all([
    gitOut(root, ['worktree', 'list', '--porcelain']),
    gitOut(root, ['for-each-ref', 'refs/heads', '--format=%(refname:short)%09%(objectname)%09%(committerdate:unix)%09%(upstream:short)%09%(upstream:track)']),
    gitOut(root, mergedArgs(main)),
  ]);
  const wts = parseWorktrees(wtText);
  const mainRoot = wts[0] ? wts[0].path : path.resolve(root);
  const meta = allMeta(root);
  const refs = refsText.split('\n').filter(Boolean).map((l) => l.split('\t')).filter(([b]) => b !== main);

  // Spojeno u glavnu ili u svoju bazu (za svaku drugu bazu jedan poziv).
  const bases = [...new Set(refs.map(([b]) => meta[b] && meta[b].base).filter((b) => b && b !== main && branchExists(root, b)))];
  const mergedSets = { [main]: new Set(intoMainText.split('\n').filter(Boolean)) };
  await Promise.all(bases.map(async (b) => {
    mergedSets[b] = new Set((await gitOut(root, mergedArgs(b))).split('\n').filter(Boolean));
  }));

  const live = wts.filter((w) => !w.prunable && fs.existsSync(w.path));
  const dirty = {};
  await Promise.all(live.map(async (w) => {
    dirty[norm(w.path)] = await isDirty(w.path);
  }));
  const prList = await prs;
  const prBy = prMap(prList);

  const rows = refs.map(([branch, tip, date, upstream, track]) => {
    const m = meta[branch] || {};
    const base = m.base && mergedSets[m.base] ? m.base : main;
    const wt = live.find((w) => w.branch === branch);
    const pr = prBy[branch] || null;
    const lock = wt ? lockOf(wt.path, now) : null;
    const squash = Boolean(pr && pr.state === 'MERGED' && pr.headRefOid === tip);
    const rl = reflog(dirs.common, branch);
    const ahead = /ahead (\d+)/.exec(track || '');
    return {
      branch, tip, main, base, baseKnown: Boolean(m.base), zadatak: m.zadatak || '', ceka: m.ceka || '',
      recommend: m.model ? { model: m.model, effort: m.effort || 'medium' } : recommend(m.zadatak),
      worktree: wt ? wt.path : null, worktreeIsMain: Boolean(wt && wt.main), dirty: Boolean(wt && dirty[norm(wt.path)]),
      lockSince: lock ? lock.since : null,
      pr: pr ? { number: pr.number, state: pr.state, url: pr.url, headRefOid: pr.headRefOid } : null,
      upstream: upstream || '', remoteGone: /gone/.test(track || ''), unpushed: upstream ? (ahead ? Number(ahead[1]) : 0) : null,
      ageDays: Math.floor((now - Number(date) * 1000) / DAY),
      merged: mergedSets[main].has(branch) || mergedSets[base].has(branch) || squash, squash,
      fresh: Boolean(rl && rl.count === 1 && now - rl.created < DAY), empty: Boolean(rl && rl.count === 1 && !pr),
    };
  });
  classify(rows);
  for (const r of rows) {
    r.waitedBy = rows.filter((x) => x.ceka === r.branch).map((x) => x.branch);
    r.action = action(r, mainRoot);
  }

  // Worktreeovi bez grane (odvojen HEAD): sigurni za brisanje samo ako je sve iz njih već u glavnoj grani.
  const folders = await Promise.all(live.filter((w) => !w.branch && !w.main).map(async (w) => {
    const lock = lockOf(w.path, now);
    const refsToCheck = [main, originMain].filter(Boolean);
    const inMain = (await Promise.all(refsToCheck.map((ref) => gitOk(root, ['merge-base', '--is-ancestor', w.head, ref])))).some(Boolean);
    const state = lock ? 'radi' : dirty[norm(w.path)] ? 'stala' : inMain ? 'gotova' : 'otvorena';
    const name = folderName(mainRoot, w.path);
    const act = {
      radi: 'nastavi u sesiji koja tu radi',
      stala: `otvori sesiju u folderu \`${name}\` i pokreni \`/kraj-sesije\``,
      gotova: '`/grane pocisti`',
      otvorena: 'ima commitove kojih nema nigdje drugo: napravi granu ili ih baci',
    }[state];
    return { path: w.path, name, head: w.head, state, action: act };
  }));
  const prunable = wts.filter((w) => w.prunable || !fs.existsSync(w.path)).length;

  return { main, mainRoot, github: prList !== null && prList !== undefined, rows, folders, prunable };
}

function rowLine(r, mainRoot) {
  const bits = [`\`${r.branch}\``];
  if (r.zadatak) bits.push(`„${r.zadatak}"`);
  if (r.baseKnown && r.base !== r.main) bits.push(`iz \`${r.base}\``);
  if (r.ceka) bits.push(`čeka \`${r.ceka}\``);
  if (r.waitedBy.length) bits.push(`nju čeka: ${r.waitedBy.map((b) => '`' + b + '`').join(', ')}`);
  if (r.pr && r.pr.state === 'MERGED' && !r.squash && !r.merged) bits.push(`PR #${r.pr.number} je spojen, ali grana ima novije commitove`);
  if (r.pr && r.pr.state === 'CLOSED') bits.push(`PR #${r.pr.number} zatvoren bez spajanja`);
  if (r.remoteGone && !r.merged) bits.push('na GitHubu obrisana (vjerovatno spojena)');
  else if (r.unpushed === null && !r.merged) bits.push('nije na GitHubu');
  else if (r.unpushed) bits.push(`${r.unpushed} commit(a) nije na GitHubu`);
  if (['otvorena', 'nova', 'ceka'].includes(r.state)) bits.push(`model: ${label(r.recommend)}`);
  return `  - ${bits.join(' · ')} → ${r.action}`;
}

function format(rep) {
  const count = (s) => rep.rows.filter((r) => r.state === s).length + rep.folders.filter((f) => f.state === s).length;
  const summary = ORDER.filter((s) => count(s)).map((s) => `${STATES[s][0]} ${count(s)} ${STATES[s][2]}`).join(' · ');
  const out = [`Grane (glavna: \`${rep.main}\`): ${summary || 'nema drugih grana'}`];
  if (!rep.github) out.push('(GitHub nije provjeren: PR-ovi se ne vide)');
  for (const s of ORDER) {
    const rows = rep.rows.filter((r) => r.state === s);
    const folders = rep.folders.filter((f) => f.state === s);
    if (!rows.length && !folders.length) continue;
    out.push('', `${STATES[s][0]} ${STATES[s][1]}`);
    if (CLEANABLE.has(s) && rows.length > 6) out.push(`  - ${rows.map((r) => '`' + r.branch + '`').join(', ')} → \`/grane pocisti\``);
    else for (const r of rows) out.push(rowLine(r, rep.mainRoot));
    for (const f of folders) out.push(`  - folder \`${f.name}\` (bez grane) → ${f.action}`);
  }
  if (rep.prunable) out.push('', `${rep.prunable} folder(a) iz liste više ne postoji na disku: \`/grane pocisti\` ih briše iz liste.`);
  return out.join('\n');
}

// Šta /grane pocisti briše. here = folder iz kojeg se pokreće (njega ne dira), skip = grane koje ne dira.
function cleanupPlan(rep, { here = null, skip = [] } = {}) {
  const items = [];
  const kept = [];
  const isHere = (p) => Boolean(here) && norm(p) === norm(here);
  for (const r of rep.rows) {
    if (!CLEANABLE.has(r.state) || skip.includes(r.branch)) continue;
    if (r.worktreeIsMain) kept.push({ branch: r.branch, reason: `glavni folder je na njoj (prebaci ga na \`${rep.main}\`)` });
    else if (r.worktree && isHere(r.worktree)) kept.push({ branch: r.branch, reason: 'ova sesija radi u njenom folderu' });
    // Na GitHubu se nudi samo grana istog imena (nikad npr. origin/main koji neka grana prati).
    else items.push({ branch: r.branch, worktree: r.worktree, remote: r.upstream === `origin/${r.branch}` && !r.remoteGone ? r.upstream : null });
  }
  for (const f of rep.folders) {
    if (f.state === 'gotova' && !isHere(f.path)) items.push({ branch: null, worktree: f.path, remote: null });
  }
  return { mainRoot: rep.mainRoot, items, kept, prune: rep.prunable > 0 };
}

// Briše lokalne foldere i grane iz plana, jedno po jedno. Grane na GitHubu ne dira (to ide posebno, uz pitanje).
async function cleanup(plan) {
  const done = [];
  const failed = [];
  for (const it of plan.items) {
    // Spojenost je već provjerena (u bazi, u glavnoj grani ili isti commit kao spojeni PR), pa -D.
    const steps = [it.worktree && ['worktree', 'remove', it.worktree], it.branch && ['branch', '-D', it.branch]].filter(Boolean);
    let error = '';
    for (const args of steps) {
      const r = await run('git', args, plan.mainRoot, 60000);
      if (!r.ok) {
        error = r.err;
        break;
      }
    }
    (error ? failed : done).push(error ? { ...it, error } : it);
  }
  if (plan.prune) await run('git', ['worktree', 'prune'], plan.mainRoot);
  return { done, failed };
}

// /grane upisi: opis trenutne grane. Uz --baza grana bez svog rada prelazi na vrh te baze.
async function register(root, opts) {
  const branch = currentBranch(root);
  if (!branch) return { ok: false, msg: 'Odvojen HEAD: nema grane kojoj bih upisao opis.' };
  const main = defaultBranch(root);
  const fields = { zadatak: opts.zadatak, ceka: opts.ceka, model: opts.model, effort: opts.effort };
  if (opts.zadatak && !opts.model) Object.assign(fields, recommend(opts.zadatak));
  if (opts.ceka && !branchExists(root, opts.ceka)) return { ok: false, msg: `Grana \`${opts.ceka}\` ne postoji.` };
  const notes = [];
  if (opts.baza) {
    if (!branchExists(root, opts.baza)) return { ok: false, msg: `Grana \`${opts.baza}\` ne postoji.` };
    const head = tipOf(root, 'HEAD');
    const target = tipOf(root, opts.baza);
    if (head !== target && !(await gitOk(root, ['merge-base', '--is-ancestor', target, 'HEAD']))) {
      const fresh = [main, `origin/${main}`].some((r) => tipOf(root, r) === head);
      let r;
      if (await gitOk(root, ['merge-base', '--is-ancestor', 'HEAD', target])) {
        r = await run('git', ['merge', '--ff-only', opts.baza], root);
        notes.push(`grana pomjerena naprijed na \`${opts.baza}\``);
      } else if (fresh && !(await isDirty(root))) {
        r = await run('git', ['reset', '--keep', opts.baza], root);
        notes.push(`grana sada počinje od \`${opts.baza}\``);
      } else {
        return { ok: false, msg: `Grana već ima svoj rad, pa je ne prebacujem na \`${opts.baza}\`. Upiši bez --baza ili pitaj korisnika.` };
      }
      if (!r.ok) return { ok: false, msg: `Prelazak na \`${opts.baza}\` nije uspio: ${r.err}` };
    }
    fields.base = opts.baza;
  }
  writeMeta(root, branch, fields);
  const meta = readMeta(root, branch);
  return { ok: true, msg: `Upisano za \`${branch}\`: ${describe(branch, meta, null)}${notes.length ? ' (' + notes.join(', ') + ')' : ''}` };
}

module.exports = { collect, format, cleanupPlan, cleanup, register, fetchPrs, STATES };
