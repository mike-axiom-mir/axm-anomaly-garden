'use strict';

const assert = require('assert');
const { GardenSimulation } = require('../src/v16.js');
const {
  canonicalJson,
  validateSerializedState,
  assertValidSerializedState,
  deserializeVerified
} = require('../src/state-contract.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasCode(result, code) {
  return result.problems.some((problem) => problem.code === code);
}

function makeState() {
  const sim = new GardenSimulation({ seed: 'state-contract-gate', repairPolicy: 'off' });
  sim.addAnomaly('loop-echo', { x: 4, y: 3, radius: 3, intensity: 0.9, ttl: 120 });
  sim.run(72);
  const compacted = sim.compactHistory(24);
  assert(compacted && sim.coldHistory.length > 0, 'fixture must exercise cold canonical history');
  sim.createCheckpoint('contract-checkpoint');
  sim.run(4);
  sim.whisper(sim.agents[0].id);
  return sim;
}

(function validCurrentStatePassesAndResumesExactly() {
  const sim = makeState();
  const text = sim.serialize();
  const result = assertValidSerializedState(text);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.version, '0.16.0');
  assert(result.receiptCount > 0);
  assert(result.coldReceiptCount > 0);
  assert.match(result.stateSha256, /^[0-9a-f]{64}$/);

  const loaded = deserializeVerified(text);
  assert.strictEqual(loaded.simulation.stateFingerprint(), sim.stateFingerprint(), 'verified restore must preserve the canonical fingerprint');
  assert.strictEqual(loaded.validation.stateSha256, loaded.restoredValidation.stateSha256, 'current-version state must round-trip without silent canonical drift');

  sim.run(8);
  loaded.simulation.run(8);
  assert.strictEqual(loaded.simulation.stateFingerprint(), sim.stateFingerprint(), 'verified restore must preserve deterministic continuation');
})();

(function seedIdentityDriftFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  envelope.state.seed += 1;
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'SEED_IDENTITY_MISMATCH'));
})();

(function staleReceiptCounterFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  envelope.state.counters.nextReceiptId = 1;
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'STALE_NEXT_COUNTER'));
})();

(function duplicateCanonicalIdentityFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  envelope.state.agents[1].id = envelope.state.agents[0].id;
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'DUPLICATE_OBJECT_ID'));
})();

(function coldHistoryTamperFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  assert(envelope.state.coldHistory.length > 0);
  envelope.state.coldHistory[0].data += ' ';
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'COLD_HASH_MISMATCH'));
})();

(function danglingCausalParentFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  assert(envelope.state.receipts.length > 0);
  envelope.state.receipts[envelope.state.receipts.length - 1].parents.push('event-999999999');
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'DANGLING_RECEIPT_PARENT'));
})();

(function checkpointStateIsValidatedRecursively() {
  const envelope = JSON.parse(makeState().serialize());
  assert(envelope.state.checkpoints.length > 0);
  envelope.state.checkpoints[0].state.counters.nextReceiptId = 1;
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'STALE_NEXT_COUNTER'));
})();

(function unsupportedEnvelopeSchemaFailsClosed() {
  const envelope = JSON.parse(makeState().serialize());
  envelope.schema = 'axm-anomaly-garden/state-v999';
  const result = validateSerializedState(envelope);
  assert.strictEqual(result.ok, false);
  assert(hasCode(result, 'UNSUPPORTED_SCHEMA'));
})();

(function canonicalDigestIgnoresObjectKeyInsertionOrder() {
  const a = { z: 3, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
  const b = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 3 };
  assert.strictEqual(canonicalJson(a), canonicalJson(b));
})();

(function assertSurfaceCarriesMachineReadableProblems() {
  const envelope = JSON.parse(makeState().serialize());
  envelope.state.counters.nextAnomalyId = 1;
  assert.throws(
    () => assertValidSerializedState(envelope),
    (error) => error && error.code === 'AXM_STATE_CONTRACT_REJECTED' && Array.isArray(error.problems) && error.problems.some((problem) => problem.code === 'STALE_NEXT_COUNTER')
  );
})();

console.log('Anomaly Garden canonical state contract tests: PASS');
