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
const sync = require('./lib/sync');
const branches = require('./lib/branches');
const portable = require('./lib/portable');
const checks = require('../scripts/checks');

function safe(name, fn, fallback = null) {
  try {
    return fn();
  } catch (err) {
    common.logError(name, err);
    failures.push(name);
    return fallback;
  }
}
let failures = [];

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function preToolUse(input, root) {
  let secret;
  try { secret = secrets.check(input, root); }
  catch (err) { common.logError('secrets', err); return deny('Zaštita tajni nije izvršena. Provjerite pravila.log prije nastavka.'); }
  if (secret) return deny(secret);
  if (common.isPaused()) return null;
  for (const [name, fn] of [['gate', gate.check], ['size', size.preCheck], ['sync', sync.check], ['lock', lock.check]]) {
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
  safe('prune', () => common.pruneState());
  const parts = [
    safe('location', () => session.locationMessage(root)),
    common.isPaused() ? '## Pravila\nBlokirajuća pravila su pauzirana (`/pravila-pauza`). Zaštita tajni radi.' : null,
    safe('gate', () => gate.sessionMessage(root)),
    safe('sync', () => sync.sessionMessage(input, root)),
    safe('lock', () => lock.sessionMessage(root, input.session_id)),
    safe('scope', () => scope.sessionMessage(root)),
    safe('branches', () => branches.sessionMessage(input, root)),
  ].filter(Boolean);
  return parts.length ? context('SessionStart', '# Pravila projekta (project-guard)\n\n' + parts.join('\n\n')) : null;
}

const HANDLERS = {
  PreToolUse: preToolUse,
  PostToolUse: (input, root) => {
    safe('sync-post', () => sync.afterTool(input, root));
    safe('branches-post', () => branches.recordNewBranch(input, root));
    return context('PostToolUse', [
      safe('size-post', () => size.postCheck(input, root)),
      safe('deps', () => deps.postCheck(input, root)),
    ].filter(Boolean).join('\n') || null);
  },
  UserPromptSubmit: (input, root) => context('UserPromptSubmit', safe('scope-prompt', () => scope.promptCheck(input, root))),
  SessionStart: sessionStart,
  SessionEnd: (input, root) => safe('lock-release', () => lock.release(input, root)),
  Stop: (input, root) => {
    if (input.stop_hook_active) return null;
    const msg = safe('stop', () => session.stopReminder(input, root));
    const verification = fs.existsSync(require('path').join(root, '.agent-checks.json')) &&
      safe('verification', () => checks.verify(root));
    const notes = [msg, verification && !verification.ok ? verification.message : null].filter(Boolean);
    return notes.length ? { systemMessage: notes.join('\n') } : null;
  },
};

const SLOW_MS = 200;
const TIMED = new Set(['PreToolUse', 'PostToolUse', 'UserPromptSubmit']);

function evaluate(input) {
  failures = [];
  input = { ...input, _runtime: input._runtime || (input.tool_name === 'apply_patch' || input.turn_id ? 'codex' : 'claude') };
  const event = input.hook_event_name;
  const handler = HANDLERS[event];
  if (!handler) return null;
  const started = Date.now();
  const sessionRoot = common.projectRoot(input);
  const toolEvent = event === 'PreToolUse' || event === 'PostToolUse';
  let out;
  if (toolEvent && input.tool_name === 'apply_patch') {
    try {
      const events = portable.patchEvents(input, sessionRoot, event === 'PostToolUse');
      // Svi ciljevi se provjeravaju prije čitanja bilo kojeg sadržaja.
      const secret = events.map(e => secrets.check(e, common.rootFor(e, sessionRoot))).find(Boolean);
      if (secret) return event === 'PreToolUse' ? deny(secret) : { systemMessage: secret };
      const notes = [];
      for (const e of events) {
        const adapted = portable.materialize(e);
        const answer = handler(adapted, common.rootFor(adapted, sessionRoot));
        if (answer?.hookSpecificOutput?.permissionDecision) {
          if (answer.hookSpecificOutput.permissionDecision === 'ask') answer.hookSpecificOutput.permissionDecision = 'deny';
          return answer;
        }
        if (answer?.hookSpecificOutput?.additionalContext) notes.push(answer.hookSpecificOutput.additionalContext);
      }
      out = context(event, [...new Set(notes)].join('\n'));
    } catch (err) {
      common.logError('portable', err);
      return event === 'PreToolUse' ? deny('Patch nije provjeren: ' + err.message + ' Ispravite format prije ponovnog pokušaja.')
        : { systemMessage: 'Provjera patch izmjene nije potpuna: ' + err.message };
    }
  } else out = handler(input, toolEvent ? common.rootFor(input, sessionRoot) : sessionRoot) || null;
  if (input._runtime === 'codex' && out?.hookSpecificOutput?.permissionDecision === 'ask') {
    out.hookSpecificOutput.permissionDecision = 'deny';
  }
  if (failures.length) {
    out ||= {};
    out.systemMessage = `Zaštite nisu potpuno izvršene: ${[...new Set(failures)].join(', ')}. Pogledajte pravila.log; nastavak nije potvrda uspješne provjere.`;
  }
  const ms = Date.now() - started;
  if (TIMED.has(event) && ms > SLOW_MS) common.logSlow(`${event}${input.tool_name ? ' ' + input.tool_name : ''}`, ms);
  return out;
}

function run(input) {
  const out = evaluate(input);
  try { require('./lib/runtime-status').record(input, out); }
  catch (err) { common.logError('runtime-status', err); }
  return out;
}

if (require.main === module) {
  let out = null;
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
    out = run(input);
  } catch (err) {
    common.logError('guard', err);
    out = { systemMessage: 'Project-guard nije završio provjeru. Pogledajte pravila.log; radnja nije potvrđena kao provjerena.' };
  }
  if (out) process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

module.exports = { run };
