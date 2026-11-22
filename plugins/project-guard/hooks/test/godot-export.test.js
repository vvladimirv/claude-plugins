const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const { run } = require('../guard');
const { parsePresets, patternRegex } = require('../lib/godot-export');

const post = (root, file, sid = 'G') => run({ hook_event_name: 'PostToolUse', cwd: root, session_id: sid, tool_name: 'Write', tool_input: { file_path: file, content: 'x' } });
const ctx = (out) => (out ? out.hookSpecificOutput.additionalContext : '');
const cfg = (inc, exc, name = 'Windows') => `[preset.0]\n\nname="${name}"\nplatform="Windows Desktop"\nexport_filter="all_resources"\ninclude_filter="${inc}"\nexclude_filter="${exc}"\n\n[preset.0.options]\nexclude_filter_x="nema veze"\n`;

function game(inc, exc, extra = {}) {
  return h.project({ marker: true, files: {
    'game/project.godot': 'config_version=5\n',
    'game/export_presets.cfg': cfg(inc, exc),
    'game/core/events/test/t.gd': 'x',
    'game/core/events/ev.gd': 'x',
    'game/maps/tlocrt.txt': 'x',
    ...extra,
  } });
}

test('parsePresets: čita samo [preset.N], ne i opcije', () => {
  const p = parsePresets(cfg('maps/*.txt', '*/test/*'));
  assert.strictEqual(p.length, 1);
  assert.strictEqual(p[0].name, 'Windows');
  assert.ok(p[0].exclude[0].test('res://core/test/a.gd'));
  assert.ok(p[0].include[0].test('res://maps/a.txt'));
});

test('patternRegex: */test/* hvata i vršni test folder, relativni uzorak dobija res://', () => {
  assert.ok(patternRegex('*/test/*').test('res://test/a.gd'));
  assert.ok(patternRegex('maps/*').test('res://MAPS/a.txt'));
  assert.ok(!patternRegex('maps/*').test('res://other/maps/a.txt'));
});

test('test folder koji exclude_filter ne pokriva se javlja (core/events/test)', () => {
  const root = game('maps/*.txt', 'core/ui/test/*, core/state/test/*');
  const out = ctx(post(root, 'game/export_presets.cfg'));
  assert.match(out, /core\/events\/test/);
  assert.doesNotMatch(out, /maps/);
});

test('uzorak */test/* pokriva sve test foldere i ništa se ne javlja', () => {
  const root = game('maps/*.txt', '*/test/*');
  assert.strictEqual(ctx(post(root, 'game/export_presets.cfg')), '');
});

test('podatak koji nije resurs a fali u include_filter se javlja (maps/*.txt)', () => {
  const root = game('', '*/test/*');
  const out = ctx(post(root, 'game/export_presets.cfg'));
  assert.match(out, /include_filter/);
  assert.match(out, /maps\/\*\.txt/);
  assert.doesNotMatch(out, /test folder/);
});

test('isto upozorenje se u sesiji javlja jednom', () => {
  const root = game('', '*/test/*');
  assert.ok(ctx(post(root, 'game/export_presets.cfg', 'S1')));
  assert.strictEqual(ctx(post(root, 'game/export_presets.cfg', 'S1')), '');
});

test('novi test folder u igri okida provjeru i bez izmjene export_presets.cfg', () => {
  const root = game('maps/*.txt', '*/test/*');
  h.write(root, 'game/scenes/test/a.gd', 'x');
  const out = ctx(post(root, 'game/scenes/test/a.gd'));
  assert.strictEqual(out, '');
  h.write(root, 'game/export_presets.cfg', cfg('maps/*.txt', 'core/events/test/*'));
  assert.match(ctx(post(root, 'game/scenes/test/a.gd', 'S2')), /scenes\/test/);
});

test('projekat bez Godota ili bez export_presets.cfg: tišina', () => {
  const root = h.project({ marker: true, files: { 'a/test/t.js': 'x', 'a/data.json': '{}' } });
  assert.strictEqual(ctx(post(root, 'a/data.json')), '');
  const g = h.project({ marker: true, files: { 'game/project.godot': 'x', 'game/maps/a.txt': 'x' } });
  assert.strictEqual(ctx(post(g, 'game/maps/a.txt')), '');
});

test('folder sa .gdignore se preskače (android/build)', () => {
  const root = game('maps/*.txt', '*/test/*', { 'game/android/build/res/a.txt': 'x', 'game/android/build/res/test/t.gd': 'x', 'game/android/build/.gdignore': '' });
  assert.strictEqual(ctx(post(root, 'game/export_presets.cfg')), '');
});

test('json je resurs u Godotu 4 i ne traži include_filter', () => {
  const root = game('maps/*.txt', '*/test/*', { 'game/assets/pictures/pictures.json': '{}' });
  assert.strictEqual(ctx(post(root, 'game/export_presets.cfg')), '');
});

test('licence (OFL.txt, LICENSE.txt) nisu podaci igre', () => {
  const root = game('maps/*.txt', '*/test/*', { 'game/fonts/OFL.txt': 'x', 'game/fonts/LICENSE.txt': 'x', 'game/fonts/README.txt': 'x' });
  assert.strictEqual(ctx(post(root, 'game/export_presets.cfg')), '');
});
