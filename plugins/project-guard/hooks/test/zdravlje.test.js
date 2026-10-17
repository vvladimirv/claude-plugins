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
