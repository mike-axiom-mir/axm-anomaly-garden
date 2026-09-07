(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v09.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const BaseGardenSimulation = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const makeId = (prefix, n) => prefix + '-' + String(n).padStart(3, '0');

  const WORLD_METRIC_KEYS = [
    'observations', 'investigations', 'socialSignals', 'thresholdCrossings', 'awakenings',
    'repairActions', 'modalResets', 'memoryLeaks', 'testsRun', 'production', 'socialMeetings',
    'projectsCompleted', 'resourcesAcquired', 'resourcesUsed', 'institutionReports',
    'narrativeChanges', 'institutionBroadcasts', 'replicatorCopies', 'replicatorRefusals',
    'replicatorBlocked', 'strainEvents', 'peakSystemLoad', 'containmentActivations',
    'containmentCycles', 'replicatorsQuarantined'
  ];

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = stable(value[key]);
    return result;
  }

  function stableString(value) { return JSON.stringify(stable(value)); }

  function branchNumber(id) {
    const match = /^branch-(\d+)$/.exec(String(id || ''));
    return match ? Number(match[1]) : 0;
  }

  function receiptCountFromState(state) {
    const hot = (state.receipts || []).length;
    const cold = (state.coldHistory || []).reduce((sum, chunk) => sum + Number(chunk.count || 0), 0);
    return hot + cold;
  }

  class GardenSimulation extends BaseGardenSimulation {
    constructor(options) {
      super(options || {});
      this.version = '0.10.0';
      this.metrics = Object.assign({ futureForks: 0 }, this.metrics || {});
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.metrics = deepClone(this.metrics);
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      this.version = '0.10.0';
      this.metrics = Object.assign({ futureForks: 0 }, this.metrics || {});
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : deepClone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    _futureBranch(ref) {
      if (!ref || ref === 'current') return null;
      return this.branchArchive.find((branch) => branch.id === ref) || null;
    }

    _futureState(ref) {
      if (!ref || ref === 'current') return this._captureState(false, false);
      const branch = this._futureBranch(ref);
      return branch ? deepClone(branch.state) : null;
    }

    _worldDigestFromState(state) {
      if (!state) return null;
      const metrics = {};
      for (const key of WORLD_METRIC_KEYS) metrics[key] = Number((state.metrics || {})[key] || 0);
      const material = {
        tick: state.tick,
        seed: state.seed,
        rngState: state.rngState,
        repairPolicy: state.repairPolicy || 'tolerant',
        replicationPolicy: state.replicationPolicy || 'off',
        containmentPolicy: state.containmentPolicy || 'off',
        containmentActivated: Boolean(state.containmentActivated),
        agents: (state.agents || []).map((agent) => ({
          id: agent.id, x: agent.x, y: agent.y, home: agent.home, role: agent.role,
          workplaceId: agent.workplaceId, socialPlaceId: agent.socialPlaceId,
          currentActivity: agent.currentActivity, plannedActivity: agent.plannedActivity,
          energy: agent.energy, socialNeed: agent.socialNeed, hunger: agent.hunger, credits: agent.credits,
          inventory: agent.inventory, ownedArtifacts: agent.ownedArtifacts, project: agent.project,
          discrepancy: agent.discrepancy, confidence: agent.confidence, hypothesis: agent.hypothesis,
          investigating: agent.investigating, awakened: agent.awakened, modalMemory: agent.modalMemory,
          testsRun: agent.testsRun, routineDeviations: agent.routineDeviations,
          institutionId: agent.institutionId, institutionTrust: agent.institutionTrust,
          institutionCommitment: agent.institutionCommitment,
          memories: (agent.memory || []).map((memory) => [memory.tick, memory.summary])
        })),
        institutions: (state.institutions || []).map((institution) => ({
          id: institution.id, narrative: institution.narrative, evidenceWeight: institution.evidenceWeight,
          reporters: institution.reporters, reportCount: (institution.reports || []).length,
          broadcasts: institution.broadcasts, proposals: institution.proposals,
          currentProposal: institution.currentProposal
        })),
        places: state.places || [],
        anomalies: state.anomalies || [],
        modals: state.modalZones || [],
        relationships: state.relationships || [],
        repairNodes: state.repairNodes || [],
        machinePrograms: (state.machinePrograms || []).map((program) => ({
          id: program.id, type: program.type, x: program.x, y: program.y, generation: program.generation,
          parentId: program.parentId, createdAt: program.createdAt, active: program.active,
          quarantined: Boolean(program.quarantined), quarantinedAt: program.quarantinedAt || null,
          quarantineReason: program.quarantineReason || null, copies: program.copies
        })),
        metrics
      };
      return hashSeed(stableString(material)).toString(16).padStart(8, '0');
    }

    _futureFingerprint(ref) {
      if (!ref || ref === 'current') return this.stateFingerprint();
      const branch = this._futureBranch(ref);
      return branch ? branch.fingerprint : null;
    }

    _futureSummary(ref) {
      const state = this._futureState(ref);
      if (!state) return null;
      const branch = this._futureBranch(ref);
      const metrics = state.metrics || {};
      const programs = state.machinePrograms || [];
      const agents = state.agents || [];
      const summaryMetrics = {};
      for (const key of WORLD_METRIC_KEYS) summaryMetrics[key] = Number(metrics[key] || 0);
      return {
        id: ref || 'current',
        label: branch ? branch.id : 'Current future',
        archived: Boolean(branch),
        checkpointId: branch ? branch.checkpointId : null,
        fromTick: branch ? branch.fromTick : state.tick,
        toTick: branch ? branch.toTick : state.tick,
        tick: state.tick,
        fingerprint: this._futureFingerprint(ref || 'current'),
        worldDigest: this._worldDigestFromState(state),
        receiptCount: branch ? branch.receiptCount : receiptCountFromState(state),
        activeAnomalies: (state.anomalies || []).filter((item) => item.active).length,
        investigating: agents.filter((agent) => agent.investigating && !agent.awakened).length,
        modelBreaks: agents.filter((agent) => agent.awakened).length,
        activePrograms: programs.filter((program) => program.active && !program.quarantined).length,
        quarantinedPrograms: programs.filter((program) => program.quarantined).length,
        institutionNarratives: (state.institutions || []).map((institution) => [institution.id, institution.narrative]),
        metrics: summaryMetrics,
        reason: branch ? (branch.reason || 'rewind-archive') : 'canonical-current',
        forkedToBranchId: branch ? (branch.forkedToBranchId || null) : null
      };
    }

    listFutures() {
      const archived = this.branchArchive.map((branch) => this._futureSummary(branch.id)).filter(Boolean);
      return [this._futureSummary('current')].concat(archived);
    }

    futureTree() {
      const checkpoints = new Map();
      for (const checkpoint of this.checkpoints || []) {
        checkpoints.set(checkpoint.id, { id: checkpoint.id, label: checkpoint.label, tick: checkpoint.tick, receiptId: checkpoint.receiptId });
      }
      for (const branch of this.branchArchive) {
        if (branch.checkpointId && !checkpoints.has(branch.checkpointId)) {
          checkpoints.set(branch.checkpointId, { id: branch.checkpointId, label: branch.checkpointId + ' (archived anchor)', tick: branch.toTick, receiptId: null });
        }
      }
      return {
        current: this._futureSummary('current'),
        checkpoints: Array.from(checkpoints.values()).sort((a, b) => a.tick - b.tick),
        branches: this.branchArchive.map((branch) => this._futureSummary(branch.id)).filter(Boolean)
      };
    }

    _comparableInterventions(state) {
      const ignored = new Set(['rewind', 'future-fork']);
      return (state.interventionLog || []).filter((entry) => !ignored.has(entry.kind));
    }

    compareFutures(refA, refB) {
      const aRef = refA || 'current';
      const bRef = refB || 'current';
      const stateA = this._futureState(aRef);
      const stateB = this._futureState(bRef);
      if (!stateA || !stateB) return null;
      const summaryA = this._futureSummary(aRef);
      const summaryB = this._futureSummary(bRef);
      const logA = this._comparableInterventions(stateA);
      const logB = this._comparableInterventions(stateB);
      let common = 0;
      while (common < logA.length && common < logB.length) {
        const a = logA[common];
        const b = logB[common];
        if (a.tick !== b.tick || a.kind !== b.kind || stableString(a.data || {}) !== stableString(b.data || {})) break;
        common += 1;
      }
      const firstA = logA[common] || null;
      const firstB = logB[common] || null;
      let divergence;
      if (firstA || firstB) {
        divergence = { kind: 'intervention-divergence', commonInterventions: common, a: firstA, b: firstB };
      } else if (summaryA.worldDigest !== summaryB.worldDigest) {
        divergence = { kind: 'state-divergence-with-same-interventions', commonInterventions: common, a: null, b: null };
      } else if (summaryA.fingerprint !== summaryB.fingerprint) {
        divergence = { kind: 'administrative-divergence', commonInterventions: common, a: null, b: null };
      } else {
        divergence = { kind: 'equivalent', commonInterventions: common, a: null, b: null };
      }
      const metricDelta = {};
      for (const key of WORLD_METRIC_KEYS) metricDelta[key] = Number((summaryB.metrics[key] - summaryA.metrics[key]).toFixed(4));
      return { a: summaryA, b: summaryB, divergence, metricDelta };
    }

    _lastReceiptIdFromState(state) {
      const hot = state && state.receipts ? state.receipts : [];
      if (hot.length) return hot[hot.length - 1].id;
      const cold = state && state.coldHistory ? state.coldHistory : [];
      if (!cold.length) return null;
      const chunk = cold[cold.length - 1];
      try {
        const tuples = JSON.parse(chunk.data || '[]');
        return tuples.length ? tuples[tuples.length - 1][0] : null;
      } catch (error) {
        return null;
      }
    }

    forkFromArchivedFuture(branchId) {
      const target = this._futureBranch(branchId);
      if (!target || !target.state) return null;

      const previousTick = this.tick;
      const previousFingerprint = this.stateFingerprint();
      const previousState = this._captureState(true, false);
      const previousWorldDigest = this._worldDigestFromState(previousState);
      const previousReceiptCount = this.totalReceiptCount ? this.totalReceiptCount() : (this.receipts || []).length;
      const priorArchives = deepClone(this.branchArchive);
      const preservedCurrentId = makeId('branch', this.nextBranchId++);
      const reservedNextBranchId = this.nextBranchId;
      const preservedCurrent = {
        id: preservedCurrentId,
        checkpointId: null,
        fromTick: previousTick,
        toTick: previousTick,
        fingerprint: previousFingerprint,
        worldDigest: previousWorldDigest,
        receiptCount: previousReceiptCount,
        metrics: deepClone(this.metrics),
        reason: 'future-fork-preserve-current',
        forkedToBranchId: branchId,
        state: previousState
      };

      const sourceState = deepClone(target.state);
      const sourceStoredFingerprint = target.fingerprint;
      const sourceWorldDigest = this._worldDigestFromState(sourceState);
      const sourceLastReceiptId = this._lastReceiptIdFromState(sourceState);

      this._restoreState(sourceState);
      this.checkpoints = sourceState.checkpoints ? deepClone(sourceState.checkpoints) : [];
      this.branchArchive = priorArchives.concat([preservedCurrent]);
      const maxBranchNumber = this.branchArchive.reduce((max, branch) => Math.max(max, branchNumber(branch.id)), 0);
      this.nextBranchId = Math.max(reservedNextBranchId, this.nextBranchId || 1, maxBranchNumber + 1);
      this.metrics.futureForks = Math.max(Number((sourceState.metrics || {}).futureForks || 0), Number((previousState.metrics || {}).futureForks || 0)) + 1;
      this.metrics.archivedBranches = this.branchArchive.length;

      const restoredBaseFingerprint = this.stateFingerprint();
      const restoredBaseWorldDigest = this._worldDigestFromState(this._captureState(false, false));
      const archiveReceipt = this._receipt('system.current-future-preserved-for-fork', {
        branchId: preservedCurrentId,
        fromTick: previousTick,
        fingerprint: previousFingerprint,
        worldDigest: previousWorldDigest,
        targetBranchId: branchId,
        deletionCount: 0
      });
      const forkReceipt = this._receipt('intervention.future-fork', {
        sourceBranchId: branchId,
        preservedCurrentBranchId: preservedCurrentId,
        sourceStoredFingerprint,
        restoredBaseFingerprint,
        sourceWorldDigest,
        restoredBaseWorldDigest,
        sourceWorldDigestMatch: sourceWorldDigest === restoredBaseWorldDigest,
        previousCurrentFingerprint: previousFingerprint,
        deletionCount: 0
      }, [sourceLastReceiptId, archiveReceipt.id].filter(Boolean));
      this._recordIntervention('future-fork', {
        sourceBranchId: branchId,
        preservedCurrentBranchId: preservedCurrentId,
        sourceWorldDigest,
        restoredBaseWorldDigest
      }, forkReceipt.id);

      return {
        receiptId: forkReceipt.id,
        sourceBranchId: branchId,
        preservedCurrentBranchId: preservedCurrentId,
        previousCurrentFingerprint: previousFingerprint,
        sourceStoredFingerprint,
        restoredBaseFingerprint,
        sourceWorldDigest,
        restoredBaseWorldDigest,
        sourceWorldDigestMatch: sourceWorldDigest === restoredBaseWorldDigest
      };
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.futureExplorer = {
        futures: this.listFutures().map((future) => ({
          id: future.id, archived: future.archived, tick: future.tick,
          fingerprint: future.fingerprint, worldDigest: future.worldDigest,
          checkpointId: future.checkpointId, reason: future.reason
        })),
        futureForks: this.metrics.futureForks || 0
      };
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: base.DEFAULT_CONFIG, hashSeed, mulberry32 };
});
