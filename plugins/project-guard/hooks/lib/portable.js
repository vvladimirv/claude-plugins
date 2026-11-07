// Codex patch se pretvara u iste provjere kao Claude Write. Prvo samo putanje:
// zaštićen fajl se ne čita ni radi projekcije izmjene.
const fs = require('node:fs');
const path = require('node:path');

function parsePatch(command) {
  if (typeof command !== 'string') throw new Error('Patch nema tekst komande.');
  const lines = command.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.shift() !== '*** Begin Patch' || lines.pop() !== '*** End Patch') throw new Error('Nepoznat patch format.');
  const ops = [];
  let op;
  for (const line of lines) {
    const head = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (head) {
      op = { action: head[1], file: head[2], lines: [] };
      ops.push(op);
    } else if (line.startsWith('*** Move to: ') && op?.action === 'Update') {
      op.move = line.slice(13);
    } else if (op && (line.startsWith('@@') || line === '*** End of File' || /^[ +\-]/.test(line))) {
      op.lines.push(line);
    } else throw new Error('Nepodržana patch linija.');
  }
  if (!ops.length) throw new Error('Patch ne sadrži fajlove.');
  const seen = new Set();
  for (const op of ops) for (const file of [op.file, ...(op.move ? [op.move] : [])]) {
    const resolved = path.resolve(file);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) throw new Error('Ista putanja je navedena više puta; podijelite patch.');
    seen.add(key);
  }
  return ops;
}

function projectContent(op, root) {
  if (op.action === 'Delete') return '';
  if (op.action === 'Add') {
    if (op.lines.some(l => !l.startsWith('+'))) throw new Error('Neispravan Add patch.');
    return op.lines.map(l => l.slice(1)).join('\n') + (op.lines.length ? '\n' : '');
  }
  const text = fs.readFileSync(path.resolve(root, op.file), 'utf8').replace(/\r\n/g, '\n');
  const source = text.split('\n');
  if (source.at(-1) === '') source.pop();
  let cursor = 0;
  const result = [];
  let chunk = [];
  function flush() {
    if (!chunk.length) return;
    const before = chunk.filter(l => l[0] !== '+').map(l => l.slice(1));
    const after = chunk.filter(l => l[0] !== '-').map(l => l.slice(1));
    let at = cursor;
    if (before.length) {
      for (; at <= source.length - before.length; at++) {
        if (before.every((s, i) => source[at + i] === s)) break;
      }
      if (at > source.length - before.length) throw new Error('Patch kontekst ne odgovara fajlu.');
    } else at = source.length;
    result.push(...source.slice(cursor, at), ...after);
    cursor = at + before.length;
    chunk = [];
  }
  for (const line of op.lines) {
    if (line.startsWith('@@') || line === '*** End of File') flush();
    else chunk.push(line);
  }
  flush();
  result.push(...source.slice(cursor));
  return result.join('\n') + (result.length ? '\n' : '');
}

function patchEvents(input, root, post = false) {
  return parsePatch(input.tool_input?.command).flatMap(op => {
    const paths = op.move ? [op.file, op.move] : [op.file];
    return paths.map(file => ({ ...input, tool_name: 'Write', _patch: op, _patchRoot: root,
      tool_input: { file_path: path.resolve(root, file), content: '' }, _postPatch: post }));
  });
}

function materialize(input) {
  if (!input._patch) return input;
  const op = input._patch;
  const file = input.tool_input.file_path;
  const removed = op.action === 'Delete' || (op.move && file === path.resolve(input._patchRoot, op.file));
  let content = '';
  if (!removed) content = input._postPatch
    ? fs.readFileSync(file, 'utf8') : projectContent(op, input._patchRoot);
  return { ...input, tool_input: { file_path: file, content } };
}

module.exports = { parsePatch, projectContent, patchEvents, materialize };
