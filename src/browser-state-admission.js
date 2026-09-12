(function (root) {
  'use strict';

  const api = root && root.AnomalyGardenSim;
  const contract = root && root.AnomalyGardenStateContract;
  if (!api || !api.GardenSimulation) {
    throw new Error('Anomaly Garden browser state admission requires v16 engine first');
  }
  if (!contract || typeof contract.assertValidSerializedState !== 'function') {
    throw new Error('Anomaly Garden browser state admission requires shared state contract first');
  }

  const GardenSimulation = api.GardenSimulation;
  const originalDeserialize = GardenSimulation.deserialize;

  function cloneInput(input) {
    if (typeof input === 'string') return JSON.parse(input);
    return JSON.parse(JSON.stringify(input));
  }

  GardenSimulation.deserialize = function browserAdmittedDeserialize(input) {
    const parsed = cloneInput(input);
    contract.assertValidSerializedState(parsed);
    return originalDeserialize.call(this, parsed);
  };

  root.AnomalyGardenBrowserStateAdmission = {
    STATE_SCHEMA: contract.STATE_SCHEMA,
    validateSerializedState: contract.validateSerializedState,
    assertValidSerializedState: contract.assertValidSerializedState
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
