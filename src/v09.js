(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v08.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const BaseGardenSimulation = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));

  const V09_DEFAULTS = Object.freeze({
    containmentBound: 0.65,
    containmentTriggerStrainEvents: 3,
    containmentInterval: 3
  });

  const V09_METRICS = Object.freeze({
    containmentActivations: 0,
    containmentCycles: 0,
    replicatorsQuarantined: 0
  });

  class GardenSimulation extends BaseGardenSimulation {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.9.0';
      this.config = Object.assign({}, V09_DEFAULTS, this.config, opts.config || {});
      this.containmentPolicy = opts.containmentPolicy || this.containmentPolicy || 'off';
      this.containmentActivated = Boolean(this.containmentActivated);
      this.containmentActivatedAt = this.containmentActivatedAt == null ? null : this.containmentActivatedAt;
      this.metrics = Object.assign({}, V09_METRICS, this.metrics || {});
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    setContainmentPolicy(policy) {
      if (!['off', 'quarantine'].includes(policy)) throw new Error('Unknown containment policy: ' + policy);
      const before = this.containmentPolicy;
      this.containmentPolicy = policy;
      if (policy === 'off') {
        this.containmentActivated = false;
        this.containmentActivatedAt = null;
      }
      return this._receipt('machine.containment-policy-changed', { before, after: policy });
    }

    activeReplicators() {
      return this.machinePrograms.filter((program) => program.active && !program.quarantined);
    }

    quarantinedReplicators() {
      return this.machinePrograms.filter((program) => program.quarantined);
    }

    _chooseReplicationTarget(program) {
      const directions = this._replicationDirections();
      const offset = Math.floor(this.random() * directions.length);
      for (let i = 0; i < directions.length; i += 1) {
        const direction = directions[(offset + i) % directions.length];
        const x = program.x + direction[0];
        const y = program.y + direction[1];
        if (x < 0 || y < 0 || x >= this.config.width || y >= this.config.height) continue;
        if (this.machinePrograms.some((other) => (other.active || other.quarantined) && other.x === x && other.y === y)) continue;
        return { x, y };
      }
      return null;
    }

    _maybeActivateContainment() {
      if (this.containmentPolicy !== 'quarantine' || this.containmentActivated) return null;
      if ((this.metrics.strainEvents || 0) < this.config.containmentTriggerStrainEvents) return null;
      this.containmentActivated = true;
      this.containmentActivatedAt = this.tick;
      this.metrics.containmentActivations += 1;
      return this._receipt('machine.containment-activated', {
        trigger: 'repeated-system-strain',
        strainEvents: this.metrics.strainEvents,
        triggerThreshold: this.config.containmentTriggerStrainEvents,
        systemLoad: round(this.systemLoad(), 4),
        bound: this.config.containmentBound
      }, this.receipts.slice(-6).filter((receipt) => receipt.type === 'machine.system-strain-anomaly').map((receipt) => receipt.id));
    }

    _containReplicators() {
      if (this.containmentPolicy !== 'quarantine' || !this.containmentActivated) return null;
      if (this.tick % this.config.containmentInterval !== 0) return null;
      const active = this.activeReplicators();
      const allowed = Math.max(1, Math.floor(this.config.containmentBound * this.config.systemCapacity / this.config.replicatorCost));
      if (active.length <= allowed) return null;

      const beforeLoad = round(this.systemLoad(), 4);
      const excess = active.length - allowed;
      const candidates = active.slice().sort((a, b) => {
        if (b.generation !== a.generation) return b.generation - a.generation;
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return b.id.localeCompare(a.id);
      }).slice(0, excess);

      const parentReceipts = [];
      const quarantinedIds = [];
      for (const program of candidates) {
        program.active = false;
        program.quarantined = true;
        program.quarantinedAt = this.tick;
        program.quarantineReason = 'global-load-bound';
        quarantinedIds.push(program.id);
        this.metrics.replicatorsQuarantined += 1;
        const receipt = this._receipt('machine.replicator-quarantined', {
          programId: program.id,
          parentId: program.parentId,
          generation: program.generation,
          x: program.x,
          y: program.y,
          reason: program.quarantineReason,
          lineagePreserved: true,
          creationReceiptId: program.creationReceiptId
        }, [program.creationReceiptId].filter(Boolean));
        parentReceipts.push(receipt.id);
      }

      this.metrics.containmentCycles += 1;
      return this._receipt('machine.containment-cycle', {
        quarantinedIds,
        activeBefore: active.length,
        activeAfter: this.activeReplicators().length,
        quarantinedTotal: this.quarantinedReplicators().length,
        systemLoadBefore: beforeLoad,
        systemLoadAfter: round(this.systemLoad(), 4),
        bound: this.config.containmentBound,
        deletionCount: 0
      }, parentReceipts);
    }

    step() {
      super.step();
      this._maybeActivateContainment();
      this._containReplicators();
      return this.snapshot();
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.containmentPolicy = this.containmentPolicy;
      state.containmentActivated = this.containmentActivated;
      state.containmentActivatedAt = this.containmentActivatedAt;
      state.metrics = deepClone(this.metrics);
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      const s = deepClone(state);
      this.version = s.version || '0.9.0';
      this.config = Object.assign({}, V09_DEFAULTS, this.config, s.config || {});
      this.containmentPolicy = s.containmentPolicy || 'off';
      this.containmentActivated = Boolean(s.containmentActivated);
      this.containmentActivatedAt = s.containmentActivatedAt == null ? null : s.containmentActivatedAt;
      this.metrics = Object.assign({}, V09_METRICS, this.metrics || {}, s.metrics || {});
      for (const program of this.machinePrograms) {
        program.quarantined = Boolean(program.quarantined);
        if (program.quarantined) program.active = false;
      }
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
        containmentPolicy: this.containmentPolicy,
        containmentActivated: this.containmentActivated,
        containmentActivatedAt: this.containmentActivatedAt,
        programs: this.machinePrograms.map((program) => [
          program.id, program.active, Boolean(program.quarantined), program.quarantinedAt || null,
          program.quarantineReason || null, program.parentId, program.generation, program.x, program.y
        ]),
        cycles: this.metrics.containmentCycles || 0,
        quarantined: this.metrics.replicatorsQuarantined || 0
      };
      return hashSeed(JSON.stringify(material)).toString(16).padStart(8, '0');
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.containmentPolicy = this.containmentPolicy;
      snapshot.containmentActivated = this.containmentActivated;
      snapshot.containmentActivatedAt = this.containmentActivatedAt;
      snapshot.activeReplicators = this.activeReplicators().length;
      snapshot.quarantinedReplicators = this.quarantinedReplicators().length;
      snapshot.fingerprint = this.stateFingerprint();
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, V09_DEFAULTS), hashSeed, mulberry32 };
});