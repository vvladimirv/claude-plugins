// Desktop aplikacija i cloud sesija (telefon) imaju iste radnje sa sesijama pod različitim imenima alata.
// Skill koji zna samo desktop ime u cloudu padne na „zatvori sa /exit", a to tamo ništa ne arhivira.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PLUGINS = path.join(__dirname, '..', 'plugins');
const SKILLS = [
  'project-memory/skills/kraj-sesije/SKILL.md',
  'project-memory/skills/pomocna/SKILL.md',
  'project-guard/skills/grane/SKILL.md',
];
// Desktop ime → cloud ime. Model i effort druge sesije u cloudu nemaju alat.
const PAIRS = {
  mcp__ccd_session_mgmt__archive_session: 'mcp__claude-code-remote__archive_session',
  mcp__ccd_session_mgmt__list_sessions: 'mcp__claude-code-remote__list_sessions',
  mcp__ccd_session_mgmt__get_session: 'mcp__claude-code-remote__get_session',
};

function read(file) {
  return fs.readFileSync(path.join(PLUGINS, file), 'utf8').replace(/\r\n/g, '\n');
}

test('alati sesije: uz svako desktop ime ide i cloud ime, u allowed-tools i u svakom ToolSearch', () => {
  for (const file of SKILLS) {
    const text = read(file);
    const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
    for (const [desktop, cloud] of Object.entries(PAIRS)) {
      if (fm.includes(desktop)) assert.ok(fm.includes(cloud), `${file}: allowed-tools ima ${desktop}, a nema ${cloud}`);
      for (const sel of text.match(/`select:[^`]*`/g) || []) {
        if (sel.includes(desktop)) assert.ok(sel.includes(cloud), `${file}: ${sel} nema ${cloud}`);
      }
    }
  }
});

test('alati sesije: cwd kartice samo ako ga shema ima, inače korijen u prvi red prompta', () => {
  for (const file of SKILLS) {
    const text = read(file);
    if (!text.includes('spawn_task')) continue;
    assert.match(text, /`cwd`[^\n]*samo ako (ga )?shema alata ima/, `${file}: cwd nije uslovan`);
    assert.match(text, /Korijen projekta: <putanja>/, `${file}: nema rezerve za korijen projekta u promptu`);
  }
});

test('alati sesije: cloud arhiviranje dobija pravi id sesije, a ne "self"', () => {
  const text = read('project-memory/skills/kraj-sesije/SKILL.md');
  assert.match(text, /mcp__claude-code-remote__archive_session[^\n]*ccr\.id[^\n]*get_session/);
});
