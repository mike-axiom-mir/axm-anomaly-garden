(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v15.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const Base = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const finiteNonNegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
  let nodeStateContract = null;

  function assertCanonicalStateAdmission(parsed) {
    if (typeof module !== 'object' || !module.exports) return null;
    if (!nodeStateContract) nodeStateContract = require('./state-contract.js');
    return nodeStateContract.assertValidSerializedState(parsed);
  }

  const METRICS = {
    completionAudits: 0,
    completionAuditFailures: 0,
    completionScenariosPlanted: 0
  };

  class GardenSimulation extends Base {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.16.0';
      this.metrics = Object.assign({}, METRICS, this.metrics || {});
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.metrics = clone(this.metrics);
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      this.version = '0.16.0';
      this.metrics = Object.assign({}, METRICS, this.metrics || {}, (state && state.metrics) || {});
      if (typeof this._normalizeCivilization === 'function') this._normalizeCivilization();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : clone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      assertCanonicalStateAdmission(parsed);
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    plantCompletionScenario(options) {
      const opts = options || {};
      const root = this.addModal({
        x: Number(opts.x == null ? 5 : opts.x),
        y: Number(opts.y == null ? 4 : opts.y),
        radius: Number(opts.radius == null ? 4 : opts.radius),
        period: Number(opts.rootPeriod || 48),
        memoryLeak: Number(opts.memoryLeak == null ? 0.35 : opts.memoryLeak)
      });
      const child = this.addNestedModal(root.id, {
        x: root.x,
        y: root.y,
        radius: Math.min(2.4, root.radius * 0.6),
        period: Number(opts.childPeriod || 31),
        memoryLeak: Number(opts.memoryLeak == null ? 0.45 : opts.memoryLeak)
      });
      const grandchild = this.addNestedModal(child.id, {
        x: child.x,
        y: child.y,
        radius: Math.min(1.1, child.radius * 0.45),
        period: Number(opts.grandchildPeriod || 23),
        memoryLeak: Number(opts.memoryLeak == null ? 0.5 : opts.memoryLeak)
      });
      this.initializeModalSubworld(child.id, { population: 4, width: 7, height: 7 });
      this.initializeModalSubworld(grandchild.id, { population: 3, width: 5, height: 5 });

      const sourceResident = child.subworld.residents[0];
      const gate = this.createSubworldGate(child.id, grandchild.id, {
        fromX: sourceResident.x,
        fromY: sourceResident.y,
        toX: Math.floor(grandchild.subworld.width / 2),
        toY: Math.floor(grandchild.subworld.height / 2),
        accessRadius: 0.75,
        capacityPerTick: 2
      });
      const anomaly = this.seedSubworldAnomaly(child.id, 'local-distortion', {
        x: 3, y: 3, radius: 20, intensity: 1, ttl: 120
      });
      const nestedAnomaly = this.seedSubworldAnomaly(grandchild.id, 'clock-echo', {
        x: 2, y: 2, radius: 4, intensity: 0.72, ttl: 80
      });
      const denied = this.seedSubworldProgram(child.id, 'replicator', {
        x: 5, y: 5, authorization: 'denied', period: 3
      });
      const allowed = this.seedSubworldProgram(child.id, 'replicator', {
        x: 1, y: 5, authorization: 'allowed', period: 4
      });
      const warden = this.deploySecurityProgram(child.id, 'warden', {
        x: 4, y: 5, sensorRadius: 3, actionRadius: 2, budget: 6
      });
      const repairer = this.deploySecurityProgram(grandchild.id, 'repairer', {
        x: 1, y: 2, sensorRadius: 3, actionRadius: 2, budget: 5
      });
      this.metrics.completionScenariosPlanted += 1;
      const receipt = this._receipt('intervention.completion-scenario-planted', {
        rootModalId: root.id,
        childModalId: child.id,
        grandchildModalId: grandchild.id,
        gateId: gate.id,
        anomalyIds: [anomaly.id, nestedAnomaly.id],
        programIds: [denied.id, allowed.id, warden.id, repairer.id]
      }, [gate.creationReceiptId, anomaly.creationReceiptId, nestedAnomaly.creationReceiptId].filter(Boolean));
      this._recordIntervention('completion-scenario', { rootModalId: root.id, childModalId: child.id, grandchildModalId: grandchild.id }, receipt.id);
      return { root, child, grandchild, gate, anomaly, nestedAnomaly, denied, allowed, warden, repairer, receipt };
    }

    worldIntegrityReport() {
      const errors = [];
      const warnings = [];
      const residentIds = new Set();
      const programIds = new Set();
      const modalIds = new Set((this.modalZones || []).map((zone) => zone.id));
      const livingIds = new Set((this.modalZones || []).filter((zone) => zone.subworld).map((zone) => zone.id));

      for (const zone of this.modalZones || []) {
        if (!zone.subworld) continue;
        const sw = zone.subworld;
        for (const resident of sw.residents || []) {
          if (residentIds.has(resident.id)) errors.push({ code: 'duplicate-resident-id', modalId: zone.id, id: resident.id });
          residentIds.add(resident.id);
          if (!Array.isArray(resident.memory)) errors.push({ code: 'resident-memory-not-array', modalId: zone.id, id: resident.id });
          if (!Array.isArray(resident.transitHistory)) errors.push({ code: 'resident-transit-history-not-array', modalId: zone.id, id: resident.id });
        }
        for (const program of sw.programs || []) {
          if (programIds.has(program.id)) errors.push({ code: 'duplicate-program-id', modalId: zone.id, id: program.id });
          programIds.add(program.id);
          if (program.quarantined && program.active) errors.push({ code: 'quarantined-program-active', modalId: zone.id, id: program.id });
          if (program.kind === 'security' && !finiteNonNegative(program.securityBudget)) errors.push({ code: 'invalid-security-budget', modalId: zone.id, id: program.id, value: program.securityBudget });
        }
        if (sw.economy) {
          for (const key of ['food', 'energy', 'material']) if (!finiteNonNegative(sw.economy.stock && sw.economy.stock[key])) errors.push({ code: 'invalid-economy-stock', modalId: zone.id, resource: key, value: sw.economy.stock && sw.economy.stock[key] });
          if (!finiteNonNegative(sw.economy.treasury)) errors.push({ code: 'invalid-treasury', modalId: zone.id, value: sw.economy.treasury });
        }
        for (const institution of sw.institutions || []) {
          for (const report of institution.reports || []) {
            if (report.machineTruthIncluded !== false) errors.push({ code: 'institution-truth-boundary', modalId: zone.id, reportId: report.id });
            if (Object.prototype.hasOwnProperty.call(report, 'machineTruth')) errors.push({ code: 'institution-raw-truth-field', modalId: zone.id, reportId: report.id });
            if (!Array.isArray(report.sourceReceiptIds)) errors.push({ code: 'institution-source-list-missing', modalId: zone.id, reportId: report.id });
          }
        }
        for (const packet of sw.inboundEvidence || []) {
          if (!packet.sourceReceiptId) errors.push({ code: 'handoff-source-missing', modalId: zone.id, packetId: packet.id });
          if (Object.prototype.hasOwnProperty.call(packet, 'machineTruth')) errors.push({ code: 'handoff-raw-truth-field', modalId: zone.id, packetId: packet.id });
        }
      }

      for (const gate of this.subworldGates || []) {
        if (!modalIds.has(gate.from.modalId) || !modalIds.has(gate.to.modalId)) errors.push({ code: 'gate-orphan-modal', gateId: gate.id });
        if (!livingIds.has(gate.from.modalId) || !livingIds.has(gate.to.modalId)) errors.push({ code: 'gate-endpoint-not-living', gateId: gate.id });
        const from = this._modalById(gate.from.modalId);
        const to = this._modalById(gate.to.modalId);
        if (from && to && !(from.parentModalId === to.id || to.parentModalId === from.id)) errors.push({ code: 'gate-not-direct-layer-neighbor', gateId: gate.id });
        if (!finiteNonNegative(gate.capacityPerTick) || Number(gate.capacityPerTick) < 1) errors.push({ code: 'gate-invalid-capacity', gateId: gate.id });
        if (gate.usedThisTick > gate.capacityPerTick) errors.push({ code: 'gate-capacity-overrun', gateId: gate.id });
      }

      const receiptIds = new Set((this.receipts || []).map((receipt) => receipt.id));
      for (const zone of this.modalZones || []) {
        if (!zone.subworld) continue;
        for (const resident of zone.subworld.residents || []) {
          for (const memory of resident.memory || []) if (memory.receiptId && !receiptIds.has(memory.receiptId)) warnings.push({ code: 'memory-source-not-hot', residentId: resident.id, receiptId: memory.receiptId });
        }
      }

      return {
        pass: errors.length === 0,
        tick: this.tick,
        fingerprint: this.stateFingerprint(),
        counts: {
          modals: (this.modalZones || []).length,
          livingSubworlds: livingIds.size,
          residents: residentIds.size,
          programs: programIds.size,
          gates: (this.subworldGates || []).length,
          receiptsHot: (this.receipts || []).length
        },
        errors,
        warnings
      };
    }

    runCompletionAudit() {
      const report = this.worldIntegrityReport();
      this.metrics.completionAudits += 1;
      if (!report.pass) this.metrics.completionAuditFailures += 1;
      this._receipt('world.completion-audit', {
        pass: report.pass,
        errors: report.errors.length,
        warnings: report.warnings.length,
        fingerprint: report.fingerprint
      }, []);
      return report;
    }

    worldglassOverview() {
      const living = (this.modalZones || []).filter((zone) => zone.subworld).map((zone) => this.subworldSummary(zone.id));
      return {
        version: this.version,
        tick: this.tick,
        fingerprint: this.stateFingerprint(),
        livingSubworlds: living,
        gates: clone(this.subworldGates || []),
        totals: {
          residents: living.reduce((sum, item) => sum + item.residents, 0),
          experiments: living.reduce((sum, item) => sum + Number(item.experiments || 0), 0),
          modelBreaks: living.reduce((sum, item) => sum + item.residentModelBreaks, 0),
          activeAnomalies: living.reduce((sum, item) => sum + item.activeAnomalies, 0),
          activePrograms: living.reduce((sum, item) => sum + item.activePrograms, 0),
          quarantinedPrograms: living.reduce((sum, item) => sum + item.quarantinedPrograms, 0),
          assemblies: Number(this.metrics.subworldAssemblies || 0)
        }
      };
    }

    causalSlice(options) {
      const opts = options || {};
      const limit = Math.max(1, Math.min(250, Math.floor(Number(opts.limit || 50))));
      const types = Array.isArray(opts.types) ? new Set(opts.types) : null;
      const modalId = opts.modalId || null;
      const selected = [];
      for (let i = (this.receipts || []).length - 1; i >= 0 && selected.length < limit; i--) {
        const receipt = this.receipts[i];
        if (types && !types.has(receipt.type)) continue;
        if (modalId) {
          const payload = receipt.payload || {};
          const related = payload.modalId === modalId || payload.fromModalId === modalId || payload.toModalId === modalId || payload.targetModalId === modalId || payload.parentModalId === modalId;
          if (!related) continue;
        }
        selected.push(clone(receipt));
      }
      return selected.reverse();
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.completion = {
        totals: this.worldglassOverview().totals,
        audit: this.worldIntegrityReport()
      };
      snapshot.fingerprint = this.stateFingerprint();
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG), hashSeed, mulberry32 };
});