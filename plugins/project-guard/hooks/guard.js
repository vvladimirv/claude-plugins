// Ulazna tačka svih project-guard hookova. Događaj se čita iz hook_event_name.
// Fail-open: greška u bilo kojem pravilu se loguje i rad se ne blokira.
// Zaštita tajni se provjerava prva i ne zavisi od prekidača.

const fs = require('fs');
const common = require('./lib/common');
const secrets = require('./lib/secrets');
const gate = require('./lib/gate');
const lock = require('./lib/lock');
const size = require('./lib/size');
const scope = require('./lib/scope');
const session = require('./lib/session');
const deps = require('./lib/deps');

function safe(name, fn, fallback = null) {
  try {
    return fn();
  } catch (err) {
    common.logError(name, err);
    return fallback;
  }
}

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function preToolUse(input, root) {
  const secret = safe('secrets', () => secrets.check(input, root));
  if (secret) return deny(secret);
  if (common.isPaused()) return null;
  for (const [name, fn] of [['gate', gate.check], ['size', size.preCheck], ['lock', lock.check]]) {
    const reason = safe(name, () => fn(input, root));
    if (reason) return deny(reason);
  }
  const ask = safe('scope', () => scope.newFolderCheck(input, root));
  if (ask) {
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: ask } };
  }
  return null;
}

function context(event, text) {
  return text ? { hookSpecificOutput: { hookEventName: event, additionalContext: text } } : null;
}

function sessionStart(input, root) {
  safe('hooksPath', () => session.ensureHooksPath(root));
  const parts = [
    safe('location', () => session.locationMessage(root)),
    common.isPaused() ? '## Pravila\nBlokirajuća pravila su pauzirana (`/pravila-pauza`). Zaštita tajni radi.' : null,
    safe('gate', () => gate.sessionMessage(root)),
    safe('lock', () => lock.sessionMessage(root, input.session_id)),
    safe('scope', () => scope.sessionMessage(root)),
  ].filter(Boolean);
  return parts.length ? context('SessionStart', '# Pravila projekta (project-guard)\n\n' + parts.join('\n\n')) : null;
}

const HANDLERS = {
  PreToolUse: preToolUse,
  PostToolUse: (input, root) => context('PostToolUse', [
    safe('size-post', () => size.postCheck(input, root)),
    safe('deps', () => deps.postCheck(input, root)),
  ].filter(Boolean).join('\n') || null),
  UserPromptSubmit: (input, root) => context('UserPromptSubmit', safe('scope-prompt', () => scope.promptCheck(input, root))),
  SessionStart: sessionStart,
  SessionEnd: (input, root) => safe('lock-release', () => lock.release(input, root)),
  Stop: (input, root) => {
    if (input.stop_hook_active) return null;
    const msg = safe('stop', () => session.stopReminder(input, root));
    return msg ? { systemMessage: msg } : null;
  },
};

function run(input) {
  const handler = HANDLERS[input.hook_event_name];
  if (!handler) return null;
  return handler(input, common.projectRoot(input)) || null;
}

if (require.main === module) {
  let out = null;
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
    out = run(input);
  } catch (err) {
    common.logError('guard', err);
  }
  if (out) process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

module.exports = { run };
