const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { contextTokens, levelFor } = require('./session-size.js');

const HOOK = path.join(__dirname, 'session-size.js');

function usageLine(input, cacheRead, extra = {}) {
  return JSON.stringify({ type: 'assistant', ...extra, message: { usage: { input_tokens: input, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 } } });
}

function transcript(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-size-'));
  const file = path.join(dir, 't.jsonl');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

function runHook(input) {
  const out = execFileSync('node', [HOOK], { input: JSON.stringify(input), encoding: 'utf8' });
  return out ? JSON.parse(out) : null;
}

test('veličina konteksta je iz zadnjeg usage glavnog razgovora', () => {
  const jsonl = [usageLine(10, 1000), usageLine(5, 2000), usageLine(1, 999999, { isSidechain: true }), '{"type":"user"}'].join('\n');
  assert.strictEqual(contextTokens(jsonl), 2005);
  assert.strictEqual(contextTokens('nije json\n'), 0);
});

test('pragovi', () => {
  assert.strictEqual(levelFor(99999), 0);
  assert.strictEqual(levelFor(120000), 100000);
  assert.strictEqual(levelFor(151000), 150000);
});

test('upozori jednom po pragu, i ponovo na višem pragu', () => {
  const session = 'test-' + process.pid + '-' + Date.now();
  const small = transcript([usageLine(100, 50000)]);
  assert.strictEqual(runHook({ session_id: session, transcript_path: small, prompt: 'nastavi' }), null);

  const big = transcript([usageLine(100, 120000)]);
  const res = runHook({ session_id: session, transcript_path: big, prompt: 'nastavi' });
  assert.match(res.systemMessage, /~120k tokena/);
  assert.match(res.systemMessage, /\/kraj-sesije/);
  assert.match(res.hookSpecificOutput.additionalContext, /Sljedeće/);
  assert.strictEqual(runHook({ session_id: session, transcript_path: big, prompt: 'nastavi' }), null);

  const bigger = transcript([usageLine(100, 160000)]);
  assert.match(runHook({ session_id: session, transcript_path: bigger, prompt: 'nastavi' }).systemMessage, /~160k/);
});

test('bez transkripta ili uz /kraj-sesije: nema izlaza', () => {
  assert.strictEqual(runHook({ session_id: 'x', transcript_path: path.join(os.tmpdir(), 'nema-ga.jsonl') }), null);
  const big = transcript([usageLine(100, 120000)]);
  assert.strictEqual(runHook({ session_id: 'y-' + Date.now(), transcript_path: big, prompt: '/kraj-sesije' }), null);
});
