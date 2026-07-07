const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

if (process.platform !== 'win32') {
  console.log('Skipping WorkerW native addon build on non-Windows platform.');
  process.exit(0);
}

function localNodeGyp() {
  return path.join(projectRoot, 'node_modules', 'node-gyp', 'bin', 'node-gyp.js');
}

function warnAndContinue(message) {
  console.warn(`[WorkerW] Native addon build failed; using fallback wallpaper mode. ${message}`);
  process.exit(0);
}

const nodeGyp = localNodeGyp();
if (!fs.existsSync(nodeGyp)) {
  warnAndContinue(`Local node-gyp was not found at ${nodeGyp}. Run npm install before building.`);
}

const electronVersion = require('../package.json').devDependencies.electron.replace(/^[^0-9]*/, '');
const args = ['rebuild'];
if (process.argv.includes('--electron')) {
  args.push('--runtime=electron', `--target=${electronVersion}`, '--dist-url=https://electronjs.org/headers');
}

const result = spawnSync(process.execPath, [nodeGyp, ...args], { stdio: 'inherit', cwd: projectRoot });
if (result.error) {
  warnAndContinue(result.error.message);
}
if (result.status !== 0) {
  warnAndContinue(`node-gyp exited with status ${result.status}.`);
}
