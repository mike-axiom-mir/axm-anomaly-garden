(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v14.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const Base = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));

  const DEFAULTS = {
    subworldInvestigationPeriod: 3,
    subworldAssemblyPeriod: 12,
    subworldReplicationMaterialCost: 1,
    subworldReplicationEnergyCost: 1,
    subworldResourceRecoveryPeriod: 10
  };

  const METRICS = {
    subworldResidentExperiments: 0,
    subworldAssemblies: 0,
    subworldDissentReports: 0,
    subworldReplicationResourceBlocks: 0,
    subworldResourceRecoveries: 0
  };

  class GardenSimulation extends Base {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.15.0';
      this.config = Object.assign({}, DEFAULTS, this.config, opts.config || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {});
      this._normalizeCivilization();
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
      this.version = '0.15.0';
      this.config = Object.assign({}, DEFAULTS, this.config, (state && state.config) || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {}, (state && state.metrics) || {});
      this._normalizeCivilization();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : clone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    _normalizeCivilizationZone(zone) {
      if (!zone || !zone.subworld) return;
      if (typeof this._normalizeEconomyZone === 'function') this._normalizeEconomyZone(zone);
      const sw = zone.subworld;
      sw.institutions = Array.isArray(sw.institutions) ? sw.institutions : [];
      if (!sw.institutions.length) {
        sw.institutions.push({
          id: zone.id + '-inquiry-assembly',
          name: 'Local Inquiry Assembly',
          memberIds: sw.residents.map((resident) => resident.id),
          reports: [],
          proposals: [],
          lastAssemblyTick: -1
        });
      }
      for (const institution of sw.institutions) {
        institution.memberIds = Array.isArray(institution.memberIds) ? institution.memberIds : [];
        institution.reports = Array.isArray(institution.reports) ? institution.reports : [];
        institution.proposals = Array.isArray(institution.proposals) ? institution.proposals : [];
        institution.lastAssemblyTick = Number(institution.lastAssemblyTick == null ? -1 : institution.lastAssemblyTick);
        for (const resident of sw.residents) if (!institution.memberIds.includes(resident.id)) institution.memberIds.push(resident.id);
      }
      sw.residents.forEach((resident) => {
        resident.experimentCount = Number(resident.experimentCount || 0);
        resident.lastExperimentTick = Number(resident.lastExperimentTick == null ? -1 : resident.lastExperimentTick);
      });
    }

    _normalizeCivilization() {
      for (const zone of this.modalZones || []) this._normalizeCivilizationZone(zone);
    }

    _refreshBaseline(zone) {
      super._refreshBaseline(zone);
      if (!zone || !zone.subworld || !zone.subworld.baseline) return;
      const sw = zone.subworld;
      if (sw.economy) sw.baseline.economy = clone(sw.economy);
      if (sw.securityPolicy) sw.baseline.securityPolicy = clone(sw.securityPolicy);
      if (sw.institutions) sw.baseline.institutions = clone(sw.institutions);
      if (sw.inboundEvidence) sw.baseline.inboundEvidence = clone(sw.inboundEvidence);
    }

    _restoreLivingBaseline(zone) {
      const saved = zone && zone.subworld && zone.subworld.baseline ? clone(zone.subworld.baseline) : null;
      super._restoreLivingBaseline(zone);
      if (!zone || !zone.subworld || !saved) return;
      if (saved.economy) zone.subworld.economy = clone(saved.economy);
      if (saved.securityPolicy) zone.subworld.securityPolicy = clone(saved.securityPolicy);
      if (saved.institutions) zone.subworld.institutions = clone(saved.institutions);
      if (saved.inboundEvidence) zone.subworld.inboundEvidence = clone(saved.inboundEvidence);
      this._normalizeCivilizationZone(zone);
    }

    initializeModalSubworld(modalId, options) {
      const sw = super.initializeModalSubworld(modalId, options);
      const zone = this._livingZone(modalId);
      this._normalizeCivilizationZone(zone);
      this._refreshBaseline(zone);
      return sw;
    }

    _experimentBlocked(zone, resident, anomalyId, reason) {
      return this._receipt('subworld.experiment-blocked', {
        modalId: zone.id,
        residentId: resident && resident.id,
        anomalyId: anomalyId || null,
        reason,
        localTick: zone.subworld.tick
      }, []);
    }

    runResidentExperiment(modalId, residentId, anomalyId) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Experiment requires a living subworld');
      this._normalizeCivilizationZone(zone);
      const sw = zone.subworld;
      const resident = sw.residents.find((item) => item.id === residentId);
      if (!resident) throw new Error('Resident is not in this subworld');
      if (!(resident.seenAnomalies || []).includes(anomalyId)) return this._experimentBlocked(zone, resident, anomalyId, 'target-not-observed-by-resident');
      const anomaly = sw.anomalies.find((item) => item.id === anomalyId);
      if (!anomaly) return this._experimentBlocked(zone, resident, anomalyId, 'anomaly-not-found');

      resident.experimentCount += 1;
      resident.lastExperimentTick = sw.tick;
      const noise = ((hashSeed([this.seed, zone.id, resident.id, anomaly.id, resident.experimentCount, 'experiment'].join('|')) >>> 0) / 4294967296) * 0.14;
      const signal = round(anomaly.active ? clamp(anomaly.intensity * (0.82 + noise), 0, 1) : noise * 0.25, 4);
      const expectedCeiling = 0.28 + resident.skepticism * 0.08;
      const contradiction = signal > expectedCeiling;
      resident.discrepancy = round(clamp(resident.discrepancy + (contradiction ? 0.16 + signal * 0.14 : -0.025), 0, 1.5), 4);
      const receipt = this._receipt('subworld.inhabitant-ran-experiment', {
        modalId: zone.id,
        residentId: resident.id,
        anomalyId: anomaly.id,
        experimentIndex: resident.experimentCount,
        signal,
        expectedCeiling: round(expectedCeiling, 4),
        contradiction,
        discrepancyAfter: resident.discrepancy,
        localTick: sw.tick
      }, [anomaly.creationReceiptId].filter(Boolean));
      resident.memory.push({ localTick: sw.tick, receiptId: receipt.id, summary: contradiction ? 'experiment contradicted local expectation' : 'experiment fit local expectation' });
      this.metrics.subworldResidentExperiments += 1;

      if (!resident.investigating && resident.discrepancy >= resident.threshold) {
        resident.investigating = true;
        sw.metrics.residentInvestigations += 1;
        this.metrics.subworldResidentInvestigations += 1;
        this._receipt('subworld.inhabitant-started-investigation', {
          modalId: zone.id,
          residentId: resident.id,
          localTick: sw.tick,
          discrepancy: resident.discrepancy,
          threshold: resident.threshold,
          trigger: 'resident-experiment'
        }, [receipt.id]);
      }
      const evidence = resident.memory.filter((item) => item.receiptId).slice(-6);
      if (!resident.modelBreak && resident.investigating && resident.experimentCount >= 2 && resident.discrepancy >= 0.68) {
        resident.modelBreak = true;
        resident.hypothesis = 'local-world-model-is-incomplete';
        sw.metrics.residentModelBreaks += 1;
        this.metrics.subworldResidentModelBreaks += 1;
        this._receipt('subworld.inhabitant-model-break', {
          modalId: zone.id,
          residentId: resident.id,
          localTick: sw.tick,
          hypothesis: resident.hypothesis,
          evidenceCount: evidence.length,
          trigger: 'repeated-resident-experiment'
        }, evidence.map((item) => item.receiptId));
      }
      return receipt;
    }

    conveneSubworldAssembly(modalId) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Assembly requires a living subworld');
      this._normalizeCivilizationZone(zone);
      const sw = zone.subworld;
      const institution = sw.institutions[0];
      const members = sw.residents.filter((resident) => institution.memberIds.includes(resident.id));
      const incomplete = members.filter((resident) => resident.modelBreak);
      const investigating = members.filter((resident) => resident.investigating && !resident.modelBreak);
      const routine = members.filter((resident) => !resident.investigating && !resident.modelBreak);
      let narrative = 'routine-consensus';
      if (incomplete.length && routine.length) narrative = 'contested-model';
      else if (incomplete.length) narrative = 'incomplete-model-supported';
      else if (investigating.length) narrative = 'evidence-under-review';
      const sourceReceipts = [];
      for (const resident of members) {
        for (const memory of (resident.memory || []).slice(-2)) if (memory.receiptId && !sourceReceipts.includes(memory.receiptId)) sourceReceipts.push(memory.receiptId);
      }
      for (const packet of (sw.inboundEvidence || []).slice(-4)) if (packet.sourceReceiptId && !sourceReceipts.includes(packet.sourceReceiptId)) sourceReceipts.push(packet.sourceReceiptId);
      const dissent = Math.min(incomplete.length, routine.length + investigating.length);
      const report = {
        id: institution.id + '-report-' + String(institution.reports.length + 1).padStart(3, '0'),
        localTick: sw.tick,
        narrative,
        counts: { incomplete: incomplete.length, investigating: investigating.length, routine: routine.length },
        dissent,
        sourceReceiptIds: sourceReceipts.slice(),
        machineTruthIncluded: false
      };
      const receipt = this._receipt('subworld.institution-report', {
        modalId: zone.id,
        institutionId: institution.id,
        report: clone(report)
      }, sourceReceipts);
      report.receiptId = receipt.id;
      institution.reports.push(report);
      institution.lastAssemblyTick = sw.tick;
      if (incomplete.length) institution.proposals.push({
        id: institution.id + '-proposal-' + String(institution.proposals.length + 1).padStart(3, '0'),
        localTick: sw.tick,
        proposal: 'fund-local-tests',
        voluntary: true,
        sourceReportId: report.id
      });
      this.metrics.subworldAssemblies += 1;
      if (dissent > 0) this.metrics.subworldDissentReports += 1;
      return report;
    }

    _processResidentExperiments() {
      for (const zone of (this.modalZones || []).filter((item) => item.active && item.subworld)) {
        this._normalizeCivilizationZone(zone);
        const sw = zone.subworld;
        if (sw.tick <= 0 || sw.tick % Number(this.config.subworldInvestigationPeriod) !== 0) continue;
        for (const resident of sw.residents.slice().sort((a, b) => a.id.localeCompare(b.id))) {
          const seen = (resident.seenAnomalies || []).slice().reverse();
          const targetId = seen.find((id) => sw.anomalies.some((anomaly) => anomaly.id === id));
          if (!targetId || resident.lastExperimentTick === sw.tick) continue;
          this.runResidentExperiment(zone.id, resident.id, targetId);
        }
      }
    }

    _processAssemblies() {
      for (const zone of (this.modalZones || []).filter((item) => item.active && item.subworld)) {
        this._normalizeCivilizationZone(zone);
        const sw = zone.subworld;
        const institution = sw.institutions[0];
        if (sw.tick > 0 && sw.tick % Number(this.config.subworldAssemblyPeriod) === 0 && institution.lastAssemblyTick !== sw.tick) this.conveneSubworldAssembly(zone.id);
      }
    }

    _replicate(zone, sw, parent) {
      const due = parent && parent.active && !parent.quarantined && parent.kind === 'replicator' && sw.tick > 0 && (sw.tick + parent.generation) % parent.period === 0;
      if (!due) return super._replicate(zone, sw, parent);
      this._normalizeCivilizationZone(zone);
      const materialCost = Math.max(0, Number(this.config.subworldReplicationMaterialCost));
      const energyCost = Math.max(0, Number(this.config.subworldReplicationEnergyCost));
      if (Number(sw.economy.stock.material || 0) < materialCost || Number(sw.economy.stock.energy || 0) < energyCost) {
        this.metrics.subworldReplicationResourceBlocks += 1;
        this._receipt('subworld.program-copy-blocked', {
          modalId: zone.id,
          parentProgramId: parent.id,
          reason: 'resource-pressure',
          required: { material: materialCost, energy: energyCost },
          available: { material: Number(sw.economy.stock.material || 0), energy: Number(sw.economy.stock.energy || 0) },
          localTick: sw.tick
        }, [parent.creationReceiptId].filter(Boolean));
        return;
      }
      const before = sw.programs.length;
      super._replicate(zone, sw, parent);
      if (sw.programs.length > before) {
        sw.economy.stock.material -= materialCost;
        sw.economy.stock.energy -= energyCost;
        this._receipt('subworld.replication-resources-spent', {
          modalId: zone.id,
          parentProgramId: parent.id,
          materialCost,
          energyCost,
          stockAfter: clone(sw.economy.stock),
          localTick: sw.tick
        }, [parent.creationReceiptId].filter(Boolean));
      }
    }

    _recoverResources() {
      for (const zone of (this.modalZones || []).filter((item) => item.active && item.subworld)) {
        this._normalizeCivilizationZone(zone);
        const sw = zone.subworld;
        if (sw.tick <= 0 || sw.tick % Number(this.config.subworldResourceRecoveryPeriod) !== 0) continue;
        sw.economy.stock.energy = Number(sw.economy.stock.energy || 0) + 1;
        sw.economy.stock.material = Number(sw.economy.stock.material || 0) + 1;
        this.metrics.subworldResourceRecoveries += 1;
        this._receipt('subworld.resources-recovered', {
          modalId: zone.id,
          resources: { energy: 1, material: 1 },
          stockAfter: clone(sw.economy.stock),
          localTick: sw.tick
        }, []);
      }
    }

    step() {
      super.step();
      this._processResidentExperiments();
      this._processAssemblies();
      this._recoverResources();
      return this.snapshot();
    }

    subworldSummary(modalId) {
      const summary = super.subworldSummary(modalId);
      if (!summary) return null;
      const zone = this._livingZone(modalId);
      this._normalizeCivilizationZone(zone);
      summary.institutions = zone.subworld.institutions.map((institution) => ({
        id: institution.id,
        name: institution.name,
        members: institution.memberIds.length,
        reports: institution.reports.length,
        proposals: institution.proposals.length,
        lastAssemblyTick: institution.lastAssemblyTick,
        latestNarrative: institution.reports.length ? institution.reports[institution.reports.length - 1].narrative : null
      }));
      summary.experiments = zone.subworld.residents.reduce((sum, resident) => sum + Number(resident.experimentCount || 0), 0);
      return summary;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, DEFAULTS), hashSeed, mulberry32 };
});