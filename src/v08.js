(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v07.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const BaseGardenSimulation = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const makeId = (prefix, n) => prefix + '-' + String(n).padStart(3, '0');

  const V08_DEFAULTS = Object.freeze({
    systemCapacity: 100,
    replicatorCost: 3,
    replicationPeriod: 5,
    replicationBound: 0.65,
    replicationHardLimit: 45,
    strainThreshold: 0.75,
    strainInterval: 6
  });

  const V08_METRICS = Object.freeze({
    replicatorCopies: 0,
    replicatorRefusals: 0,
    replicatorBlocked: 0,
    strainEvents: 0,
    peakSystemLoad: 0
  });

  class GardenSimulation extends BaseGardenSimulation {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.8.0';
      this.config = Object.assign({}, V08_DEFAULTS, this.config, opts.config || {});
      this.replicationPolicy = opts.replicationPolicy || this.replicationPolicy || 'off';
      this.machinePrograms = this.machinePrograms || [];
      this.nextReplicatorId = this.nextReplicatorId || 1;
      this.metrics = Object.assign({}, V08_METRICS, this.metrics || {});
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    setReplicationPolicy(policy) {
      if (!['off', 'bounded', 'open'].includes(policy)) throw new Error('Unknown replication policy: ' + policy);
      const before = this.replicationPolicy;
      this.replicationPolicy = policy;
      return this._receipt('machine.replication-policy-changed', { before, after: policy });
    }

    seedReplicator(options) {
      const opts = options || {};
      const program = {
        id: makeId('replicator', this.nextReplicatorId++),
        type: 'replicator',
        x: Number.isInteger(opts.x) ? clamp(opts.x, 0, this.config.width - 1) : Math.floor(this.random() * this.config.width),
        y: Number.isInteger(opts.y) ? clamp(opts.y, 0, this.config.height - 1) : Math.floor(this.random() * this.config.height),
        generation: 0,
        parentId: null,
        createdAt: this.tick,
        active: true,
        copies: 0,
        creationReceiptId: null
      };
      if (this.machinePrograms.some((item) => item.active && item.x === program.x && item.y === program.y)) return null;
      this.machinePrograms.push(program);
      const receipt = this._receipt('intervention.replicator-seeded', {
        programId: program.id, x: program.x, y: program.y, generation: 0, replicationPolicy: this.replicationPolicy
      });
      program.creationReceiptId = receipt.id;
      this.interventions.push(receipt.id);
      return program;
    }

    systemLoad() {
      const active = this.machinePrograms.filter((program) => program.active).length;
      return active * this.config.replicatorCost / this.config.systemCapacity;
    }

    systemViability() {
      const excess = Math.max(0, this.systemLoad() - 0.55);
      return round(clamp(1 - excess * 0.85, 0, 1));
    }

    _recordPeakLoad() {
      this.metrics.peakSystemLoad = Math.max(this.metrics.peakSystemLoad || 0, round(this.systemLoad(), 4));
    }

    _replicationDirections() {
      return [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
    }

    _chooseReplicationTarget(program) {
      const directions = this._replicationDirections();
      const offset = Math.floor(this.random() * directions.length);
      for (let i = 0; i < directions.length; i += 1) {
        const direction = directions[(offset + i) % directions.length];
        const x = program.x + direction[0];
        const y = program.y + direction[1];
        if (x < 0 || y < 0 || x >= this.config.width || y >= this.config.height) continue;
        if (this.machinePrograms.some((other) => other.active && other.x === x && other.y === y)) continue;
        return { x, y };
      }
      return null;
    }

    _attemptReplication(parent) {
      if (this.replicationPolicy === 'off' || !parent.active) return null;
      const activeCount = this.machinePrograms.filter((program) => program.active).length;
      if (activeCount >= this.config.replicationHardLimit) return null;
      const projectedLoad = (activeCount + 1) * this.config.replicatorCost / this.config.systemCapacity;
      if (this.replicationPolicy === 'bounded' && projectedLoad > this.config.replicationBound) {
        this.metrics.replicatorRefusals += 1;
        return this._receipt('machine.replication-refused', {
          parentId: parent.id, reason: 'shared-budget-bound', projectedLoad: round(projectedLoad, 4), bound: this.config.replicationBound
        }, [parent.creationReceiptId].filter(Boolean));
      }
      const target = this._chooseReplicationTarget(parent);
      if (!target) {
        this.metrics.replicatorBlocked += 1;
        return null;
      }
      const child = {
        id: makeId('replicator', this.nextReplicatorId++), type: 'replicator', x: target.x, y: target.y,
        generation: parent.generation + 1, parentId: parent.id, createdAt: this.tick, active: true, copies: 0, creationReceiptId: null
      };
      this.machinePrograms.push(child);
      parent.copies += 1;
      this.metrics.replicatorCopies += 1;
      const receipt = this._receipt('machine.replicator-copied', {
        parentId: parent.id, childId: child.id, x: child.x, y: child.y, generation: child.generation,
        locallyValid: true, systemLoadAfter: round(this.systemLoad(), 4)
      }, [parent.creationReceiptId].filter(Boolean));
      child.creationReceiptId = receipt.id;
      this._recordPeakLoad();
      return receipt;
    }

    _addStrainAnomaly() {
      const load = this.systemLoad();
      if (load <= this.config.strainThreshold) return null;
      const x = Math.floor(this.random() * this.config.width);
      const y = Math.floor(this.random() * this.config.height);
      const anomaly = {
        id: makeId('anomaly', this.nextAnomalyId++), kind: 'silent-zone', x, y,
        radius: 1.6, intensity: clamp(0.35 + (load - this.config.strainThreshold) * 0.9, 0.35, 1),
        ttl: 16, createdAt: this.tick, active: true, source: 'system-strain'
      };
      this.anomalies.push(anomaly);
      this.metrics.strainEvents += 1;
      return this._receipt('machine.system-strain-anomaly', {
        anomaly: deepClone(anomaly), systemLoad: round(load, 4), viability: this.systemViability()
      }, this.machinePrograms.slice(-6).map((program) => program.creationReceiptId).filter(Boolean));
    }

    _processReplicators() {
      if (this.replicationPolicy === 'off' || !this.machinePrograms.length) return;
      const current = this.machinePrograms.filter((program) => program.active).slice();
      for (const program of current) {
        const numeric = Number(program.id.split('-').pop()) || 0;
        if ((this.tick + numeric) % this.config.replicationPeriod === 0) this._attemptReplication(program);
      }
      this._recordPeakLoad();
      if (this.replicationPolicy === 'open' && this.tick % this.config.strainInterval === 0) this._addStrainAnomaly();
    }

    step() {
      this.tick += 1;
      this._ageAnomalies();
      this._processModals();
      this._processRepairNodes();
      for (const agent of this.agents) {
        this._updateRoutine(agent);
        this._move(agent);
        this._processWorkAndOwnership(agent);
        this._processInstitutionSession(agent);
        this._observe(agent);
        this._updateBelief(agent);
        this._maybeRunInvestigationTest(agent);
        this._updateBelief(agent);
      }
      this._processSocialMeetings();
      this._socialExchange();
      this._processInstitutionReports();
      this._processInstitutionBroadcasts();
      for (const agent of this.agents) this._updateBelief(agent);
      this._processReplicators();
      return this.snapshot();
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.replicationPolicy = this.replicationPolicy;
      state.machinePrograms = deepClone(this.machinePrograms);
      state.metrics = deepClone(this.metrics);
      state.counters = Object.assign({}, state.counters, { nextReplicatorId: this.nextReplicatorId });
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      const s = deepClone(state);
      this.version = s.version || '0.8.0';
      this.config = Object.assign({}, V08_DEFAULTS, this.config, s.config || {});
      this.replicationPolicy = s.replicationPolicy || 'off';
      this.machinePrograms = s.machinePrograms || [];
      this.metrics = Object.assign({}, V08_METRICS, this.metrics || {}, s.metrics || {});
      this.nextReplicatorId = s.counters && s.counters.nextReplicatorId ? s.counters.nextReplicatorId : this.machinePrograms.length + 1;
    }

    serialize() {
      return JSON.stringify({ schema: 'axm-anomaly-garden/state-v1', state: this._captureState(true, true) }, null, 2);
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : deepClone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    stateFingerprint() {
      const parent = super.stateFingerprint();
      const material = {
        parent,
        replicationPolicy: this.replicationPolicy,
        programs: this.machinePrograms.map((program) => [program.id, program.x, program.y, program.generation, program.parentId, program.active, program.copies]),
        load: round(this.systemLoad(), 4), viability: this.systemViability(),
        copies: this.metrics.replicatorCopies, strainEvents: this.metrics.strainEvents
      };
      return hashSeed(JSON.stringify(material)).toString(16).padStart(8, '0');
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.replicationPolicy = this.replicationPolicy;
      snapshot.machinePrograms = deepClone(this.machinePrograms);
      snapshot.systemLoad = round(this.systemLoad(), 4);
      snapshot.systemViability = this.systemViability();
      snapshot.fingerprint = this.stateFingerprint();
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, V08_DEFAULTS), hashSeed, mulberry32 };
});