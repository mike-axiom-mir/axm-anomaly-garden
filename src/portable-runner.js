'use strict';

const crypto = require('crypto');
const capability = require('../capability.json');
const { GardenSimulation } = require('./v16.js');

const REQUEST_SCHEMA = 'axm.anomaly-garden.run-request/v1';
const RECEIPT_SCHEMA = 'axm.anomaly-garden.run-receipt/v1';
const VERIFICATION_SCHEMA = 'axm.anomaly-garden.verification-receipt/v1';
const SCENARIO = 'completion-v0.16';
const MAXIMUM_TICKS = 1000;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} fields must be exactly: ${expected.join(', ')}`);
  }
}

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical JSON refuses non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('canonical JSON accepts only JSON values');
}

function sha256(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function normalizeRequest(value) {
  assertExactKeys(value, ['scenario', 'schema', 'seed', 'ticks'], 'run request');
  if (value.schema !== REQUEST_SCHEMA) throw new TypeError(`unsupported request schema: ${String(value.schema)}`);
  if (value.scenario !== SCENARIO) throw new TypeError(`unsupported scenario: ${String(value.scenario)}`);
  if (typeof value.seed !== 'string' || value.seed.length < 1 || value.seed.length > 128 || /[\u0000-\u001f\u007f]/.test(value.seed)) {
    throw new TypeError('seed must be 1-128 printable characters');
  }
  if (!Number.isInteger(value.ticks) || value.ticks < 0 || value.ticks > MAXIMUM_TICKS) {
    throw new TypeError(`ticks must be an integer from 0 through ${MAXIMUM_TICKS}`);
  }
  return { schema: REQUEST_SCHEMA, scenario: SCENARIO, seed: value.seed, ticks: value.ticks };
}

function describeCapability() {
  return JSON.parse(JSON.stringify(capability));
}

function runScenario(request) {
  const normalized = normalizeRequest(request);
  const simulation = new GardenSimulation({
    seed: normalized.seed,
    config: { subworldInvestigationPeriod: 2 }
  });
  simulation.plantCompletionScenario();
  simulation.run(normalized.ticks);
  const integrity = simulation.worldIntegrityReport();
  const overview = simulation.worldglassOverview();
  const payload = {
    schema: RECEIPT_SCHEMA,
    engine: { id: 'axm-anomaly-garden', version: simulation.version },
    request: normalized,
    result: {
      status: integrity.pass ? 'PASS' : 'HOLD',
      tick: simulation.tick,
      fingerprint: simulation.stateFingerprint(),
      counts: integrity.counts,
      totals: overview.totals,
      errors: integrity.errors,
      warnings: integrity.warnings,
      causalReceiptCount: simulation.receipts.length
    }
  };
  return { ...payload, receiptSha256: sha256(payload) };
}

function verifyReceipt(receipt) {
  assertExactKeys(receipt, ['engine', 'receiptSha256', 'request', 'result', 'schema'], 'run receipt');
  if (receipt.schema !== RECEIPT_SCHEMA) throw new TypeError(`unsupported receipt schema: ${String(receipt.schema)}`);
  if (!/^[0-9a-f]{64}$/.test(receipt.receiptSha256)) throw new TypeError('receiptSha256 must be lowercase SHA-256');
  const { receiptSha256, ...payload } = receipt;
  if (sha256(payload) !== receiptSha256) throw new Error('run receipt digest mismatch');
  const normalized = normalizeRequest(receipt.request);
  if (canonicalJson(normalized) !== canonicalJson(receipt.request)) throw new Error('run request is not canonical');
  const replay = runScenario(normalized);
  if (canonicalJson(replay) !== canonicalJson(receipt)) throw new Error('run receipt does not match deterministic replay');
  return {
    schema: VERIFICATION_SCHEMA,
    status: 'PASS',
    engine: replay.engine,
    receiptSha256,
    fingerprint: replay.result.fingerprint,
    replayedLocally: true
  };
}

module.exports = {
  MAXIMUM_TICKS,
  RECEIPT_SCHEMA,
  REQUEST_SCHEMA,
  SCENARIO,
  VERIFICATION_SCHEMA,
  describeCapability,
  runScenario,
  verifyReceipt
};
