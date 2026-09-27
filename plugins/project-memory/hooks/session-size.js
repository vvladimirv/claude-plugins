// UserPromptSubmit hook: kad razgovor postane velik, predloži /kraj-sesije i novu sesiju.
// Svaka poruka ponovo šalje cijeli razgovor, pa je velika sesija skupa. Veličinu čita iz zadnjeg
// "usage" u transkriptu, i to samo sa kraja fajla, da hook ostane brz.
// Fail-open: svaka greška se upiše u ~/.claude/pravila.log, a poruka normalno prolazi.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { noKickstart } = require('./lib/progress');

const TAIL_BYTES = 256 * 1024;
const LEVELS = [100000, 150000];
const STATE_DIR = path.join(os.tmpdir(), 'cc-velicina-sesije');

function readTail(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const text = buf.toString('utf8');
    // prva linija je vjerovatno odsječena na pola
    return start > 0 ? text.slice(text.indexOf('\n') + 1) : text;
  } finally {
    fs.closeSync(fd);
  }
}

// Veličina konteksta = sve što je model primio u zadnjem odgovoru glavnog razgovora.
function contextTokens(jsonl) {
  const lines = jsonl.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const u = entry && !entry.isSidechain && entry.message && entry.message.usage;
    if (!u) continue;
    return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  }
  return 0;
}

function levelFor(tokens) {
  return LEVELS.filter((l) => tokens >= l).pop() || 0;
}

function stateFile(sessionId) {
  return path.join(STATE_DIR, String(sessionId).replace(/[^\w.-]/g, '_') + '.txt');
}

function readLevel(sessionId) {
  try {
    return Number(fs.readFileSync(stateFile(sessionId), 'utf8')) || 0;
  } catch {
    return 0;
  }
}

function writeLevel(sessionId, level) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(sessionId), String(level));
}

// U projektu bez kickstarta i bez STATUS.md /kraj-sesije stane, pa se rad snima po pravilima projekta.
function ownDocs(root) {
  return Boolean(root) && noKickstart(root) && !fs.existsSync(path.join(root, 'STATUS.md'));
}

// Upozori jednom po pragu. Poslije /compact kontekst padne, pa se pragovi ponovo računaju.
function check(input) {
  const prompt = (input.prompt || '').trim();
  if (!input.transcript_path || !input.session_id || /^\/kraj-sesije\b/.test(prompt)) return null;
  if (!fs.existsSync(input.transcript_path)) return null;

  const tokens = contextTokens(readTail(input.transcript_path));
  const level = levelFor(tokens);
  const warned = readLevel(input.session_id);
  if (level < warned) writeLevel(input.session_id, level);
  if (level === 0 || level <= warned) return null;
  writeLevel(input.session_id, level);

  const k = Math.round(tokens / 1000);
  const own = ownDocs(input.cwd || process.env.CLAUDE_PROJECT_DIR);
  return {
    systemMessage: `Razgovor je velik (~${k}k tokena), pa je svaka poruka sada skuplja. `
      + (own ? 'Kad završiš ovaj korak, snimi rad po pravilima projekta (AGENTS.md/CLAUDE.md) i otvori novu sesiju.'
        : 'Kad završiš ovaj korak, otkucaj /kraj-sesije i otvori novu sesiju. Stanje projekta se prenosi samo.'),
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `Kontekst je ~${k}k tokena. Kad završiš trenutni korak, u „➡️ Sljedeće:“ predloži `
        + (own ? 'kraj rada po pravilima projekta (AGENTS.md/CLAUDE.md) i novu sesiju.'
          : '/kraj-sesije i novu sesiju (stanje ide preko STATUS.md).'),
    },
  };
}

function logError(err) {
  try {
    const line = `${new Date().toISOString()} project-memory/session-size: ${err && err.stack ? err.stack : err}\n`;
    fs.appendFileSync(path.join(os.homedir(), '.claude', 'pravila.log'), line);
  } catch {
    // ni log nije uspio: tiho odustani, poruka ne smije pasti zbog hooka
  }
}

if (require.main === module) {
  try {
    const out = check(JSON.parse(fs.readFileSync(0, 'utf8') || '{}'));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch (err) {
    logError(err);
  }
  process.exit(0);
}

module.exports = { contextTokens, levelFor, check };
