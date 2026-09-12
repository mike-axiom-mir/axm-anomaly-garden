'use strict';

const assert = require('assert');
const { GardenSimulation, INTERVENTION_NUMBER_ERROR } = require('../src/sim.js');

function assertRejectedWithoutMutation(label, invoke, field) {
  const sim = new GardenSimulation({ seed: 'intervention-admission-' + label });
  const before = sim.serialize();
  const rngBefore = sim.random.getState();
  const countersBefore = {
    nextReceiptId: sim.nextReceiptId,
    nextAnomalyId: sim.nextAnomalyId,
    nextModalId: sim.nextModalId
  };

  assert.throws(
    () => invoke(sim),
    (error) => error &&
      error.code === INTERVENTION_NUMBER_ERROR &&
      error.field === field,
    label + ' should fail with a stable field-specific admission error'
  );
  assert.strictEqual(sim.serialize(), before, label + ' must not mutate canonical state');
  assert.strictEqual(sim.random.getState(), rngBefore, label + ' must not consume RNG state');
  assert.deepStrictEqual({
    nextReceiptId: sim.nextReceiptId,
    nextAnomalyId: sim.nextAnomalyId,
    nextModalId: sim.nextModalId
  }, countersBefore, label + ' must not consume canonical identifiers');
}

(function invalidAnomalyNumbersFailBeforeMutation() {
  assertRejectedWithoutMutation(
    'anomaly-radius',
    (sim) => sim.addAnomaly('gravity-slip', { radius: 'not-a-number' }),
    'radius'
  );
  assertRejectedWithoutMutation(
    'anomaly-intensity',
    (sim) => sim.addAnomaly('gravity-slip', { intensity: Infinity }),
    'intensity'
  );
  assertRejectedWithoutMutation(
    'anomaly-ttl',
    (sim) => sim.addAnomaly('gravity-slip', { ttl: 'Infinity' }),
    'ttl'
  );
})();

(function invalidModalNumbersFailBeforeMutation() {
  assertRejectedWithoutMutation(
    'modal-radius',
    (sim) => sim.addModal({ radius: 'not-a-number' }),
    'radius'
  );
  assertRejectedWithoutMutation(
    'modal-period',
    (sim) => sim.addModal({ period: -Infinity }),
    'period'
  );
  assertRejectedWithoutMutation(
    'modal-memory-leak',
    (sim) => sim.addModal({ memoryLeak: 'not-a-number' }),
    'memoryLeak'
  );
})();

(function finiteCoercionAndClampingRemainCompatible() {
  const sim = new GardenSimulation({ seed: 'intervention-admission-valid' });
  const anomaly = sim.addAnomaly('gravity-slip', {
    x: 2,
    y: 3,
    radius: '2.5',
    intensity: '1.5',
    ttl: '9.9'
  });
  assert.strictEqual(anomaly.radius, 2.5);
  assert.strictEqual(anomaly.intensity, 1);
  assert.strictEqual(anomaly.ttl, 9);

  const modal = sim.addModal({
    x: 2,
    y: 3,
    radius: '3.5',
    period: '7.9',
    memoryLeak: '0.4'
  });
  assert.strictEqual(modal.radius, 3.5);
  assert.strictEqual(modal.period, 7);
  assert.strictEqual(modal.memoryLeak, 0.4);
})();

console.log('Anomaly Garden intervention admission tests: PASS');
