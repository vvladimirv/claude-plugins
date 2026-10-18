// /grane: pregled svih grana, čišćenje gotovih i opis trenutne grane.
// node grane-cli.js pregled [--json] [--bez-githuba] [--root <projekat>]
// node grane-cli.js pocisti --spisak|--izvrsi [--preskoci a,b] [--bez-githuba] [--root <projekat>]
// node grane-cli.js upisi [--zadatak "…"] [--baza X] [--ceka Y] [--model opus|sonnet|haiku] [--effort low|medium|high]
// node grane-cli.js preporuka "<zadatak>"

const path = require('path');
const map = require('./lib/branch-map');
const { recommend, label } = require('./lib/branches');

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

function report(root, opts) {
  return map.collect(root, { prs: opts['bez-githuba'] ? null : map.fetchPrs(root) });
}

function planText(plan) {
  const out = [];
  for (const it of plan.items) {
    const what = it.branch ? `grana \`${it.branch}\`${it.worktree ? ` i folder \`${path.basename(it.worktree)}\`` : ''}` : `folder \`${path.basename(it.worktree)}\``;
    out.push(`- ${what}${it.remote ? ` (na GitHubu još postoji \`${it.remote}\`)` : ''}`);
  }
  for (const k of plan.kept) out.push(`- ostaje \`${k.branch}\`: ${k.reason}`);
  if (plan.prune) out.push('- folderi kojih više nema na disku se brišu iz liste');
  return out.length ? out.join('\n') : 'Nema ničega za čišćenje.';
}

async function main(argv) {
  const opts = args(argv);
  const root = path.resolve(typeof opts.root === 'string' ? opts.root : process.cwd());
  const cmd = opts._[0] || 'pregled';

  if (cmd === 'pregled') {
    const rep = await report(root, opts);
    return opts.json ? JSON.stringify(rep, null, 2) : map.format(rep);
  }
  if (cmd === 'pocisti') {
    const rep = await report(root, opts);
    const skip = typeof opts.preskoci === 'string' ? opts.preskoci.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const plan = map.cleanupPlan(rep, { here: root, skip });
    if (!opts.izvrsi) return opts.json ? JSON.stringify(plan, null, 2) : planText(plan);
    const res = await map.cleanup(plan);
    const lines = res.done.map((it) => `✅ ${it.branch ? `\`${it.branch}\`` : `folder \`${path.basename(it.worktree)}\``}`);
    for (const f of res.failed) lines.push(`⚠️ ${f.branch || path.basename(f.worktree)}: ${f.error}`);
    const remote = res.done.filter((it) => it.remote).map((it) => it.remote);
    if (remote.length) lines.push(`Na GitHubu još postoje: ${remote.map((r) => '`' + r + '`').join(', ')}`);
    return lines.join('\n') || 'Nema ničega za čišćenje.';
  }
  if (cmd === 'upisi') {
    const res = await map.register(root, {
      zadatak: typeof opts.zadatak === 'string' ? opts.zadatak : undefined,
      baza: typeof opts.baza === 'string' ? opts.baza : undefined,
      ceka: typeof opts.ceka === 'string' ? opts.ceka : undefined,
      model: typeof opts.model === 'string' ? opts.model.toLowerCase() : undefined,
      effort: typeof opts.effort === 'string' ? opts.effort.toLowerCase() : undefined,
    });
    if (!res.ok) process.exitCode = 1;
    return res.msg;
  }
  if (cmd === 'preporuka') {
    const rec = recommend(opts._.slice(1).join(' '));
    return `${label(rec)} (model: ${rec.model}, effort: ${rec.effort})`;
  }
  process.exitCode = 1;
  return `Nepoznata komanda: ${cmd}. Komande: pregled, pocisti, upisi, preporuka.`;
}

if (require.main === module) main(process.argv.slice(2)).then((out) => console.log(out));

module.exports = { main, args };
