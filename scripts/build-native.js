const { spawnSync } = require('child_process');
const path = require('path');

if (process.platform !== 'win32') {
  console.log('Skipping WorkerW native addon build on non-Windows platform.');
  process.exit(0);
}

function npmNodeGyp() {
  const npmRoot = path.dirname(process.env.npm_execpath || '');
  return path.join(npmRoot, 'node_modules', 'node-gyp', 'bin', 'node-gyp.js');
}

const electronVersion = require('../package.json').devDependencies.electron.replace(/^[^0-9]*/, '');
const args = ['rebuild'];
if (process.argv.includes('--electron')) {
  args.push(`--runtime=electron`, `--target=${electronVersion}`, '--dist-url=https://electronjs.org/headers');
}
const result = spawnSync(process.execPath, [npmNodeGyp(), ...args], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
process.exit(result.status || 0);
