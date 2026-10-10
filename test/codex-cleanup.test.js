// /codex-worktree čisti granu poslije spajanja PR-a. Repo spaja PR-ove squashom, a tada `git branch -d` uvijek odbije
// („not fully merged"), jer na bazi nema originalnih commitova. Čišćenje zato poredi vrh grane sa `headRefOid` iz PR-a
// i tek poslije toga koristi `-D`. Test čuva da se korak 0 (koji traži headRefOid) i čišćenje (koje ga koristi) ne raziđu.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL = path.join(__dirname, '..', 'plugins', 'project-guard', 'skills', 'codex-worktree', 'SKILL.md');

function read() {
  return fs.readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n');
}

function section(text, title) {
  const part = text.split(/^## /m).find((p) => p.startsWith(title + '\n'));
  return part ? part.slice(title.length).trim() : null;
}

test('codex-worktree: korak 0 traži headRefOid, a čišćenje ga koristi prije -D', () => {
  const text = read();
  assert.match(text, /gh pr view "codex\/<zadatak>" --json state,url,headRefOid/, 'korak 0 mora tražiti headRefOid');

  const after = section(text, 'Poslije spajanja PR-a');
  assert.ok(after, 'nema sekcije „## Poslije spajanja PR-a"');
  assert.match(after, /git branch -d "codex\/<zadatak>"/, 'prvo se pokušava siguran -d');
  assert.strictEqual((after.match(/git branch -D/g) || []).length, 1, '-D se kao naredba navodi samo jednom, uz provjeru');
  assert.ok(after.indexOf('headRefOid') < after.indexOf('git branch -D'), 'headRefOid se provjerava prije -D');
  assert.match(after, /ne koristi `-D` bez pitanja/, 'kad provjera ne prođe, -D traži pitanje');
});
