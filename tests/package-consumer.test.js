'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  REQUEST_SCHEMA,
  SCENARIO,
  describeCapability,
  runScenario,
  verifyReceipt
} = require('../src/portable-runner.js');

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function execute(command, arguments_, options) {
  const completed = spawnSync(command, arguments_, { encoding: 'utf8', ...options });
  assert.strictEqual(completed.status, 0, completed.stderr || completed.stdout);
  return completed;
}

const request = { schema: REQUEST_SCHEMA, scenario: SCENARIO, seed: 'package-consumer-proof', ticks: 28 };

(function capabilityDescriptionMatchesRunnableSurface() {
  const capability = describeCapability();
  assert.strictEqual(capability.id, 'axm.anomaly-garden.deterministic-completion-scenario');
  assert.strictEqual(capability.version, '0.16.0');
  assert.deepStrictEqual(capability.operations, ['describe', 'run', 'verify']);
  assert.strictEqual(capability.runtime.networkRequired, false);
  assert.strictEqual(capability.authority.declaresCanon, false);
})();

(function sameRequestProducesSameVerifiedReceipt() {
  const first = runScenario(request);
  const second = runScenario(request);
  assert.deepStrictEqual(first, second);
  assert.strictEqual(first.result.status, 'PASS');
  assert.strictEqual(first.result.tick, 28);
  assert.strictEqual(first.result.counts.livingSubworlds, 2);
  assert.strictEqual(first.result.counts.gates, 1);
  assert.strictEqual(verifyReceipt(first).status, 'PASS');
})();

(function malformedAndExcessiveRequestsFailClosed() {
  assert.throws(() => runScenario({ ...request, unexpected: true }), /fields must be exactly/);
  assert.throws(() => runScenario({ ...request, scenario: 'invented' }), /unsupported scenario/);
  assert.throws(() => runScenario({ ...request, ticks: 1001 }), /integer from 0 through 1000/);
  assert.throws(() => runScenario({ ...request, seed: 'bad\nseed' }), /printable/);
})();

(function alteredAndResealedFalseResultsFailClosed() {
  const altered = JSON.parse(JSON.stringify(runScenario(request)));
  altered.result.fingerprint = '00000000';
  assert.throws(() => verifyReceipt(altered), /digest mismatch/);
  const { receiptSha256: _old, ...payload } = altered;
  altered.receiptSha256 = digest(payload);
  assert.throws(() => verifyReceipt(altered), /deterministic replay/);
})();

(function commandSurfaceReturnsJsonAndHoldExit() {
  const command = path.resolve(__dirname, '../bin/anomaly-garden.cjs');
  const described = execute(process.execPath, [command, 'describe']);
  assert.strictEqual(JSON.parse(described.stdout).schema, 'axm.capability/v1');
  const run = execute(process.execPath, [command, 'run', '--seed', 'cli-proof', '--ticks', '12']);
  const receipt = JSON.parse(run.stdout);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anomaly-garden-cli-'));
  const receiptPath = path.join(directory, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  const verified = execute(process.execPath, [command, 'verify', receiptPath]);
  assert.strictEqual(JSON.parse(verified.stdout).status, 'PASS');
  const held = spawnSync(process.execPath, [command, 'run', '--ticks', '1001'], { encoding: 'utf8' });
  assert.strictEqual(held.status, 2);
  assert.strictEqual(JSON.parse(held.stdout).status, 'HOLD');
})();

(function packedTarballWorksFromCleanExternalDirectory() {
  const root = path.resolve(__dirname, '..');
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anomaly-garden-package-'));
  const packed = execute(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--json', '--pack-destination', workspace], { cwd: root });
  const metadata = JSON.parse(packed.stdout)[0];
  const paths = metadata.files.map((entry) => entry.path);
  assert(paths.includes('src/v16.js'));
  assert(paths.includes('src/portable-runner.js'));
  assert(paths.includes('bin/anomaly-garden.cjs'));
  assert(paths.includes('LICENSE'));
  assert(paths.includes('THIRD_PARTY.json'));
  assert(!paths.some((entry) => entry.startsWith('tests/') || entry.startsWith('.github/') || entry.startsWith('EXPERIMENTS/')));

  const tarball = path.join(workspace, metadata.filename);
  const consumer = path.join(workspace, 'consumer');
  fs.mkdirSync(consumer);
  execute(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', consumer, tarball]);
  const external = execute(process.execPath, ['-e', [
    "const engine = require('axm-anomaly-garden');",
    "const runner = require('axm-anomaly-garden/runner');",
    "const capability = require('axm-anomaly-garden/capability.json');",
    "const sim = new engine.GardenSimulation({ seed: 'external-library' });",
    "sim.run(3);",
    "const receipt = runner.runScenario({ schema: runner.REQUEST_SCHEMA, scenario: runner.SCENARIO, seed: 'external-runner', ticks: 9 });",
    "process.stdout.write(JSON.stringify({ version: sim.version, status: runner.verifyReceipt(receipt).status, capability: capability.id }));"
  ].join('')], { cwd: consumer });
  const externalResult = JSON.parse(external.stdout);
  assert.strictEqual(externalResult.version, '0.16.0');
  assert.strictEqual(externalResult.status, 'PASS');
  assert.strictEqual(externalResult.capability, 'axm.anomaly-garden.deterministic-completion-scenario');

  const installedCommand = path.join(consumer, 'node_modules', 'axm-anomaly-garden', 'bin', 'anomaly-garden.cjs');
  const installedRun = execute(process.execPath, [installedCommand, 'run', '--seed', 'installed-command', '--ticks', '7'], { cwd: consumer });
  assert.strictEqual(JSON.parse(installedRun.stdout).result.status, 'PASS');
})();

console.log('Anomaly Garden package consumer tests: PASS');
