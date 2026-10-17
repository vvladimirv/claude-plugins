// Start i kraj sesije: upozorenja o lokaciji, git hookovi, podsjetnik na necommitovan rad.

const fs = require('fs');
const path = require('path');
const { git, isGitRepo, loadState, saveState, noKickstart } = require('./common');

const SYNC_DIRS = /onedrive|dropbox|google drive|icloud/i;
const UI_FILE = /\.(css|scss|sass|less|jsx|tsx|vue|svelte|html?)$/i;
const MAX_FILES = 10;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function locationMessage(root) {
  const notes = [];
  if (SYNC_DIRS.test(root)) {
    notes.push('⚠️ Projekat je u sync folderu (OneDrive/Dropbox). Git i sync servis se svađaju: pokvaren `.git`, konflikti. '
      + 'Predloži korisniku premještanje u `C:\\dev\\<ime>` i sinhronizaciju preko GitHuba.');
  }
  return notes.length ? '## Lokacija\n' + notes.join('\n') : null;
}

// Git hookovi iz .githooks/ se ne kloniraju automatski, pa ih uključi na ovom računaru.
function ensureHooksPath(root) {
  if (!isGitRepo(root) || !fs.existsSync(path.join(root, '.githooks'))) return;
  if (git(root, ['config', '--get', 'core.hooksPath']) === '') {
    git(root, ['config', 'core.hooksPath', '.githooks']);
  }
}

function uncommitted(root, now) {
  if (!isGitRepo(root)) return null;
  const files = git(root, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
  if (!files.length) return null;
  let oldest = now;
  for (const f of files) {
    try {
      oldest = Math.min(oldest, fs.statSync(path.join(root, f)).mtimeMs);
    } catch {
      // obrisan fajl: nema mtime
    }
  }
  return { count: files.length, ageMs: now - oldest, ui: files.some((f) => UI_FILE.test(f)) };
}

// U projektu bez kickstarta i bez STATUS.md /kraj-sesije stane, pa podsjetnik upućuje na pravila projekta.
function saveHint(root) {
  return noKickstart(root) && !fs.existsSync(path.join(root, 'STATUS.md'))
    ? 'commit po pravilima projekta (AGENTS.md/CLAUDE.md)' : '`/kraj-sesije`';
}

// Stop: podsjetnik korisniku, najviše jednom po sesiji za isti nivo.
function stopReminder(input, root, now = Date.now()) {
  const u = uncommitted(root, now);
  if (!u || (u.count < MAX_FILES && u.ageMs < MAX_AGE_MS)) return null;
  const level = `${u.count >= MAX_FILES ? 'f' : ''}${u.ageMs >= MAX_AGE_MS ? 't' : ''}`;
  const state = loadState('stop', input.session_id);
  if (state[root] === level) return null;
  state[root] = level;
  saveState('stop', input.session_id, state);
  const hours = Math.floor(u.ageMs / 3600000);
  let msg = `💾 Necommitovano: ${u.count} fajlova` + (hours >= 2 ? `, najstarija izmjena prije ${hours} h` : '')
    + `. Snimi save point: ${saveHint(root)}.`;
  if (u.ui) msg += ' Mijenjan je UI: prije commita pokreni screenshot testove.';
  return msg;
}

module.exports = { locationMessage, ensureHooksPath, stopReminder, uncommitted };
