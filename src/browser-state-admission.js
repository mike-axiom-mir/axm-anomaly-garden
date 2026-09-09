(function (root) {
  'use strict';

  const api = root && root.AnomalyGardenSim;
  if (!api || !api.GardenSimulation || typeof api.hashSeed !== 'function') {
    throw new Error('Anomaly Garden browser state admission requires v16 engine first');
  }

  const GardenSimulation = api.GardenSimulation;
  const originalDeserialize = GardenSimulation.deserialize;
  const hashSeed = api.hashSeed;
  const UINT32_MAX = 0xffffffff;
  const STATE_SCHEMA = 'axm-anomaly-garden/state-v1';

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function isUint32(value) {
    return Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
  }

  function parseInput(input) {
    if (typeof input === 'string') return JSON.parse(input);
    return JSON.parse(JSON.stringify(input));
  }

  function numericId(id, prefix) {
    const match = new RegExp('^' + prefix + '-(\\d+)$').exec(String(id || ''));
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  function maxNumericId(items, prefix) {
    let max = 0;
    for (const item of items || []) {
      if (!isObject(item)) continue;
      const value = numericId(item.id, prefix);
      if (value !== null) max = Math.max(max, value);
    }
    return max;
  }

  function maxSetNumericId(ids, prefix) {
    let max = 0;
    for (const id of ids) {
      const value = numericId(id, prefix);
      if (value !== null) max = Math.max(max, value);
    }
    return max;
  }

  function validateUniqueIds(items, path, problems) {
    const ids = new Set();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!isObject(item) || typeof item.id !== 'string' || item.id.length === 0) {
        problems.push({ code: 'INVALID_OBJECT_ID', path: path + '[' + i + '].id', message: 'object id must be a non-empty string' });
        continue;
      }
      if (ids.has(item.id)) problems.push({ code: 'DUPLICATE_OBJECT_ID', path: path + '[' + i + '].id', message: 'object id must be unique within ' + path });
      else ids.add(item.id);
    }
    return ids;
  }

  function validateNextCounter(value, maxUsed, path, label, problems) {
    if (!isPositiveInteger(value)) {
      problems.push({ code: 'INVALID_NEXT_COUNTER', path, message: 'next ' + label + ' counter must be a positive integer' });
      return;
    }
    if (value <= maxUsed) problems.push({ code: 'STALE_NEXT_COUNTER', path, message: 'next ' + label + ' counter would reuse an existing canonical id' });
  }

  function collectReceiptIds(state, path, problems) {
    const ids = new Set();
    let maxReceiptNumber = 0;
    const hot = Array.isArray(state.receipts) ? state.receipts : [];

    for (let i = 0; i < hot.length; i += 1) {
      const receipt = hot[i];
      const receiptPath = path + '.receipts[' + i + ']';
      if (!isObject(receipt)) {
        problems.push({ code: 'INVALID_RECEIPT', path: receiptPath, message: 'receipt must be an object' });
        continue;
      }
      const number = numericId(receipt.id, 'event');
      if (number === null) problems.push({ code: 'INVALID_RECEIPT_ID', path: receiptPath + '.id', message: 'receipt id must match event-<positive integer>' });
      else maxReceiptNumber = Math.max(maxReceiptNumber, number);
      if (ids.has(receipt.id)) problems.push({ code: 'DUPLICATE_RECEIPT_ID', path: receiptPath + '.id', message: 'receipt id already exists in canonical history' });
      else ids.add(receipt.id);
      if (!isNonNegativeInteger(receipt.tick) || (isNonNegativeInteger(state.tick) && receipt.tick > state.tick)) {
        problems.push({ code: 'INVALID_RECEIPT_TICK', path: receiptPath + '.tick', message: 'receipt tick must be within the current canonical timeline' });
      }
    }

    const cold = Array.isArray(state.coldHistory) ? state.coldHistory : [];
    for (let i = 0; i < cold.length; i += 1) {
      const chunk = cold[i];
      const chunkPath = path + '.coldHistory[' + i + ']';
      if (!isObject(chunk) || typeof chunk.data !== 'string') {
        problems.push({ code: 'INVALID_COLD_DATA', path: chunkPath + '.data', message: 'cold history data must be a JSON tuple string' });
        continue;
      }
      let tuples;
      try {
        tuples = JSON.parse(chunk.data);
      } catch (error) {
        problems.push({ code: 'INVALID_COLD_JSON', path: chunkPath + '.data', message: 'cold history data is not valid JSON' });
        continue;
      }
      if (!Array.isArray(tuples)) {
        problems.push({ code: 'INVALID_COLD_TUPLES', path: chunkPath + '.data', message: 'cold history data must decode to an array' });
        continue;
      }
      for (let j = 0; j < tuples.length; j += 1) {
        const tuple = tuples[j];
        const tuplePath = chunkPath + '.data[' + j + ']';
        if (!Array.isArray(tuple) || tuple.length < 5) {
          problems.push({ code: 'INVALID_COLD_RECEIPT', path: tuplePath, message: 'cold receipt tuple must contain id, tick, type, payload, parents' });
          continue;
        }
        const number = numericId(tuple[0], 'event');
        if (number === null) problems.push({ code: 'INVALID_RECEIPT_ID', path: tuplePath + '.id', message: 'receipt id must match event-<positive integer>' });
        else maxReceiptNumber = Math.max(maxReceiptNumber, number);
        if (ids.has(tuple[0])) problems.push({ code: 'DUPLICATE_RECEIPT_ID', path: tuplePath + '.id', message: 'receipt id already exists in hot/cold canonical history' });
        else ids.add(tuple[0]);
      }
    }

    return { ids, maxReceiptNumber };
  }

  function validateState(state, path, problems, embedded) {
    if (!isObject(state)) {
      problems.push({ code: 'INVALID_STATE', path, message: 'canonical state must be an object' });
      return;
    }

    if (typeof state.seedText !== 'string' || state.seedText.length === 0) {
      problems.push({ code: 'INVALID_SEED_TEXT', path: path + '.seedText', message: 'seedText must be a non-empty string' });
    }
    if (!isUint32(state.seed)) {
      problems.push({ code: 'INVALID_SEED', path: path + '.seed', message: 'seed must be an unsigned 32-bit integer' });
    } else if (typeof state.seedText === 'string' && state.seedText.length > 0 && hashSeed(state.seedText) !== state.seed) {
      problems.push({ code: 'SEED_IDENTITY_MISMATCH', path: path + '.seed', message: 'seed does not match hashSeed(seedText)' });
    }
    if (!isUint32(state.rngState)) problems.push({ code: 'INVALID_RNG_STATE', path: path + '.rngState', message: 'rngState must be an unsigned 32-bit integer' });
    if (!isNonNegativeInteger(state.tick)) problems.push({ code: 'INVALID_TICK', path: path + '.tick', message: 'tick must be a non-negative integer' });

    const arrays = ['agents', 'anomalies', 'modalZones', 'relationships', 'institutions', 'places', 'repairNodes', 'receipts', 'interventions', 'interventionLog'];
    for (const key of arrays) {
      if (!Array.isArray(state[key])) problems.push({ code: 'MISSING_ARRAY', path: path + '.' + key, message: key + ' must be an array' });
    }
    if (!embedded && !Array.isArray(state.checkpoints)) problems.push({ code: 'MISSING_ARRAY', path: path + '.checkpoints', message: 'checkpoints must be an array in exported state' });
    if (!embedded && !Array.isArray(state.branchArchive)) problems.push({ code: 'MISSING_ARRAY', path: path + '.branchArchive', message: 'branchArchive must be an array in exported state' });
    if (!isObject(state.counters)) problems.push({ code: 'INVALID_COUNTERS', path: path + '.counters', message: 'counters must be an object' });

    const agents = Array.isArray(state.agents) ? state.agents : [];
    const agentIds = validateUniqueIds(agents, path + '.agents', problems);
    validateUniqueIds(Array.isArray(state.anomalies) ? state.anomalies : [], path + '.anomalies', problems);
    validateUniqueIds(Array.isArray(state.modalZones) ? state.modalZones : [], path + '.modalZones', problems);

    const relationships = Array.isArray(state.relationships) ? state.relationships : [];
    for (let i = 0; i < relationships.length; i += 1) {
      const relation = relationships[i];
      if (!isObject(relation)) continue;
      if (!agentIds.has(relation.a)) problems.push({ code: 'UNKNOWN_RELATION_ENDPOINT', path: path + '.relationships[' + i + '].a', message: 'relationship endpoint does not exist' });
      if (!agentIds.has(relation.b)) problems.push({ code: 'UNKNOWN_RELATION_ENDPOINT', path: path + '.relationships[' + i + '].b', message: 'relationship endpoint does not exist' });
      if (relation.a === relation.b) problems.push({ code: 'SELF_RELATION', path: path + '.relationships[' + i + ']', message: 'relationship endpoints must differ' });
    }

    const receipts = collectReceiptIds(state, path, problems);
    const checkpoints = Array.isArray(state.checkpoints) ? state.checkpoints : [];
    const archives = Array.isArray(state.branchArchive) ? state.branchArchive : [];
    const checkpointIds = validateUniqueIds(checkpoints, path + '.checkpoints', problems);
    const branchIds = validateUniqueIds(archives, path + '.branchArchive', problems);

    if (isObject(state.counters)) {
      validateNextCounter(state.counters.nextReceiptId, receipts.maxReceiptNumber, path + '.counters.nextReceiptId', 'receipt', problems);
      validateNextCounter(state.counters.nextAnomalyId, maxNumericId(Array.isArray(state.anomalies) ? state.anomalies : [], 'anomaly'), path + '.counters.nextAnomalyId', 'anomaly', problems);
      validateNextCounter(state.counters.nextModalId, maxNumericId(Array.isArray(state.modalZones) ? state.modalZones : [], 'modal'), path + '.counters.nextModalId', 'modal', problems);
      if (!embedded || checkpoints.length > 0) validateNextCounter(state.counters.nextCheckpointId, maxSetNumericId(checkpointIds, 'checkpoint'), path + '.counters.nextCheckpointId', 'checkpoint', problems);
      if (!embedded || archives.length > 0) validateNextCounter(state.counters.nextBranchId, maxSetNumericId(branchIds, 'branch'), path + '.counters.nextBranchId', 'branch', problems);
    }

    for (let i = 0; i < checkpoints.length; i += 1) {
      const checkpoint = checkpoints[i];
      if (isObject(checkpoint) && isObject(checkpoint.state)) validateState(checkpoint.state, path + '.checkpoints[' + i + '].state', problems, true);
    }
    for (let i = 0; i < archives.length; i += 1) {
      const archive = archives[i];
      if (isObject(archive) && isObject(archive.state)) validateState(archive.state, path + '.branchArchive[' + i + '].state', problems, true);
    }
  }

  function validateSerializedState(input) {
    const problems = [];
    let envelope;
    try {
      envelope = parseInput(input);
    } catch (error) {
      return { ok: false, problems: [{ code: 'INVALID_JSON', path: '$', message: error && error.message ? error.message : 'State input is not valid JSON' }] };
    }
    if (!isObject(envelope)) return { ok: false, problems: [{ code: 'INVALID_ENVELOPE', path: '$', message: 'State envelope must be a JSON object' }] };
    if (envelope.schema !== STATE_SCHEMA) problems.push({ code: 'UNSUPPORTED_SCHEMA', path: '$.schema', message: 'Expected ' + STATE_SCHEMA });
    if (!isObject(envelope.state)) problems.push({ code: 'MISSING_STATE', path: '$.state', message: 'State envelope must contain an object state' });
    else validateState(envelope.state, '$.state', problems, false);
    return { ok: problems.length === 0, problems };
  }

  function assertValidSerializedState(input) {
    const result = validateSerializedState(input);
    if (result.ok) return result;
    const error = new Error('Anomaly Garden browser state admission rejected ' + result.problems.length + ' problem(s)');
    error.code = 'AXM_STATE_CONTRACT_REJECTED';
    error.problems = result.problems;
    throw error;
  }

  GardenSimulation.deserialize = function browserAdmittedDeserialize(input) {
    const parsed = parseInput(input);
    assertValidSerializedState(parsed);
    return originalDeserialize.call(this, parsed);
  };

  root.AnomalyGardenBrowserStateAdmission = {
    STATE_SCHEMA,
    validateSerializedState,
    assertValidSerializedState
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
