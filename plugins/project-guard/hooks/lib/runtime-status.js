const fs = require('node:fs');
const path = require('node:path');
const common = require('./common');
const version = require('../../.claude-plugin/plugin.json').version;
function record(input, output) {
  const runtime = input._runtime || (input.tool_name === 'apply_patch' || input.turn_id ? 'codex' : 'claude');
  const dir = path.join(common.CLAUDE_HOME, 'runtime-status');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, runtime + '.json'), JSON.stringify({ runtime, version,
    event: input.hook_event_name, at: new Date().toISOString(),
    note: output?.systemMessage ? 'Hook je vratio poruku; provjerite log.' : null }));
}
function inspect(home, now = Date.now()) {
  return ['claude', 'codex'].map(runtime => {
    const item = common.readJson(path.join(home, 'runtime-status', runtime + '.json'), null);
    return { runtime, observed: Boolean(item), fresh: Boolean(item && now - Date.parse(item.at) < 7 * 86400000),
      version: item?.version, at: item?.at };
  });
}
module.exports = { record, inspect };
