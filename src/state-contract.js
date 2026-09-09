'use strict';

const crypto = require('crypto');
const { GardenSimulation, hashSeed } = require('./v16.js');

const STATE_SCHEMA = 'axm-anomaly-garden/state-v1';
const UINT32_MAX = 0xffffffff;
const REQUIRED_ARRAYS = [
  'agents',
  'anomalies',
  'modalZones',
  'relationships',
  'institutions',
  'places',
  'repairNodes',
  'receipts',
  'interventions',
  'interventionLog'
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isUint32(value) {
  return Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalValue(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
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

function validateSerializedState(input) {
  const problems = [];
  const add = (code, path, message) => problems.push({ code, path, message });
  let envelope;

  try {
    envelope = parseInput(input);
  } catch (error) {
    add('INVALID_JSON', '$', error && error.message ? error.message : 'State input is not valid JSON');
    return {
      ok: false,
      schema: null,
      version: null,
      tick: null,
      stateSha256: null,
      receiptCount: 0,
      coldReceiptCount: 0,
      problems
    };
  }

  if (!isObject(envelope)) {
    add('INVALID_ENVELOPE', '$', 'State envelope must be a JSON object');
    return {
      ok: false,
      schema: null,
      version: null,
      tick: null,
      stateSha256: null,
      receiptCount: 0,
      coldReceiptCount: 0,
      problems
    };
  }

  if (envelope.schema !== STATE_SCHEMA) {
    add('UNSUPPORTED_SCHEMA', '$.schema', 'Expected ' + STATE_SCHEMA);
  }
  if (!isObject(envelope.state)) {
    add('MISSING_STATE', '$.state', 'State envelope must contain an object state');
    return {
      ok: false,
      schema: envelope.schema || null,
      version: null,
      tick: null,
      stateSha256: null,
      receiptCount: 0,
      coldReceiptCount: 0,
      problems
    };
  }

  const totals = { receipts: 0, coldReceipts: 0 };
  validateState(envelope.state, '$.state', problems, totals, { embedded: false });

  return {
    ok: problems.length === 0,
    schema: envelope.schema || null,
    version: typeof envelope.state.version === 'string' ? envelope.state.version : null,
    tick: Number.isInteger(envelope.state.tick) ? envelope.state.tick : null,
    stateSha256: sha256Canonical(envelope.state),
    receiptCount: totals.receipts,
    coldReceiptCount: totals.coldReceipts,
    problems
  };
}

function validateState(state, path, problems, totals, options) {
  const add = (code, suffix, message) => problems.push({ code, path: path + suffix, message });
  const embedded = Boolean(options && options.embedded);

  if (!isObject(state)) {
    add('INVALID_STATE', '', 'Canonical state must be an object');
    return;
  }

  if (typeof state.version !== 'string' || state.version.length === 0) add('INVALID_VERSION', '.version', 'version must be a non-empty string');
  if (typeof state.seedText !== 'string' || state.seedText.length === 0) add('INVALID_SEED_TEXT', '.seedText', 'seedText must be a non-empty string');
  if (!isUint32(state.seed)) add('INVALID_SEED', '.seed', 'seed must be an unsigned 32-bit integer');
  if (typeof state.seedText === 'string' && isUint32(state.seed) && hashSeed(state.seedText) !== state.seed) {
    add('SEED_IDENTITY_MISMATCH', '.seed', 'seed does not match hashSeed(seedText)');
  }
  if (!isUint32(state.rngState)) add('INVALID_RNG_STATE', '.rngState', 'rngState must be an unsigned 32-bit integer');
  if (!isNonNegativeInteger(state.tick)) add('INVALID_TICK', '.tick', 'tick must be a non-negative integer');

  if (!isObject(state.config)) {
    add('INVALID_CONFIG', '.config', 'config must be an object');
  } else {
    if (!isPositiveInteger(state.config.width)) add('INVALID_WIDTH', '.config.width', 'width must be a positive integer');
    if (!isPositiveInteger(state.config.height)) add('INVALID_HEIGHT', '.config.height', 'height must be a positive integer');
    if (!isPositiveInteger(state.config.population)) add('INVALID_POPULATION', '.config.population', 'population must be a positive integer');
  }

  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(state[key])) add('MISSING_ARRAY', '.' + key, key + ' must be an array');
  }
  if (!embedded && !Array.isArray(state.checkpoints)) add('MISSING_ARRAY', '.checkpoints', 'checkpoints must be an array in exported state');
  if (!embedded && !Array.isArray(state.branchArchive)) add('MISSING_ARRAY', '.branchArchive', 'branchArchive must be an array in exported state');
  if (state.coldHistory !== undefined && !Array.isArray(state.coldHistory)) add('INVALID_COLD_HISTORY', '.coldHistory', 'coldHistory must be an array when present');
  if (!isObject(state.metrics)) add('INVALID_METRICS', '.metrics', 'metrics must be an object');
  if (!isObject(state.counters)) add('INVALID_COUNTERS', '.counters', 'counters must be an object');

  const idSets = {};
  const objectCollections = [
    ['agents', 'inhabitant'],
    ['anomalies', 'anomaly'],
    ['modalZones', 'modal'],
    ['relationships', 'relation'],
    ['institutions', 'institution'],
    ['places', 'place'],
    ['repairNodes', 'repair']
  ];

  for (const [key] of objectCollections) {
    idSets[key] = validateUniqueIds(Array.isArray(state[key]) ? state[key] : [], path + '.' + key, problems);
  }

  const checkpoints = Array.isArray(state.checkpoints) ? state.checkpoints : [];
  const archives = Array.isArray(state.branchArchive) ? state.branchArchive : [];
  const checkpointIds = validateUniqueIds(checkpoints, path + '.checkpoints', problems);
  const branchIds = validateUniqueIds(archives, path + '.branchArchive', problems);

  if (Array.isArray(state.relationships)) {
    for (let i = 0; i < state.relationships.length; i += 1) {
      const relation = state.relationships[i];
      if (!isObject(relation)) continue;
      if (!idSets.agents.has(relation.a)) add('UNKNOWN_RELATION_ENDPOINT', '.relationships[' + i + '].a', 'relationship endpoint does not exist');
      if (!idSets.agents.has(relation.b)) add('UNKNOWN_RELATION_ENDPOINT', '.relationships[' + i + '].b', 'relationship endpoint does not exist');
      if (relation.a === relation.b) add('SELF_RELATION', '.relationships[' + i + ']', 'relationship endpoints must differ');
    }
  }

  if (Array.isArray(state.modalZones)) {
    for (let i = 0; i < state.modalZones.length; i += 1) {
      const modal = state.modalZones[i];
      if (!isObject(modal) || !Array.isArray(modal.anchors)) continue;
      for (let j = 0; j < modal.anchors.length; j += 1) {
        const anchor = modal.anchors[j];
        if (isObject(anchor) && !idSets.agents.has(anchor.agentId)) {
          add('UNKNOWN_MODAL_ANCHOR', '.modalZones[' + i + '].anchors[' + j + '].agentId', 'modal anchor agent does not exist');
        }
      }
    }
  }

  const receiptRecords = [];
  const coldChunks = Array.isArray(state.coldHistory) ? state.coldHistory : [];
  const coldChunkIds = new Set();

  for (let i = 0; i < coldChunks.length; i += 1) {
    const chunk = coldChunks[i];
    const chunkPath = path + '.coldHistory[' + i + ']';
    if (!isObject(chunk)) {
      problems.push({ code: 'INVALID_COLD_CHUNK', path: chunkPath, message: 'cold history chunk must be an object' });
      continue;
    }
    if (typeof chunk.id !== 'string' || coldChunkIds.has(chunk.id)) {
      problems.push({ code: 'DUPLICATE_COLD_CHUNK_ID', path: chunkPath + '.id', message: 'cold history chunk id must be unique' });
    } else {
      coldChunkIds.add(chunk.id);
    }
    if (chunk.encoding !== 'json-tuples-v1') problems.push({ code: 'UNSUPPORTED_COLD_ENCODING', path: chunkPath + '.encoding', message: 'expected json-tuples-v1' });
    if (typeof chunk.data !== 'string') {
      problems.push({ code: 'INVALID_COLD_DATA', path: chunkPath + '.data', message: 'cold history data must be a JSON tuple string' });
      continue;
    }
    const expectedHash = hashSeed(chunk.data).toString(16).padStart(8, '0');
    if (chunk.hash !== expectedHash) problems.push({ code: 'COLD_HASH_MISMATCH', path: chunkPath + '.hash', message: 'cold history data does not match its recorded hash' });
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
    if (chunk.count !== tuples.length) problems.push({ code: 'COLD_COUNT_MISMATCH', path: chunkPath + '.count', message: 'cold history count does not match decoded tuples' });
    if (tuples.length > 0) {
      const firstNumber = numericId(tuples[0] && tuples[0][0], 'event');
      const lastNumber = numericId(tuples[tuples.length - 1] && tuples[tuples.length - 1][0], 'event');
      if (firstNumber !== chunk.startReceiptNumber) problems.push({ code: 'COLD_START_MISMATCH', path: chunkPath + '.startReceiptNumber', message: 'startReceiptNumber does not match first tuple' });
      if (lastNumber !== chunk.endReceiptNumber) problems.push({ code: 'COLD_END_MISMATCH', path: chunkPath + '.endReceiptNumber', message: 'endReceiptNumber does not match last tuple' });
    }
    for (let j = 0; j < tuples.length; j += 1) {
      const tuple = tuples[j];
      const tuplePath = chunkPath + '.data[' + j + ']';
      if (!Array.isArray(tuple) || tuple.length < 5) {
        problems.push({ code: 'INVALID_COLD_RECEIPT', path: tuplePath, message: 'cold receipt tuple must contain id, tick, type, payload, parents' });
        continue;
      }
      receiptRecords.push({ id: tuple[0], tick: tuple[1], type: tuple[2], parents: tuple[4], path: tuplePath, cold: true });
      totals.coldReceipts += 1;
    }
  }

  const hotReceipts = Array.isArray(state.receipts) ? state.receipts : [];
  for (let i = 0; i < hotReceipts.length; i += 1) {
    const receipt = hotReceipts[i];
    const receiptPath = path + '.receipts[' + i + ']';
    if (!isObject(receipt)) {
      problems.push({ code: 'INVALID_RECEIPT', path: receiptPath, message: 'receipt must be an object' });
      continue;
    }
    receiptRecords.push({ id: receipt.id, tick: receipt.tick, type: receipt.type, parents: receipt.parents, path: receiptPath, cold: false });
  }

  const receiptIds = new Set();
  let maxReceiptNumber = 0;
  for (const record of receiptRecords) {
    const number = numericId(record.id, 'event');
    if (number === null) problems.push({ code: 'INVALID_RECEIPT_ID', path: record.path + '.id', message: 'receipt id must match event-<positive integer>' });
    else maxReceiptNumber = Math.max(maxReceiptNumber, number);
    if (receiptIds.has(record.id)) problems.push({ code: 'DUPLICATE_RECEIPT_ID', path: record.path + '.id', message: 'receipt id already exists in hot/cold canonical history' });
    else receiptIds.add(record.id);
    if (!isNonNegativeInteger(record.tick) || (isNonNegativeInteger(state.tick) && record.tick > state.tick)) {
      problems.push({ code: 'INVALID_RECEIPT_TICK', path: record.path + '.tick', message: 'receipt tick must be within the current canonical timeline' });
    }
    if (typeof record.type !== 'string' || record.type.length === 0) problems.push({ code: 'INVALID_RECEIPT_TYPE', path: record.path + '.type', message: 'receipt type must be a non-empty string' });
    if (!Array.isArray(record.parents)) problems.push({ code: 'INVALID_RECEIPT_PARENTS', path: record.path + '.parents', message: 'receipt parents must be an array' });
  }

  for (const record of receiptRecords) {
    if (!Array.isArray(record.parents)) continue;
    for (let i = 0; i < record.parents.length; i += 1) {
      const parentId = record.parents[i];
      if (!receiptIds.has(parentId)) problems.push({ code: 'DANGLING_RECEIPT_PARENT', path: record.path + '.parents[' + i + ']', message: 'parent receipt is absent from hot/cold canonical history' });
      if (parentId === record.id) problems.push({ code: 'SELF_RECEIPT_PARENT', path: record.path + '.parents[' + i + ']', message: 'receipt cannot parent itself' });
    }
  }

  totals.receipts += receiptRecords.length;

  if (Array.isArray(state.interventions)) {
    for (let i = 0; i < state.interventions.length; i += 1) {
      if (!receiptIds.has(state.interventions[i])) add('DANGLING_INTERVENTION', '.interventions[' + i + ']', 'intervention receipt is absent from canonical history');
    }
  }
  if (Array.isArray(state.interventionLog)) {
    for (let i = 0; i < state.interventionLog.length; i += 1) {
      const entry = state.interventionLog[i];
      if (!isObject(entry)) continue;
      if (entry.receiptId && !receiptIds.has(entry.receiptId)) add('DANGLING_INTERVENTION_LOG', '.interventionLog[' + i + '].receiptId', 'intervention log receipt is absent from canonical history');
    }
  }

  for (let i = 0; i < checkpoints.length; i += 1) {
    const checkpoint = checkpoints[i];
    const checkpointPath = path + '.checkpoints[' + i + ']';
    if (!isObject(checkpoint)) continue;
    if (!receiptIds.has(checkpoint.receiptId)) problems.push({ code: 'DANGLING_CHECKPOINT_RECEIPT', path: checkpointPath + '.receiptId', message: 'checkpoint receipt is absent from canonical history' });
    if (!isNonNegativeInteger(checkpoint.tick) || (isNonNegativeInteger(state.tick) && checkpoint.tick > state.tick)) problems.push({ code: 'INVALID_CHECKPOINT_TICK', path: checkpointPath + '.tick', message: 'checkpoint tick must be within current timeline' });
    if (!isObject(checkpoint.state)) problems.push({ code: 'MISSING_CHECKPOINT_STATE', path: checkpointPath + '.state', message: 'checkpoint must retain canonical state' });
    else validateState(checkpoint.state, checkpointPath + '.state', problems, totals, { embedded: true });
  }

  for (let i = 0; i < archives.length; i += 1) {
    const archive = archives[i];
    const archivePath = path + '.branchArchive[' + i + ']';
    if (!isObject(archive)) continue;
    if (!isObject(archive.state)) problems.push({ code: 'MISSING_ARCHIVE_STATE', path: archivePath + '.state', message: 'abandoned branch must retain its canonical state' });
    else validateState(archive.state, archivePath + '.state', problems, totals, { embedded: true });
  }

  if (isObject(state.counters)) {
    validateNextCounter(state.counters.nextReceiptId, maxReceiptNumber, path + '.counters.nextReceiptId', 'receipt', problems);
    validateNextCounter(state.counters.nextAnomalyId, maxNumericId(Array.isArray(state.anomalies) ? state.anomalies : [], 'anomaly'), path + '.counters.nextAnomalyId', 'anomaly', problems);
    validateNextCounter(state.counters.nextModalId, maxNumericId(Array.isArray(state.modalZones) ? state.modalZones : [], 'modal'), path + '.counters.nextModalId', 'modal', problems);
    if (!embedded || checkpoints.length > 0) validateNextCounter(state.counters.nextCheckpointId, maxSetNumericId(checkpointIds, 'checkpoint'), path + '.counters.nextCheckpointId', 'checkpoint', problems);
    if (!embedded || archives.length > 0) validateNextCounter(state.counters.nextBranchId, maxSetNumericId(branchIds, 'branch'), path + '.counters.nextBranchId', 'branch', problems);
    if (state.counters.nextColdChunkId !== undefined) validateNextCounter(state.counters.nextColdChunkId, maxSetNumericId(coldChunkIds, 'cold'), path + '.counters.nextColdChunkId', 'cold chunk', problems);
  }
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

function maxNumericId(items, prefix) {
  let max = 0;
  for (const item of items) {
    if (!isObject(item)) continue;
    const number = numericId(item.id, prefix);
    if (number !== null) max = Math.max(max, number);
  }
  return max;
}

function maxSetNumericId(ids, prefix) {
  let max = 0;
  for (const id of ids) {
    const number = numericId(id, prefix);
    if (number !== null) max = Math.max(max, number);
  }
  return max;
}

function validateNextCounter(value, maxUsed, path, label, problems) {
  if (!isPositiveInteger(value)) {
    problems.push({ code: 'INVALID_NEXT_COUNTER', path, message: 'next ' + label + ' counter must be a positive integer' });
    return;
  }
  if (value <= maxUsed) problems.push({ code: 'STALE_NEXT_COUNTER', path, message: 'next ' + label + ' counter would reuse an existing canonical id' });
}

function assertValidSerializedState(input) {
  const result = validateSerializedState(input);
  if (result.ok) return result;
  const error = new Error('Anomaly Garden state contract rejected ' + result.problems.length + ' problem(s)');
  error.code = 'AXM_STATE_CONTRACT_REJECTED';
  error.problems = result.problems;
  throw error;
}

function deserializeVerified(input) {
  const before = assertValidSerializedState(input);
  const sim = GardenSimulation.deserialize(input);
  const afterText = sim.serialize();
  const after = assertValidSerializedState(afterText);
  if (before.version === sim.version && before.stateSha256 !== after.stateSha256) {
    const error = new Error('Current-version state changed during verified deserialize/serialize round trip');
    error.code = 'AXM_STATE_ROUND_TRIP_DRIFT';
    error.beforeSha256 = before.stateSha256;
    error.afterSha256 = after.stateSha256;
    throw error;
  }
  return { simulation: sim, validation: before, restoredValidation: after };
}

module.exports = {
  STATE_SCHEMA,
  canonicalJson,
  sha256Canonical,
  validateSerializedState,
  assertValidSerializedState,
  deserializeVerified
};
