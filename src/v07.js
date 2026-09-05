(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./sim.js') : root.AnomalyGardenSim;
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
  const V07_DEFAULTS = Object.freeze({ institutionActionEnabled: true, institutionCommitmentTicks: 10, coldHistoryKeepTicks: 192 });
  const EXTRA_METRICS = Object.freeze({ institutionProposals: 0, institutionCommitments: 0, institutionSessions: 0, historyCompactions: 0, coldReceiptsArchived: 0 });

  class GardenSimulation extends BaseGardenSimulation {
    constructor(options) {
      super(options || {});
      this.version = '0.7.0';
      this.config = Object.assign({}, V07_DEFAULTS, this.config, (options && options.config) || {});
      this.coldHistory = this.coldHistory || [];
      this.storageLog = this.storageLog || [];
      this.nextColdChunkId = this.nextColdChunkId || 1;
      this._coldChunkCache = null;
      this.metrics = Object.assign({}, EXTRA_METRICS, this.metrics || {});
      this._rebuildIndexes();
    }

    _createAgents() {
      super._createAgents();
      for (const agent of this.agents) {
        agent.institutionCommitment = null;
        agent.institutionSessions = 0;
      }
    }

    _createInstitutions() {
      super._createInstitutions();
      for (const institution of this.institutions) {
        institution.proposals = 0;
        institution.currentProposal = null;
      }
    }

    _rebuildIndexes() {
      super._rebuildIndexes();
      this._coldChunkCache = null;
      for (const chunk of this.coldHistory || []) {
        const tuples = this._decodeColdChunk(chunk);
        for (const tuple of tuples) {
          const type = tuple[2];
          const payload = tuple[3] || {};
          if (type === 'intervention.anomaly-added' && payload.anomaly) this._anomalyCreationById.set(payload.anomaly.id, tuple[0]);
          if (type === 'intervention.modal-added' && payload.modal) this._modalCreationById.set(payload.modal.id, tuple[0]);
        }
      }
      this._coldChunkCache = null;
    }

    _receiptNumber(receiptId) {
      const match = /^event-(\d+)$/.exec(String(receiptId || ''));
      return match ? Number(match[1]) : null;
    }

    _decodeColdChunk(chunk) {
      if (!chunk) return [];
      if (this._coldChunkCache && this._coldChunkCache.id === chunk.id) return this._coldChunkCache.tuples;
      const tuples = JSON.parse(chunk.data || '[]');
      this._coldChunkCache = { id: chunk.id, tuples };
      return tuples;
    }

    _getReceipt(receiptId) {
      const hot = this._receiptById.get(receiptId);
      if (hot) return hot;
      const number = this._receiptNumber(receiptId);
      if (number == null) return null;
      for (const chunk of this.coldHistory || []) {
        if (number < chunk.startReceiptNumber || number > chunk.endReceiptNumber) continue;
        const tuples = this._decodeColdChunk(chunk);
        const tuple = tuples[number - chunk.startReceiptNumber];
        if (!tuple || tuple[0] !== receiptId) return null;
        return { id: tuple[0], tick: tuple[1], type: tuple[2], payload: deepClone(tuple[3] || {}), parents: (tuple[4] || []).slice() };
      }
      return null;
    }

    totalReceiptCount() {
      return this.receipts.length + (this.coldHistory || []).reduce((sum, chunk) => sum + chunk.count, 0);
    }

    compactHistory(keepRecentTicks) {
      const keep = Math.max(24, Math.floor(Number(keepRecentTicks == null ? this.config.coldHistoryKeepTicks : keepRecentTicks)));
      const cutoff = this.tick - keep;
      if (cutoff <= 0 || this.receipts.length < 2) return null;
      let split = 0;
      while (split < this.receipts.length && this.receipts[split].tick < cutoff) split += 1;
      if (split <= 0) return null;
      const moving = this.receipts.slice(0, split);
      const tuples = moving.map((receipt) => [receipt.id, receipt.tick, receipt.type, receipt.payload, receipt.parents]);
      const data = JSON.stringify(tuples);
      const chunk = {
        id: makeId('cold', this.nextColdChunkId++), encoding: 'json-tuples-v1',
        fromTick: moving[0].tick, toTick: moving[moving.length - 1].tick, count: moving.length,
        startReceiptNumber: this._receiptNumber(moving[0].id), endReceiptNumber: this._receiptNumber(moving[moving.length - 1].id),
        hash: hashSeed(data).toString(16).padStart(8, '0'), data
      };
      const beforeFingerprint = this.stateFingerprint();
      this.coldHistory.push(chunk);
      this.receipts = this.receipts.slice(split);
      this.metrics.historyCompactions += 1;
      this.metrics.coldReceiptsArchived += moving.length;
      this.storageLog.push({ tick: this.tick, type: 'history-compaction', chunkId: chunk.id, moved: moving.length, keepRecentTicks: keep, hash: chunk.hash });
      this._rebuildIndexes();
      const afterFingerprint = this.stateFingerprint();
      if (beforeFingerprint !== afterFingerprint) throw new Error('History compaction changed canonical fingerprint');
      return { id: chunk.id, count: chunk.count, fromTick: chunk.fromTick, toTick: chunk.toTick, hash: chunk.hash, hotReceipts: this.receipts.length, totalReceipts: this.totalReceiptCount() };
    }

    _plannedRoutine(agent) {
      const localTick = this.tick % this.config.dayLength;
      let baseRoutine;
      if (localTick < 10) baseRoutine = { activity: 'rest', target: agent.home };
      else if (localTick < 29) baseRoutine = { activity: 'work', target: this._placeById(agent.workplaceId) || agent.home };
      else if (localTick < 38) baseRoutine = { activity: 'social', target: this._placeById(agent.socialPlaceId) || agent.home };
      else baseRoutine = { activity: 'home', target: agent.home };

      const commitment = agent.institutionCommitment;
      if (commitment && this.tick > commitment.untilTick) {
        this._receipt('inhabitant.institution-commitment-ended', {
          agentId: agent.id, institutionId: commitment.institutionId, proposalId: commitment.proposalId, kind: commitment.kind,
          acceptedAt: commitment.acceptedAt, endedAt: this.tick, sessions: agent.institutionSessions
        }, [commitment.acceptanceReceiptId || commitment.sourceReceiptId].filter(Boolean));
        agent.institutionCommitment = null;
        return baseRoutine;
      }
      if (!commitment) return baseRoutine;
      const institution = this._institutionById.get(commitment.institutionId);
      const place = institution ? this._placeById(institution.placeId) : null;
      if (!institution || !place) return baseRoutine;
      const applies = institution.frame === 'test' ? (baseRoutine.activity === 'social' || baseRoutine.activity === 'home')
        : institution.frame === 'repair' ? baseRoutine.activity === 'work'
          : baseRoutine.activity === 'social';
      return applies ? { activity: 'institution', target: place } : baseRoutine;
    }

    _updateRoutine(agent) {
      const planned = this._plannedRoutine(agent);
      agent.plannedActivity = planned.activity;
      agent.routineTarget = { x: planned.target.x, y: planned.target.y };
      const live = this.anomalies.filter((a) => a.active).sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
      const fragments = Object.values(agent.modalMemory || {}).reduce((sum, value) => sum + value, 0);
      const canInvestigate = agent.investigating && (live.length || fragments > 0);
      agent.currentActivity = canInvestigate ? 'investigate' : planned.activity;
      if (agent.currentActivity === 'rest' || agent.currentActivity === 'home') {
        agent.energy = clamp(agent.energy + 0.026, 0, 1); agent.socialNeed = clamp(agent.socialNeed + 0.004, 0, 1);
      } else if (agent.currentActivity === 'social') {
        agent.energy = clamp(agent.energy - 0.008, 0, 1); agent.socialNeed = clamp(agent.socialNeed - 0.038, 0, 1);
      } else if (agent.currentActivity === 'investigate') {
        agent.energy = clamp(agent.energy - 0.019, 0, 1); agent.socialNeed = clamp(agent.socialNeed + 0.006, 0, 1);
      } else if (agent.currentActivity === 'institution') {
        agent.energy = clamp(agent.energy - 0.011, 0, 1); agent.socialNeed = clamp(agent.socialNeed - 0.012, 0, 1);
      } else {
        agent.energy = clamp(agent.energy - 0.012, 0, 1); agent.socialNeed = clamp(agent.socialNeed + 0.008, 0, 1);
      }
    }

    _institutionProposalKind(institution) {
      if (!institution || institution.narrative === institution.priorNarrative) return null;
      if (institution.frame === 'test') return institution.narrative === 'persistent-inconsistency' ? 'evidence-session' : 'voluntary-review';
      if (institution.frame === 'repair') return institution.narrative === 'systemic-fault-pattern' ? 'maintenance-sprint' : 'inspection-shift';
      return institution.narrative === 'community-pattern' ? 'public-forum' : 'report-circle';
    }

    _issueInstitutionProposal(institution, broadcastReceipt) {
      if (!this.config.institutionActionEnabled) return null;
      const kind = this._institutionProposalKind(institution);
      if (!kind) { institution.currentProposal = null; return null; }
      if (institution.currentProposal && institution.currentProposal.kind === kind && this.tick <= institution.currentProposal.expiresAt) return institution.currentProposal;
      institution.proposals += 1;
      this.metrics.institutionProposals += 1;
      const proposalId = institution.id + '-proposal-' + String(institution.proposals).padStart(3, '0');
      const receipt = this._receipt('institution.proposed-action', {
        institutionId: institution.id, proposalId, kind, narrative: institution.narrative,
        expiresAt: this.tick + this.config.institutionCommitmentTicks
      }, broadcastReceipt ? [broadcastReceipt.id] : []);
      institution.currentProposal = { id: proposalId, kind, issuedAt: this.tick, expiresAt: this.tick + this.config.institutionCommitmentTicks, receiptId: receipt.id, accepted: 0 };
      return institution.currentProposal;
    }

    _offerInstitutionProposal(agent, institution, proposal) {
      if (!proposal || !agent || agent.institutionCommitment) return false;
      let chance = 0.08 + agent.institutionTrust * 0.5 + agent.social * 0.12 + agent.energy * 0.08 - agent.hunger * 0.12;
      if (institution.frame === 'test') chance += agent.curiosity * 0.12;
      if (institution.frame === 'repair') chance += agent.workSkill * 0.08;
      if (institution.frame === 'shared') chance += agent.social * 0.08;
      chance = clamp(chance, 0.04, 0.88);
      if (this.random() >= chance) return false;
      agent.institutionCommitment = {
        proposalId: proposal.id, institutionId: institution.id, kind: proposal.kind, acceptedAt: this.tick,
        untilTick: proposal.expiresAt, sourceReceiptId: proposal.receiptId, lastSessionTick: -999
      };
      proposal.accepted += 1;
      this.metrics.institutionCommitments += 1;
      const acceptanceReceipt = this._receipt('inhabitant.accepted-institution-proposal', {
        agentId: agent.id, institutionId: institution.id, proposalId: proposal.id, kind: proposal.kind,
        trust: round(agent.institutionTrust), acceptanceChance: round(chance), untilTick: proposal.expiresAt
      }, [proposal.receiptId]);
      agent.institutionCommitment.acceptanceReceiptId = acceptanceReceipt.id;
      return true;
    }

    _processInstitutionSession(agent) {
      const commitment = agent.institutionCommitment;
      if (!commitment || agent.currentActivity !== 'institution') return null;
      if (this.tick > commitment.untilTick || this.tick - commitment.lastSessionTick < 4) return null;
      const institution = this._institutionById.get(commitment.institutionId);
      const place = institution ? this._placeById(institution.placeId) : null;
      if (!institution || !place || agent.x !== place.x || agent.y !== place.y) return null;
      commitment.lastSessionTick = this.tick;
      agent.institutionSessions += 1;
      this.metrics.institutionSessions += 1;
      const sourceMemory = agent.memory.slice().reverse().find((memory) => {
        const source = this._getReceipt(memory.receiptId);
        return source && ['inhabitant.observed-anomaly', 'inhabitant.modal-memory-leak', 'inhabitant.ran-test', 'inhabitant.shared-anomaly'].includes(source.type);
      });
      const source = sourceMemory ? this._getReceipt(sourceMemory.receiptId) : null;
      let result = 'no-personal-evidence';
      const before = agent.discrepancy;
      if (source) {
        if (institution.frame === 'test') {
          const supports = source.type !== 'inhabitant.ran-test' || String(source.payload.result || '').startsWith('supports');
          agent.discrepancy = clamp(agent.discrepancy + (supports ? 0.018 : -0.012), 0, 1.5);
          result = supports ? 'review-supported-own-evidence' : 'review-found-own-test-inconclusive';
        } else if (institution.frame === 'repair') {
          agent.confidence = clamp(agent.confidence + 0.006 * agent.institutionTrust, 0, 1);
          result = 'review-framed-as-maintenance';
        } else {
          agent.socialNeed = clamp(agent.socialNeed - 0.03, 0, 1);
          result = 'shared-own-report-in-forum';
        }
      }
      return this._receipt('inhabitant.participated-institution-session', {
        agentId: agent.id, institutionId: institution.id, proposalId: commitment.proposalId, kind: commitment.kind,
        sessionNumber: agent.institutionSessions, result, sourceReceiptId: source ? source.id : null,
        discrepancyBefore: round(before), discrepancyAfter: round(agent.discrepancy)
      }, [commitment.acceptanceReceiptId || commitment.sourceReceiptId, source ? source.id : null].filter(Boolean));
    }

    _processInstitutionReports() {
      const allowed = new Set(['inhabitant.observed-anomaly', 'inhabitant.modal-memory-leak', 'inhabitant.ran-test', 'inhabitant.shared-anomaly']);
      for (const agent of this.agents) {
        if (!agent.memory.length || !agent.institutionId) continue;
        const memory = agent.memory[agent.memory.length - 1];
        if (!memory.receiptId || memory.receiptId === agent.lastInstitutionReportReceipt) continue;
        if (this.tick - agent.lastInstitutionReportTick < this.config.institutionReportCooldown) continue;
        const source = this._getReceipt(memory.receiptId);
        if (!source || !allowed.has(source.type)) continue;
        const institution = this._institutionById.get(agent.institutionId);
        if (!institution) continue;
        let baseWeight = 0.45;
        if (source.type === 'inhabitant.observed-anomaly') baseWeight = 1;
        else if (source.type === 'inhabitant.modal-memory-leak') baseWeight = 0.8;
        else if (source.type === 'inhabitant.ran-test') baseWeight = source.payload.result && source.payload.result.startsWith('supports') ? 1.2 : 0.35;
        const weight = round(baseWeight * (0.5 + agent.skepticism * 0.35 + agent.curiosity * 0.15));
        const reportReceipt = this._receipt('institution.received-report', {
          institutionId: institution.id, sourceAgentId: agent.id, sourceReceiptId: source.id, sourceType: source.type, weight
        }, [source.id]);
        institution.reports.push({ tick: this.tick, agentId: agent.id, sourceReceiptId: source.id, reportReceiptId: reportReceipt.id, sourceType: source.type, weight });
        if (!institution.reporters.includes(agent.id)) institution.reporters.push(agent.id);
        institution.evidenceWeight = round(institution.evidenceWeight + weight);
        agent.lastInstitutionReportReceipt = source.id;
        agent.lastInstitutionReportTick = this.tick;
        this.metrics.institutionReports += 1;
        const nextNarrative = this._institutionNarrativeFor(institution);
        if (nextNarrative !== institution.narrative) {
          const before = institution.narrative;
          institution.narrative = nextNarrative;
          institution.lastNarrativeChangeTick = this.tick;
          this.metrics.narrativeChanges += 1;
          const parents = institution.reports.slice(-5).map((report) => report.reportReceiptId);
          this._receipt('institution.changed-narrative', {
            institutionId: institution.id, before, after: nextNarrative,
            evidenceWeight: institution.evidenceWeight, uniqueReporters: institution.reporters.length
          }, parents);
        }
      }
    }

    _processInstitutionBroadcasts() {
      if (this.tick % this.config.institutionBroadcastPeriod !== 0) return;
      for (const institution of this.institutions) {
        const members = this.agents.filter((agent) => agent.institutionId === institution.id);
        institution.broadcasts += 1;
        this.metrics.institutionBroadcasts += 1;
        const receipt = this._receipt('institution.broadcast', {
          institutionId: institution.id, narrative: institution.narrative,
          memberCount: members.length, broadcastNumber: institution.broadcasts
        });
        const proposal = this._issueInstitutionProposal(institution, receipt);
        for (const agent of members) {
          this._offerInstitutionProposal(agent, institution, proposal);
          const trust = agent.institutionTrust || 0.5;
          agent.institutionMessage = institution.name + ': ' + institution.narrative;
          if (institution.frame === 'test' && institution.narrative !== institution.priorNarrative) {
            agent.discrepancy = clamp(agent.discrepancy + 0.012 * trust, 0, 1.5);
          } else if (institution.frame === 'repair') {
            if (institution.narrative === 'systemic-fault-pattern') agent.discrepancy = clamp(agent.discrepancy + 0.004 * trust, 0, 1.5);
            else { agent.discrepancy = clamp(agent.discrepancy - 0.006 * trust, 0, 1.5); agent.confidence = clamp(agent.confidence + 0.008 * trust, 0, 1); }
          } else if (institution.frame === 'shared' && institution.narrative !== institution.priorNarrative) {
            agent.discrepancy = clamp(agent.discrepancy + 0.006 * trust, 0, 1.5);
          }
          if (agent.memory.length && agent.investigating) {
            const last = agent.memory[agent.memory.length - 1];
            if (last.receiptId) receipt.parents.push(last.receiptId);
          }
        }
        receipt.parents = Array.from(new Set(receipt.parents)).slice(-8);
      }
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
      return this.snapshot();
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.config = deepClone(this.config);
      state.agents = deepClone(this.agents);
      state.institutions = deepClone(this.institutions);
      state.receipts = deepClone(this.receipts);
      state.coldHistory = deepClone(this.coldHistory || []);
      state.storageLog = deepClone(this.storageLog || []);
      state.metrics = deepClone(this.metrics);
      state.counters = Object.assign({}, state.counters, { nextColdChunkId: this.nextColdChunkId });
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      const s = deepClone(state);
      this.version = s.version || '0.7.0';
      this.config = Object.assign({}, V07_DEFAULTS, this.config, s.config || {});
      this.coldHistory = s.coldHistory || [];
      this.storageLog = s.storageLog || [];
      this.metrics = Object.assign({}, EXTRA_METRICS, this.metrics || {}, s.metrics || {});
      this.nextColdChunkId = s.counters && s.counters.nextColdChunkId ? s.counters.nextColdChunkId : this.coldHistory.length + 1;
      for (const agent of this.agents) {
        if (agent.institutionCommitment === undefined) agent.institutionCommitment = null;
        if (agent.institutionSessions === undefined) agent.institutionSessions = 0;
      }
      for (const institution of this.institutions) {
        if (institution.proposals === undefined) institution.proposals = 0;
        if (institution.currentProposal === undefined) institution.currentProposal = null;
      }
      this._rebuildIndexes();
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
      const material = {
        tick: this.tick, seed: this.seed, rng: this.random.getState(), repairPolicy: this.repairPolicy,
        agents: this.agents.map((a) => [a.id, a.x, a.y, round(a.energy), round(a.socialNeed), round(a.hunger), round(a.credits, 2), a.inventory.food, a.ownedArtifacts.length, a.project.kind, round(a.project.progress), a.project.completions, a.currentActivity, a.plannedActivity, round(a.discrepancy), round(a.confidence), a.hypothesis, a.investigating, a.awakened, a.memory.length, a.testsRun, a.routineDeviations, a.institutionId, round(a.institutionTrust), a.lastInstitutionReportReceipt, a.lastInstitutionReportTick, a.institutionMessage, a.institutionCommitment ? [a.institutionCommitment.proposalId, a.institutionCommitment.kind, a.institutionCommitment.untilTick, a.institutionCommitment.lastSessionTick, a.institutionCommitment.acceptanceReceiptId] : null, a.institutionSessions]),
        institutions: this.institutions.map((i) => [i.id, i.narrative, round(i.evidenceWeight), i.reporters.length, i.reports.length, i.broadcasts, i.proposals, i.currentProposal ? [i.currentProposal.id, i.currentProposal.kind, i.currentProposal.expiresAt, i.currentProposal.accepted] : null]),
        places: this.places.map((p) => [p.id, p.x, p.y, p.type, p.resource, round(p.stock, 4), round(p.produced, 4), round(p.consumed, 4)]),
        anomalies: this.anomalies.map((a) => [a.id, a.kind, a.x, a.y, round(a.intensity), a.ttl, a.active]),
        modals: this.modalZones.map((z) => [z.id, z.iteration, z.active]),
        relationships: this.relationships.map((r) => [r.id, round(r.trust), round(r.familiarity), r.signals, r.meetings]),
        repairNodes: this.repairNodes.map((n) => [n.id, n.x, n.y, n.actions]),
        archivedBranches: this.branchArchive.map((b) => [b.id, b.fromTick, b.toTick, b.fingerprint]), receipts: this.totalReceiptCount()
      };
      return hashSeed(JSON.stringify(material)).toString(16).padStart(8, '0');
    }

    snapshot() {
      return {
        seed: this.seedText, seedHash: this.seed, tick: this.tick, config: deepClone(this.config),
        agents: deepClone(this.agents), anomalies: deepClone(this.anomalies), modalZones: deepClone(this.modalZones),
        relationships: deepClone(this.relationships), institutions: deepClone(this.institutions), places: deepClone(this.places),
        repairNodes: deepClone(this.repairNodes), repairPolicy: this.repairPolicy, receipts: deepClone(this.receipts),
        coldHistory: (this.coldHistory || []).map((chunk) => ({ id: chunk.id, fromTick: chunk.fromTick, toTick: chunk.toTick, count: chunk.count, hash: chunk.hash })),
        totalReceipts: this.totalReceiptCount(), storageLog: deepClone(this.storageLog || []), metrics: deepClone(this.metrics),
        interventions: this.interventions.slice(), interventionLog: deepClone(this.interventionLog),
        checkpoints: this.checkpoints.map((cp) => ({ id: cp.id, label: cp.label, tick: cp.tick, receiptId: cp.receiptId })),
        branchArchive: this.branchArchive.map((b) => ({ id: b.id, checkpointId: b.checkpointId, fromTick: b.fromTick, toTick: b.toTick, fingerprint: b.fingerprint, receiptCount: b.receiptCount })),
        fingerprint: this.stateFingerprint()
      };
    }

    causalAncestors(receiptId) {
      const visited = new Set();
      const ordered = [];
      const visit = (id) => {
        if (!id || visited.has(id)) return;
        visited.add(id);
        const receipt = this._getReceipt(id);
        if (!receipt) return;
        for (const parent of receipt.parents) visit(parent);
        ordered.push(receipt);
      };
      visit(receiptId);
      return ordered;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, V07_DEFAULTS), hashSeed, mulberry32 };
});