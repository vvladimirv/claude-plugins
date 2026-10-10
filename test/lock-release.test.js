// /kraj-sesije oslobađa bravu naredbom koja je upisana u njegov SKILL.md. Test izvlači tu naredbu iz skilla i
// izvršava je, pa se tekst skilla i ponašanje brave ne mogu razići (ime fajla, polje session_id, ID sesije).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { isWrite, LOCK } = require('../plugins/project-guard/hooks/lib/lock');

const SKILL = path.join(__dirname, '..', 'plugins', 'project-memory', 'skills', 'kraj-sesije', 'SKILL.md');
const PREFIX = 'node -e "';

// Naredba iz bloka koda ispod „Ne, ostavi otvorenu". Skill dobija ID sesije zamjenom ${CLAUDE_SESSION_ID}.
function releaseCommand(sessionId) {
  const text = fs.readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/\*\*Ne, ostavi otvorenu:\*\*[^\n]*\n\s*```bash\n\s*(node -e "[^\n]*")\n\s*```/);
  assert.ok(m, 'kraj-sesije: nema naredbe za oslobađanje brave ispod „Ne, ostavi otvorenu"');
  assert.ok(m[1].includes('${CLAUDE_SESSION_ID}'), 'naredba mora koristiti ${CLAUDE_SESSION_ID}');
  return m[1].replace('${CLAUDE_SESSION_ID}', sessionId);
}

// Pokreće JS iz naredbe bez shella (isto na Windowsu i Linuxu); shell-sigurnost se provjerava posebno.
function run(sessionId, cwd) {
  const cmd = releaseCommand(sessionId);
  assert.ok(cmd.startsWith(PREFIX) && cmd.endsWith('"'), 'naredba mora biti oblika node -e "..."');
  const js = cmd.slice(PREFIX.length, -1);
  assert.ok(!/["`$\\!]/.test(js), 'JS u naredbi ne smije imati navodnike, $, ` ni \\: shell bi ih drugačije prenio');
  return execFileSync(process.execPath, ['-e', js], { cwd, encoding: 'utf8' }).trim();
}

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kraj-brava-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function putLock(dir, sid) {
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(dir, LOCK), JSON.stringify({ agent: 'claude', session_id: sid, since: now, heartbeat: now }));
}

test('kraj-sesije: vlastita brava se oslobađa', (t) => {
  const dir = tmp(t);
  putLock(dir, 'sesija-A');
  assert.match(run('sesija-A', dir), /oslobođena/);
  assert.ok(!fs.existsSync(path.join(dir, LOCK)));
});

test('kraj-sesije: tuđa brava ostaje', (t) => {
  const dir = tmp(t);
  putLock(dir, 'sesija-B');
  assert.match(run('sesija-A', dir), /tuđa/);
  assert.ok(fs.existsSync(path.join(dir, LOCK)));
});

test('kraj-sesije: bez brave ili sa pokvarenom bravom nema greške', (t) => {
  const dir = tmp(t);
  assert.match(run('sesija-A', dir), /nema/);
  fs.writeFileSync(path.join(dir, LOCK), '{pokvareno');
  assert.match(run('sesija-A', dir), /nije dirana/);
  assert.ok(fs.existsSync(path.join(dir, LOCK)), 'pokvarena brava se ne briše');
});

test('kraj-sesije: naredba za oslobađanje nije „pisanje", pa prolazi i iz blokirane sesije', () => {
  assert.strictEqual(isWrite({ tool_name: 'Bash', tool_input: { command: releaseCommand('sesija-A') } }), false);
});
