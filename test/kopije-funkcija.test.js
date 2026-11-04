// Pluginovi ne dijele kod: instaliran plugin ne vidi fajlove drugog. Zato project-memory ima kopije nekih
// funkcija iz project-guard. Kopija smije postojati, ali ne smije tiho zaostati kad se original popravi.
const test = require('node:test');
const assert = require('node:assert');

const guard = require('../plugins/project-guard/hooks/lib/common');
const memory = require('../plugins/project-memory/hooks/lib/util');

// guard ime → memory ime. norm i isUnder su tu jer projectRoot zavisi od njih.
const PAIRS = [
  ['norm', 'norm'],
  ['isUnder', 'isUnder'],
  ['projectRoot', 'projectDir'],
  ['isWorktreeRoot', 'isWorktreeRoot'],
  ['git', 'git'],
  ['logError', 'logError'],
];

const normalize = (fn) => fn.toString()
  .replace(/\r\n/g, '\n')
  .replace(/\bprojectDir\b/g, 'projectRoot')
  .replace(/project-memory\//g, 'project-guard/');

for (const [g, m] of PAIRS) {
  test(`kopije: ${m} u project-memory je isti kao ${g} u project-guard`, () => {
    assert.strictEqual(typeof guard[g], 'function', `project-guard common.js ne izvozi ${g}`);
    assert.strictEqual(typeof memory[m], 'function', `project-memory util.js ne izvozi ${m}`);
    assert.strictEqual(normalize(memory[m]), normalize(guard[g]),
      `${m} (project-memory/hooks/lib/util.js) se razlikuje od ${g} (project-guard/hooks/lib/common.js): prenesi izmjenu`);
  });
}
