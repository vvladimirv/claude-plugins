const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { report, logEntries } = require('../zdravlje-cli');

const NOW = Date.parse('2026-10-17T12:00:00Z');

test('zdravlje: log broji samo zadnjih 7 dana i odvaja spore pozive od grešaka', () => {
  const log = [
    '2026-10-01T10:00:00.000Z project-guard/sync: staro',
    '2026-10-16T10:00:00.000Z project-guard/lock: Error: EPERM',
    '    at Object.writeFileSync (node:fs:1:1)',
    '2026-10-16T11:00:00.000Z project-guard/sporo/PreToolUse Bash: 340 ms',
  ].join('\n');
  const e = logEntries(log, NOW);
  assert.strictEqual(e.length, 2);
  fs.writeFileSync(path.join(h.HOME, 'pravila.log'), log);
  try {
    const r = report({ now: NOW });
    assert.ok(r.warn.some((l) => /1 grešaka hookova/.test(l) && /EPERM/.test(l)));
    assert.ok(r.warn.some((l) => /1 sporih poziva .*340 ms/.test(l)));
  } finally {
    fs.rmSync(path.join(h.HOME, 'pravila.log'));
  }
});

test('zdravlje: bez loga i sa auto-updateom sve je zeleno, a isključeni git hookovi se prijave', () => {
  fs.writeFileSync(path.join(h.HOME, 'settings.json'), JSON.stringify({ extraKnownMarketplaces: { 'moji-pluginsi': { autoUpdate: true } } }));
  const root = h.project({ git: true, files: { '.githooks/pre-commit': '#!/bin/sh\n' } });
  try {
    const r = report({ root, now: NOW });
    assert.ok(r.ok.includes('auto-update plugina uključen'));
    assert.ok(r.ok.includes('hookovi bez grešaka u zadnjih 7 dana'));
    assert.ok(r.warn.some((l) => /git hookovi nisu uključeni/.test(l)));
  } finally {
    fs.rmSync(path.join(h.HOME, 'settings.json'));
  }
});

test('zdravlje: lokalni izvor ne traži GitHub auto-update', () => {
  const file = path.join(h.HOME, 'plugins', 'known_marketplaces.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ 'moji-pluginsi': { source: { source: 'directory', path: 'C:/dev/claude-plugins' } } }));
  try {
    const r = report({ now: NOW });
    assert.ok(r.ok.some(l => /lokalni izvor plugina/.test(l)));
    assert.ok(!r.warn.some(l => /auto-update/.test(l)));
  } finally { fs.rmSync(file); }
});

test('zdravlje: svih pet pluginova i lični sloj (CLAUDE.md uvoz, claude-licno prema GitHubu)', () => {
  const { execFileSync } = require('child_process');
  const plugDir = path.join(h.HOME, 'plugins');
  fs.mkdirSync(plugDir, { recursive: true });
  const names = ['project-guard', 'project-memory', 'project-kickstart', 'project-quality'];
  fs.writeFileSync(path.join(plugDir, 'installed_plugins.json'), JSON.stringify({ plugins:
    Object.fromEntries(names.map((n) => [`${n}@moji-pluginsi`, [{ version: '1.0.0' }]])) }));
  fs.writeFileSync(path.join(h.HOME, 'settings.json'), JSON.stringify({ enabledPlugins: { 'project-quality@moji-pluginsi': false } }));
  const bare = path.join(h.BASE, 'licno-zdravlje.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  const repo = path.join(h.DEV, 'claude-licno');
  execFileSync('git', ['clone', '-q', bare, repo], { stdio: 'ignore' });
  const g = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
  g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  fs.writeFileSync(path.join(repo, 'GLOBALNO.md'), 'x\n');
  g('add', '-A'); g('commit', '-qm', 'prvi'); g('push', '-q', 'origin', 'HEAD:main');
  try {
    let r = report({ now: NOW });
    assert.ok(r.warn.some((l) => /project-market nije instaliran/.test(l)));
    assert.ok(r.warn.some((l) => /project-quality je isključen/.test(l)));
    assert.ok(r.ok.some((l) => /pluginovi: guard 1\.0\.0, memory 1\.0\.0, kickstart 1\.0\.0/.test(l)));
    assert.ok(r.warn.some((l) => /CLAUDE\.md ne uvozi claude-licno/.test(l)));
    assert.ok(r.ok.includes('claude-licno je isti kao na GitHubu'));
    fs.writeFileSync(path.join(h.HOME, 'CLAUDE.md'), `@${repo.split(path.sep).join('/')}/GLOBALNO.md\n`);
    g('commit', '-q', '--allow-empty', '-m', 'lokalno');
    r = report({ now: NOW });
    assert.ok(r.ok.includes('~/.claude/CLAUDE.md uvozi claude-licno'));
    assert.ok(r.warn.some((l) => /claude-licno ima 1 commita koji nisu na GitHubu/.test(l)));
    g('push', '-q', 'origin', 'HEAD:main');
    g('reset', '-q', '--hard', 'HEAD~1');
    r = report({ now: NOW });
    assert.ok(r.warn.some((l) => /claude-licno je iza GitHuba \(1\)/.test(l)));
  } finally {
    for (const p of [plugDir, path.join(h.HOME, 'settings.json'), path.join(h.HOME, 'CLAUDE.md'), repo]) fs.rmSync(p, { recursive: true, force: true });
  }
});
