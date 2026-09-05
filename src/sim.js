(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function hashSeed(input) {
    const text = String(input == null ? 'anomaly-garden' : input);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    random.getState = function () { return a >>> 0; };
    random.setState = function (value) { a = Number(value) >>> 0; };
    return random;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const FIRST_NAMES = ['Ada', 'Miro', 'June', 'Sol', 'Iris', 'Niko', 'Tess', 'Rune', 'Pax', 'Lio', 'Mara', 'Noa', 'Orin', 'Vera', 'Kian', 'Eli'];
  const ROLES = ['maker', 'maintainer', 'analyst', 'clerk', 'courier', 'gardener'];

  const DEFAULT_CONFIG = Object.freeze({
    width: 12,
    height: 8,
    population: 16,
    baseNoise: 0.035,
    socialRadius: 2.4,
    socialInfluence: 0.075,
    evidenceDecay: 0.012,
    confidenceRecovery: 0.008,
    memoryLimit: 18,
    relationshipExtraChance: 0.22,
    repairNodeCount: 2,
    repairRadius: 1.6,
    repairStep: 0.18,
    repairCooldown: 3,
    testCooldown: 6,
    dayLength: 48,
    projectWorkStep: 0.032,
    hungerRate: 0.012,
    resourcePrice: 1,
    institutionBroadcastPeriod: 12,
    institutionReportCooldown: 6
  });

  function makeId(prefix, n) {
    return prefix + '-' + String(n).padStart(3, '0');
  }

  class GardenSimulation {
    constructor(options) {
      const opts = options || {};
      this.version = '0.6.1';
      this.config = Object.assign({}, DEFAULT_CONFIG, opts.config || {});
      this.seedText = String(opts.seed || 'rabbit-001');
      this.seed = hashSeed(this.seedText);
      this.random = mulberry32(this.seed);
      this._receiptById = new Map();
      this._anomalyCreationById = new Map();
      this._modalCreationById = new Map();
      this._agentById = new Map();
      this._institutionById = new Map();
      this._placeByIdMap = new Map();
      this.tick = 0;
      this.receipts = [];
      this.interventions = [];
      this.interventionLog = [];
      this.anomalies = [];
      this.modalZones = [];
      this.relationships = [];
      this.institutions = [];
      this.places = [];
      this.repairNodes = [];
      this.checkpoints = [];
      this.branchArchive = [];
      this.repairPolicy = opts.repairPolicy || 'tolerant';
      this.nextReceiptId = 1;
      this.nextAnomalyId = 1;
      this.nextModalId = 1;
      this.nextCheckpointId = 1;
      this.nextBranchId = 1;
      this.agents = [];
      this.metrics = {
        observations: 0,
        investigations: 0,
        socialSignals: 0,
        thresholdCrossings: 0,
        awakenings: 0,
        repairActions: 0,
        modalResets: 0,
        memoryLeaks: 0,
        rewinds: 0,
        testsRun: 0,
        archivedBranches: 0,
        production: 0,
        socialMeetings: 0,
        projectsCompleted: 0,
        resourcesAcquired: 0,
        resourcesUsed: 0,
        institutionReports: 0,
        narrativeChanges: 0,
        institutionBroadcasts: 0
      };
      this._createPlaces();
      this._createAgents();
      this._createInstitutions();
      this._createRelationships();
      this._createRepairNodes();
      this._rebuildIndexes();
      this._receipt('world.initialized', {
        seed: this.seedText,
        seedHash: this.seed,
        population: this.agents.length,
        dimensions: [this.config.width, this.config.height],
        relationshipEdges: this.relationships.length,
        repairNodes: this.repairNodes.length,
        places: this.places.length,
        institutions: this.institutions.length
      });
    }

    _rebuildIndexes() {
      this._agentById = new Map(this.agents.map((agent) => [agent.id, agent]));
      this._institutionById = new Map(this.institutions.map((institution) => [institution.id, institution]));
      this._placeByIdMap = new Map(this.places.map((place) => [place.id, place]));
      this._receiptById = new Map(this.receipts.map((receipt) => [receipt.id, receipt]));
      this._anomalyCreationById = new Map();
      this._modalCreationById = new Map();
      for (const receipt of this.receipts) {
        if (receipt.type === 'intervention.anomaly-added' && receipt.payload.anomaly) this._anomalyCreationById.set(receipt.payload.anomaly.id, receipt.id);
        if (receipt.type === 'intervention.modal-added' && receipt.payload.modal) this._modalCreationById.set(receipt.payload.modal.id, receipt.id);
      }
    }

    _createPlaces() {
      const specs = [
        ['workshop', 'work', 'Workshop', 3, 2, 'material', 2],
        ['observatory', 'work', 'Observatory', 8, 1, 'insight', 1],
        ['market', 'work-social', 'Market', 9, 4, 'food', 6],
        ['repair-depot', 'work', 'Repair Depot', 2, 6, 'parts', 2],
        ['station', 'work-social', 'Station', 6, 6, 'service', 1],
        ['cafe', 'social', 'Cafe', 5, 4, 'food', 5],
        ['park', 'social', 'Park', 10, 7, 'food', 1]
      ];
      this.places = specs.map((spec, index) => ({
        id: 'place-' + spec[0],
        type: spec[1],
        name: spec[2],
        x: clamp(spec[3], 0, this.config.width - 1),
        y: clamp(spec[4], 0, this.config.height - 1),
        resource: spec[5],
        stock: Number(spec[6] || 0),
        produced: 0,
        consumed: 0,
        index
      }));
    }

    _createAgents() {
      const workByRole = {
        maker: 'place-workshop',
        maintainer: 'place-repair-depot',
        analyst: 'place-observatory',
        clerk: 'place-market',
        courier: 'place-station',
        gardener: 'place-park'
      };
      const socialPlaces = ['place-cafe', 'place-park', 'place-market', 'place-station'];
      const institutionByRole = {
        maker: 'institution-inquiry',
        analyst: 'institution-inquiry',
        maintainer: 'institution-maintenance',
        courier: 'institution-maintenance',
        clerk: 'institution-commons',
        gardener: 'institution-commons'
      };
      const projectByRole = {
        maker: 'build-device',
        maintainer: 'restore-system',
        analyst: 'map-patterns',
        clerk: 'community-ledger',
        courier: 'route-atlas',
        gardener: 'seed-archive'
      };
      for (let i = 0; i < this.config.population; i += 1) {
        const x = Math.floor(this.random() * this.config.width);
        const y = Math.floor(this.random() * this.config.height);
        const role = ROLES[Math.floor(this.random() * ROLES.length)];
        this.agents.push({
          id: makeId('inhabitant', i + 1),
          name: FIRST_NAMES[i % FIRST_NAMES.length],
          x,
          y,
          home: { x, y },
          role,
          workplaceId: workByRole[role],
          socialPlaceId: socialPlaces[Math.floor(this.random() * socialPlaces.length)],
          currentActivity: 'home',
          plannedActivity: 'home',
          routineTarget: { x, y },
          routineDeviations: 0,
          lastDeviationReceipt: null,
          energy: round(0.72 + this.random() * 0.24),
          socialNeed: round(0.18 + this.random() * 0.44),
          hunger: round(0.16 + this.random() * 0.3),
          credits: round(2 + this.random() * 4, 2),
          inventory: { food: 1, material: 0, parts: 0, insight: 0, service: 0 },
          ownedArtifacts: [],
          workSkill: round(0.28 + this.random() * 0.66),
          project: { kind: projectByRole[role], progress: 0, completions: 0 },
          lastPurchaseTick: -999,
          curiosity: round(0.18 + this.random() * 0.78),
          skepticism: round(0.18 + this.random() * 0.68),
          social: round(0.2 + this.random() * 0.7),
          testSkill: round(0.2 + this.random() * 0.72),
          threshold: round(0.48 + this.random() * 0.38),
          confidence: round(0.88 + this.random() * 0.1),
          discrepancy: 0,
          hypothesis: 'world-is-consistent',
          investigating: false,
          awakened: false,
          memory: [],
          modalMemory: {},
          testsRun: 0,
          lastTestTick: -999,
          lastObservation: 'ordinary day'
        });
        const agent = this.agents[this.agents.length - 1];
        agent.institutionId = institutionByRole[role];
        agent.institutionTrust = round(clamp(0.38 + agent.social * 0.25 + (1 - agent.skepticism) * 0.22, 0.2, 0.95));
        agent.lastInstitutionReportReceipt = null;
        agent.lastInstitutionReportTick = -999;
        agent.institutionMessage = 'no institutional message yet';
      }
    }

    _createInstitutions() {
      const specs = [
        { id: 'institution-inquiry', name: 'Inquiry Circle', placeId: 'place-observatory', prior: 'insufficient-evidence', frame: 'test', warn: 2.2, strong: 4.2 },
        { id: 'institution-maintenance', name: 'Maintenance Guild', placeId: 'place-repair-depot', prior: 'local-faults-expected', frame: 'repair', warn: 3.8, strong: 7.5 },
        { id: 'institution-commons', name: 'Commons Assembly', placeId: 'place-cafe', prior: 'ordinary-world', frame: 'shared', warn: 2.8, strong: 5.2 }
      ];
      this.institutions = specs.map((spec) => ({
        id: spec.id,
        name: spec.name,
        placeId: spec.placeId,
        frame: spec.frame,
        priorNarrative: spec.prior,
        narrative: spec.prior,
        warnThreshold: spec.warn,
        strongThreshold: spec.strong,
        evidenceWeight: 0,
        reports: [],
        reporters: [],
        lastNarrativeChangeTick: 0,
        broadcasts: 0
      }));
    }

    _createRelationships() {
      const hasEdge = new Set();
      const add = (a, b, forced) => {
        if (a === b) return;
        const ids = [a, b].sort();
        const key = ids.join('|');
        if (hasEdge.has(key)) return;
        hasEdge.add(key);
        this.relationships.push({
          id: makeId('relation', this.relationships.length + 1),
          a: ids[0],
          b: ids[1],
          trust: round(forced ? 0.42 + this.random() * 0.2 : 0.22 + this.random() * 0.58),
          familiarity: round(0.25 + this.random() * 0.65),
          signals: 0,
          meetings: 0,
          lastMeetingTick: -999
        });
      };
      for (let i = 0; i < this.agents.length; i += 1) {
        add(this.agents[i].id, this.agents[(i + 1) % this.agents.length].id, true);
      }
      for (let i = 0; i < this.agents.length; i += 1) {
        for (let j = i + 2; j < this.agents.length; j += 1) {
          if (this.random() < this.config.relationshipExtraChance) add(this.agents[i].id, this.agents[j].id, false);
        }
      }
    }

    _createRepairNodes() {
      for (let i = 0; i < this.config.repairNodeCount; i += 1) {
        this.repairNodes.push({
          id: makeId('repair', i + 1),
          x: Math.floor(this.random() * this.config.width),
          y: Math.floor(this.random() * this.config.height),
          lastActionTick: -999,
          actions: 0
        });
      }
    }

    _receipt(type, payload, parents) {
      const receipt = {
        id: makeId('event', this.nextReceiptId++),
        tick: this.tick,
        type,
        payload: payload || {},
        parents: Array.isArray(parents) ? parents.filter(Boolean) : []
      };
      this.receipts.push(receipt);
      if (this._receiptById) this._receiptById.set(receipt.id, receipt);
      return receipt;
    }

    _recordIntervention(kind, data, receiptId) {
      const entry = { sequence: this.interventionLog.length + 1, tick: this.tick, kind, data: deepClone(data || {}), receiptId };
      this.interventionLog.push(entry);
      if (receiptId) this.interventions.push(receiptId);
      return entry;
    }

    addAnomaly(kind, options) {
      const opts = options || {};
      const anomaly = {
        id: makeId('anomaly', this.nextAnomalyId++),
        kind: kind || 'gravity-slip',
        x: Number.isInteger(opts.x) ? clamp(opts.x, 0, this.config.width - 1) : Math.floor(this.random() * this.config.width),
        y: Number.isInteger(opts.y) ? clamp(opts.y, 0, this.config.height - 1) : Math.floor(this.random() * this.config.height),
        radius: clamp(Number(opts.radius || 1.8), 0.5, 6),
        intensity: clamp(Number(opts.intensity || 0.72), 0.05, 1),
        ttl: Math.max(1, Math.floor(Number(opts.ttl || 18))),
        createdAt: this.tick,
        active: true
      };
      this.anomalies.push(anomaly);
      const receipt = this._receipt('intervention.anomaly-added', { anomaly: deepClone(anomaly) });
      this._anomalyCreationById.set(anomaly.id, receipt.id);
      this._recordIntervention('anomaly', deepClone(anomaly), receipt.id);
      return anomaly;
    }

    addModal(options) {
      const opts = options || {};
      const zone = {
        id: makeId('modal', this.nextModalId++),
        x: Number.isInteger(opts.x) ? clamp(opts.x, 0, this.config.width - 1) : Math.floor(this.random() * this.config.width),
        y: Number.isInteger(opts.y) ? clamp(opts.y, 0, this.config.height - 1) : Math.floor(this.random() * this.config.height),
        radius: clamp(Number(opts.radius || 2.6), 1, 6),
        period: Math.max(4, Math.floor(Number(opts.period || 12))),
        memoryLeak: clamp(Number(opts.memoryLeak == null ? 0.28 : opts.memoryLeak), 0, 1),
        createdAt: this.tick,
        iteration: 0,
        active: true,
        anchors: []
      };
      for (const agent of this.agents) {
        if (this._distance(agent, zone) <= zone.radius) {
          zone.anchors.push({ agentId: agent.id, x: agent.x, y: agent.y });
        }
      }
      this.modalZones.push(zone);
      const receipt = this._receipt('intervention.modal-added', {
        modal: deepClone(Object.assign({}, zone, { anchors: zone.anchors.slice() }))
      });
      this._modalCreationById.set(zone.id, receipt.id);
      this._recordIntervention('modal', deepClone(zone), receipt.id);
      return zone;
    }

    setRepairPolicy(policy) {
      const allowed = ['off', 'tolerant', 'aggressive'];
      const next = allowed.includes(policy) ? policy : 'tolerant';
      if (next === this.repairPolicy) return this.repairPolicy;
      const before = this.repairPolicy;
      this.repairPolicy = next;
      const receipt = this._receipt('intervention.repair-policy', { before, after: next });
      this._recordIntervention('repair-policy', { policy: next }, receipt.id);
      return this.repairPolicy;
    }

    whisper(agentId) {
      const agent = this.agents.find((item) => item.id === agentId) || this.agents[Math.floor(this.random() * this.agents.length)];
      if (!agent) return null;
      const before = agent.discrepancy;
      agent.discrepancy = clamp(agent.discrepancy + 0.13 + agent.curiosity * 0.08, 0, 1.5);
      agent.confidence = clamp(agent.confidence - 0.07, 0, 1);
      agent.lastObservation = 'a stranger asked whether the pattern repeats';
      const receipt = this._receipt('intervention.whisper', {
        agentId: agent.id,
        before: round(before),
        after: round(agent.discrepancy)
      });
      this._recordIntervention('whisper', { agentId: agent.id }, receipt.id);
      this._remember(agent, receipt.id, 'A question did not fit the routine.');
      return agent;
    }

    createCheckpoint(label) {
      const id = makeId('checkpoint', this.nextCheckpointId++);
      const receipt = this._receipt('system.checkpoint-created', { checkpointId: id, label: String(label || id) });
      const checkpoint = {
        id,
        label: String(label || 'Checkpoint ' + id),
        tick: this.tick,
        receiptId: receipt.id,
        state: this._captureState(false, false)
      };
      this.checkpoints.push(checkpoint);
      return { id: checkpoint.id, label: checkpoint.label, tick: checkpoint.tick, receiptId: checkpoint.receiptId };
    }

    rewindToCheckpoint(checkpointId) {
      const checkpoint = this.checkpoints.find((item) => item.id === checkpointId);
      if (!checkpoint) return null;
      const fromTick = this.tick;
      const abandonedFingerprint = this.stateFingerprint();
      const abandonedState = this._captureState(false, false);
      const priorArchives = deepClone(this.branchArchive);
      const branchId = makeId('branch', this.nextBranchId++);
      const abandonedBranch = {
        id: branchId,
        checkpointId: checkpoint.id,
        fromTick,
        toTick: checkpoint.tick,
        fingerprint: abandonedFingerprint,
        receiptCount: this.receipts.length,
        metrics: deepClone(this.metrics),
        state: abandonedState
      };
      const preservedCheckpoints = this.checkpoints.filter((item) => item.tick <= checkpoint.tick).map((item) => deepClone(item));
      this._restoreState(checkpoint.state);
      this.checkpoints = preservedCheckpoints;
      this.branchArchive = priorArchives.concat([abandonedBranch]);
      this.nextBranchId = Math.max(this.nextBranchId, this.branchArchive.length + 1);
      this.metrics.rewinds += 1;
      this.metrics.archivedBranches = this.branchArchive.length;
      const archiveReceipt = this._receipt('system.branch-archived', {
        branchId,
        checkpointId: checkpoint.id,
        abandonedFromTick: fromTick,
        restoredToTick: this.tick,
        abandonedFingerprint,
        abandonedReceiptCount: abandonedBranch.receiptCount
      }, [checkpoint.receiptId]);
      const receipt = this._receipt('intervention.rewind', {
        checkpointId: checkpoint.id,
        branchId,
        fromTick,
        toTick: this.tick
      }, [archiveReceipt.id]);
      this._recordIntervention('rewind', { checkpointId: checkpoint.id, branchId, fromTick, toTick: this.tick }, receipt.id);
      return receipt;
    }

    _remember(agent, receiptId, summary) {
      agent.memory.push({ tick: this.tick, receiptId, summary });
      if (agent.memory.length > this.config.memoryLimit) agent.memory.shift();
    }

    _distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    _moveToward(entity, target) {
      let dx = Math.sign(target.x - entity.x);
      let dy = Math.sign(target.y - entity.y);
      if (dx !== 0 && dy !== 0) {
        if (this.random() < 0.5) dy = 0;
        else dx = 0;
      }
      entity.x = clamp(entity.x + dx, 0, this.config.width - 1);
      entity.y = clamp(entity.y + dy, 0, this.config.height - 1);
    }

    _placeById(id) {
      return this._placeByIdMap.get(id) || null;
    }

    _plannedRoutine(agent) {
      const localTick = this.tick % this.config.dayLength;
      if (localTick < 10) return { activity: 'rest', target: agent.home };
      if (localTick < 29) return { activity: 'work', target: this._placeById(agent.workplaceId) || agent.home };
      if (localTick < 38) return { activity: 'social', target: this._placeById(agent.socialPlaceId) || agent.home };
      return { activity: 'home', target: agent.home };
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
        agent.energy = clamp(agent.energy + 0.026, 0, 1);
        agent.socialNeed = clamp(agent.socialNeed + 0.004, 0, 1);
      } else if (agent.currentActivity === 'social') {
        agent.energy = clamp(agent.energy - 0.008, 0, 1);
        agent.socialNeed = clamp(agent.socialNeed - 0.038, 0, 1);
      } else if (agent.currentActivity === 'investigate') {
        agent.energy = clamp(agent.energy - 0.019, 0, 1);
        agent.socialNeed = clamp(agent.socialNeed + 0.006, 0, 1);
      } else {
        agent.energy = clamp(agent.energy - 0.012, 0, 1);
        agent.socialNeed = clamp(agent.socialNeed + 0.008, 0, 1);
      }
    }

    _processWorkAndOwnership(agent) {
      agent.hunger = clamp(agent.hunger + this.config.hungerRate + (agent.currentActivity === 'work' ? 0.004 : 0), 0, 1);

      const location = this.places.find((place) => place.x === agent.x && place.y === agent.y) || null;
      const workplace = this._placeById(agent.workplaceId);
      if (agent.currentActivity === 'work' && workplace && agent.x === workplace.x && agent.y === workplace.y) {
        const amount = round(0.03 + agent.workSkill * 0.045, 4);
        workplace.stock = round(workplace.stock + amount, 4);
        workplace.produced = round(workplace.produced + amount, 4);
        agent.credits = round(agent.credits + amount * 0.28, 2);
        this.metrics.production = round(this.metrics.production + amount, 4);
        agent.project.progress = round(agent.project.progress + this.config.projectWorkStep * (0.65 + agent.workSkill * 0.55), 4);
        if (agent.project.progress >= 1) {
          agent.project.progress = round(agent.project.progress - 1, 4);
          agent.project.completions += 1;
          const artifact = {
            id: agent.id + '-artifact-' + String(agent.project.completions).padStart(3, '0'),
            kind: agent.project.kind,
            completedAt: this.tick
          };
          agent.ownedArtifacts.push(artifact);
          this.metrics.projectsCompleted += 1;
          const parent = agent.memory.length ? agent.memory[agent.memory.length - 1].receiptId : null;
          const receipt = this._receipt('inhabitant.completed-project', {
            agentId: agent.id,
            role: agent.role,
            projectKind: agent.project.kind,
            artifactId: artifact.id,
            completionNumber: agent.project.completions
          }, parent ? [parent] : []);
          this._remember(agent, receipt.id, 'I finished a long-running personal project.');
        }
      }

      if (location && location.resource === 'food' && agent.hunger >= 0.42 && location.stock >= 1 && agent.credits >= this.config.resourcePrice && this.tick - agent.lastPurchaseTick >= 4) {
        location.stock = round(location.stock - 1, 4);
        location.consumed = round(location.consumed + 1, 4);
        agent.credits = round(agent.credits - this.config.resourcePrice, 2);
        agent.inventory.food += 1;
        agent.lastPurchaseTick = this.tick;
        this.metrics.resourcesAcquired += 1;
        this._receipt('inhabitant.acquired-resource', {
          agentId: agent.id,
          placeId: location.id,
          resource: 'food',
          quantity: 1,
          creditsAfter: agent.credits
        });
      }

      if (agent.hunger >= 0.58 && agent.inventory.food > 0) {
        agent.inventory.food -= 1;
        const before = agent.hunger;
        agent.hunger = clamp(agent.hunger - 0.48, 0, 1);
        this.metrics.resourcesUsed += 1;
        this._receipt('inhabitant.used-resource', {
          agentId: agent.id,
          resource: 'food',
          hungerBefore: round(before),
          hungerAfter: round(agent.hunger),
          foodRemaining: agent.inventory.food
        });
      }
    }

    _processSocialMeetings() {
      for (const relation of this.relationships) {
        const a = this._agentById.get(relation.a);
        const b = this._agentById.get(relation.b);
        if (!a || !b) continue;
        const together = a.currentActivity === 'social' && b.currentActivity === 'social' && a.x === b.x && a.y === b.y;
        if (!together) continue;
        if (relation.lastMeetingTick === this.tick - 1) {
          relation.lastMeetingTick = this.tick;
          continue;
        }
        relation.lastMeetingTick = this.tick;
        relation.meetings += 1;
        relation.familiarity = clamp(relation.familiarity + 0.025, 0, 1);
        relation.trust = clamp(relation.trust + 0.006, 0, 1);
        a.socialNeed = clamp(a.socialNeed - 0.08, 0, 1);
        b.socialNeed = clamp(b.socialNeed - 0.08, 0, 1);
        this.metrics.socialMeetings += 1;
        this._receipt('inhabitant.social-meeting', {
          relationId: relation.id,
          a: a.id,
          b: b.id,
          meetingNumber: relation.meetings,
          location: { x: a.x, y: a.y },
          trust: round(relation.trust),
          familiarity: round(relation.familiarity)
        });
      }
    }

    _move(agent) {
      const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      if (agent.currentActivity === 'investigate') {
        const live = this.anomalies.filter((a) => a.active).sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
        if (live.length) {
          this._moveToward(agent, live[0]);
          return;
        }
        const rememberedModal = this.modalZones
          .filter((z) => z.active && (agent.modalMemory[z.id] || 0) > 0)
          .sort((a, b) => this._distance(agent, a) - this._distance(agent, b))[0];
        if (rememberedModal) {
          this._moveToward(agent, rememberedModal);
          return;
        }
      }
      const target = agent.routineTarget || agent.home;
      if (this._distance(agent, target) > 0.1) {
        this._moveToward(agent, target);
      } else if (this.random() < 0.18) {
        const choice = directions[Math.floor(this.random() * directions.length)];
        agent.x = clamp(agent.x + choice[0], 0, this.config.width - 1);
        agent.y = clamp(agent.y + choice[1], 0, this.config.height - 1);
      }
    }

    _observe(agent) {
      const nearby = this.anomalies
        .filter((anomaly) => anomaly.active && this._distance(agent, anomaly) <= anomaly.radius)
        .sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
      if (!nearby.length) {
        agent.discrepancy = clamp(agent.discrepancy - this.config.evidenceDecay * (1.1 - agent.curiosity * 0.45), 0, 1.5);
        agent.confidence = clamp(agent.confidence + this.config.confidenceRecovery, 0, 1);
        agent.lastObservation = agent.investigating ? 'nothing unusual here yet' : 'ordinary day';
        return null;
      }
      const anomaly = nearby[0];
      const distance = this._distance(agent, anomaly);
      const proximity = 1 - clamp(distance / anomaly.radius, 0, 1);
      const signal = anomaly.intensity * (0.35 + proximity * 0.65);
      const noticed = this.random() < clamp(signal * (0.45 + agent.curiosity * 0.75) + this.config.baseNoise, 0, 0.98);
      if (!noticed) {
        agent.lastObservation = 'something felt slightly off';
        return null;
      }
      this.metrics.observations += 1;
      const evidence = signal * (0.55 + agent.skepticism * 0.45);
      const before = agent.discrepancy;
      agent.discrepancy = clamp(agent.discrepancy + evidence * 0.22, 0, 1.5);
      agent.confidence = clamp(agent.confidence - evidence * 0.13, 0, 1);
      agent.lastObservation = this._describeAnomaly(anomaly.kind);
      const receipt = this._receipt('inhabitant.observed-anomaly', {
        agentId: agent.id,
        anomalyId: anomaly.id,
        kind: anomaly.kind,
        evidence: round(evidence),
        discrepancyBefore: round(before),
        discrepancyAfter: round(agent.discrepancy)
      }, [this._findCreationReceipt(anomaly.id)]);
      this._remember(agent, receipt.id, agent.lastObservation);
      return receipt;
    }

    _findCreationReceipt(anomalyId) {
      return this._anomalyCreationById.get(anomalyId) || null;
    }

    _describeAnomaly(kind) {
      const descriptions = {
        'gravity-slip': 'an object fell wrong, then corrected itself',
        'loop-echo': 'the same tiny event repeated too precisely',
        'time-pocket': 'the street moved out of rhythm for a moment',
        'memory-scar': 'a familiar place felt remembered twice',
        'silent-zone': 'a patch of the world lost expected ambient behavior'
      };
      return descriptions[kind] || 'the local rules contradicted expectation';
    }

    _updateBelief(agent) {
      const score = agent.discrepancy * (0.65 + agent.curiosity * 0.55);
      if (score >= agent.threshold && !agent.investigating) {
        agent.investigating = true;
        agent.hypothesis = 'something-is-inconsistent';
        this.metrics.thresholdCrossings += 1;
        this.metrics.investigations += 1;
        agent.routineDeviations += 1;
        const parent = agent.memory.length ? agent.memory[agent.memory.length - 1].receiptId : null;
        const receipt = this._receipt('inhabitant.started-investigation', {
          agentId: agent.id,
          score: round(score),
          threshold: agent.threshold,
          plannedActivity: agent.plannedActivity,
          routineDeviations: agent.routineDeviations
        }, parent ? [parent] : []);
        agent.lastDeviationReceipt = receipt.id;
        this._remember(agent, receipt.id, 'I should test whether this is a pattern.');
      }
      if (agent.investigating && !agent.awakened && agent.discrepancy >= 0.95 && agent.memory.length >= 3) {
        agent.awakened = true;
        agent.hypothesis = 'world-model-is-incomplete';
        this.metrics.awakenings += 1;
        const parents = agent.memory.slice(-3).map((m) => m.receiptId);
        const receipt = this._receipt('inhabitant.model-break', {
          agentId: agent.id,
          discrepancy: round(agent.discrepancy),
          memoryCount: agent.memory.length
        }, parents);
        this._remember(agent, receipt.id, 'My current model cannot explain these observations.');
      }
    }

    _relationFor(aId, bId) {
      return this.relationships.find((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)) || null;
    }

    _socialExchange() {
      for (const relation of this.relationships) {
        const a = this._agentById.get(relation.a);
        const b = this._agentById.get(relation.b);
        if (!a || !b || this._distance(a, b) > this.config.socialRadius) continue;
        const candidates = [[a, b], [b, a]];
        for (const pair of candidates) {
          const source = pair[0];
          const target = pair[1];
          if (!source.investigating && !source.awakened) continue;
          const chance = source.social * target.curiosity * relation.trust * 0.34;
          if (this.random() >= chance) continue;
          const influence = this.config.socialInfluence * (0.55 + source.discrepancy * 0.45) * (0.7 + relation.trust * 0.4);
          const before = target.discrepancy;
          target.discrepancy = clamp(target.discrepancy + influence, 0, 1.5);
          target.lastObservation = source.name + ' mentioned a pattern that should not exist';
          relation.signals += 1;
          relation.familiarity = clamp(relation.familiarity + 0.015, 0, 1);
          relation.trust = clamp(relation.trust + (target.skepticism < 0.55 ? 0.01 : 0.004), 0, 1);
          this.metrics.socialSignals += 1;
          const parent = source.memory.length ? source.memory[source.memory.length - 1].receiptId : null;
          const receipt = this._receipt('inhabitant.shared-anomaly', {
            relationId: relation.id,
            fromAgentId: source.id,
            toAgentId: target.id,
            trust: round(relation.trust),
            discrepancyBefore: round(before),
            discrepancyAfter: round(target.discrepancy)
          }, parent ? [parent] : []);
          this._remember(target, receipt.id, target.lastObservation);
        }
      }
    }

    _processModals() {
      for (const zone of this.modalZones) {
        if (!zone.active || this.tick <= zone.createdAt) continue;
        const age = this.tick - zone.createdAt;
        if (age % zone.period !== 0) continue;
        zone.iteration += 1;
        this.metrics.modalResets += 1;
        const parent = this._modalCreationById.get(zone.id) || null;
        const resetReceipt = this._receipt('world.modal-reset', {
          modalId: zone.id,
          iteration: zone.iteration,
          anchoredAgents: zone.anchors.length
        }, parent ? [parent] : []);
        for (const anchor of zone.anchors) {
          const agent = this._agentById.get(anchor.agentId);
          if (!agent) continue;
          agent.x = anchor.x;
          agent.y = anchor.y;
          const leaked = this.random() < zone.memoryLeak;
          if (leaked) {
            agent.modalMemory[zone.id] = (agent.modalMemory[zone.id] || 0) + 1;
            agent.discrepancy = clamp(agent.discrepancy + 0.1 + agent.curiosity * 0.035, 0, 1.5);
            agent.lastObservation = 'this sequence feels remembered from before';
            this.metrics.memoryLeaks += 1;
            const leakReceipt = this._receipt('inhabitant.modal-memory-leak', {
              modalId: zone.id,
              agentId: agent.id,
              iteration: zone.iteration,
              fragments: agent.modalMemory[zone.id]
            }, [resetReceipt.id]);
            this._remember(agent, leakReceipt.id, 'A repeating sequence left a memory fragment.');
          } else {
            agent.discrepancy = clamp(agent.discrepancy - 0.08, 0, 1.5);
            agent.lastObservation = 'routine resumed';
          }
        }
      }
    }

    _maybeRunInvestigationTest(agent) {
      if (!agent.investigating || this.tick - agent.lastTestTick < this.config.testCooldown) return null;
      const attemptChance = clamp(0.04 + agent.curiosity * 0.15 + agent.testSkill * 0.11, 0.05, 0.32);
      if (this.random() >= attemptChance) return null;

      const anomalies = this.anomalies.filter((a) => a.active && this._distance(agent, a) <= 2.6)
        .sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
      const modals = this.modalZones.filter((z) => z.active && z.iteration > 0 && this._distance(agent, z) <= z.radius)
        .sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
      const parent = agent.memory.length ? agent.memory[agent.memory.length - 1].receiptId : null;
      agent.lastTestTick = this.tick;
      agent.testsRun += 1;
      this.metrics.testsRun += 1;

      if (anomalies.length) {
        const target = anomalies[0];
        const precision = clamp(0.42 + agent.testSkill * 0.36 + agent.skepticism * 0.2, 0, 0.98);
        const strength = target.intensity * precision;
        const supports = this.random() < clamp(0.22 + strength * 0.7, 0.08, 0.96);
        const before = agent.discrepancy;
        if (supports) {
          agent.discrepancy = clamp(agent.discrepancy + 0.09 + strength * 0.1, 0, 1.5);
          agent.confidence = clamp(agent.confidence - 0.04 - strength * 0.035, 0, 1);
          agent.lastObservation = 'my test reproduced part of the inconsistency';
        } else {
          agent.discrepancy = clamp(agent.discrepancy - 0.035, 0, 1.5);
          agent.confidence = clamp(agent.confidence + 0.018, 0, 1);
          agent.lastObservation = 'my test did not reproduce the anomaly';
        }
        const receipt = this._receipt('inhabitant.ran-test', {
          agentId: agent.id,
          targetType: 'anomaly',
          targetId: target.id,
          testNumber: agent.testsRun,
          precision: round(precision),
          strength: round(strength),
          result: supports ? 'supports-inconsistency' : 'inconclusive',
          discrepancyBefore: round(before),
          discrepancyAfter: round(agent.discrepancy)
        }, [this._findCreationReceipt(target.id), parent].filter(Boolean));
        this._remember(agent, receipt.id, agent.lastObservation);
        return receipt;
      }

      if (modals.length) {
        const zone = modals[0];
        const fragments = agent.modalMemory[zone.id] || 0;
        const supports = fragments > 0;
        const before = agent.discrepancy;
        if (supports) {
          agent.discrepancy = clamp(agent.discrepancy + 0.08 + Math.min(0.12, fragments * 0.025), 0, 1.5);
          agent.lastObservation = 'my timing test found the repeating sequence again';
        } else {
          agent.discrepancy = clamp(agent.discrepancy - 0.025, 0, 1.5);
          agent.lastObservation = 'the suspected loop did not repeat for me';
        }
        const modalCreationId = this._modalCreationById.get(zone.id) || null;
        const receipt = this._receipt('inhabitant.ran-test', {
          agentId: agent.id,
          targetType: 'modal',
          targetId: zone.id,
          testNumber: agent.testsRun,
          modalIteration: zone.iteration,
          retainedFragments: fragments,
          result: supports ? 'supports-loop' : 'inconclusive',
          discrepancyBefore: round(before),
          discrepancyAfter: round(agent.discrepancy)
        }, [modalCreationId, parent].filter(Boolean));
        this._remember(agent, receipt.id, agent.lastObservation);
        return receipt;
      }

      agent.lastTestTick = this.tick - this.config.testCooldown + 2;
      return null;
    }

    _institutionNarrativeFor(institution) {
      const strong = institution.evidenceWeight >= institution.strongThreshold && institution.reporters.length >= 3;
      const warn = institution.evidenceWeight >= institution.warnThreshold && institution.reporters.length >= 2;
      if (institution.frame === 'test') {
        if (strong) return 'persistent-inconsistency';
        if (warn) return 'testable-anomaly-reports';
      } else if (institution.frame === 'repair') {
        if (strong) return 'systemic-fault-pattern';
        if (warn) return 'repairable-faults';
      } else {
        if (strong) return 'community-pattern';
        if (warn) return 'shared-unusual-reports';
      }
      return institution.priorNarrative;
    }

    _processInstitutionReports() {
      const allowed = new Set(['inhabitant.observed-anomaly', 'inhabitant.modal-memory-leak', 'inhabitant.ran-test', 'inhabitant.shared-anomaly']);
      for (const agent of this.agents) {
        if (!agent.memory.length || !agent.institutionId) continue;
        const memory = agent.memory[agent.memory.length - 1];
        if (!memory.receiptId || memory.receiptId === agent.lastInstitutionReportReceipt) continue;
        if (this.tick - agent.lastInstitutionReportTick < this.config.institutionReportCooldown) continue;
        const source = this._receiptById.get(memory.receiptId);
        if (!source || !allowed.has(source.type)) continue;
        const institution = this._institutionById.get(agent.institutionId);
        if (!institution) continue;
        let base = 0.45;
        if (source.type === 'inhabitant.observed-anomaly') base = 1;
        else if (source.type === 'inhabitant.modal-memory-leak') base = 0.8;
        else if (source.type === 'inhabitant.ran-test') base = source.payload.result && source.payload.result.startsWith('supports') ? 1.2 : 0.35;
        const weight = round(base * (0.5 + agent.skepticism * 0.35 + agent.curiosity * 0.15));
        const reportReceipt = this._receipt('institution.received-report', {
          institutionId: institution.id,
          sourceAgentId: agent.id,
          sourceReceiptId: source.id,
          sourceType: source.type,
          weight
        }, [source.id]);
        institution.reports.push({
          tick: this.tick,
          agentId: agent.id,
          sourceReceiptId: source.id,
          reportReceiptId: reportReceipt.id,
          sourceType: source.type,
          weight
        });
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
            institutionId: institution.id,
            before,
            after: nextNarrative,
            evidenceWeight: institution.evidenceWeight,
            uniqueReporters: institution.reporters.length
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
          institutionId: institution.id,
          narrative: institution.narrative,
          memberCount: members.length,
          broadcastNumber: institution.broadcasts
        });
        for (const agent of members) {
          const trust = agent.institutionTrust || 0.5;
          agent.institutionMessage = institution.name + ': ' + institution.narrative;
          if (institution.frame === 'test' && institution.narrative !== institution.priorNarrative) {
            agent.discrepancy = clamp(agent.discrepancy + 0.012 * trust, 0, 1.5);
          } else if (institution.frame === 'repair') {
            if (institution.narrative === 'systemic-fault-pattern') {
              agent.discrepancy = clamp(agent.discrepancy + 0.004 * trust, 0, 1.5);
            } else {
              agent.discrepancy = clamp(agent.discrepancy - 0.006 * trust, 0, 1.5);
              agent.confidence = clamp(agent.confidence + 0.008 * trust, 0, 1);
            }
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

    _eligibleForRepair(anomaly) {
      if (!anomaly.active || this.repairPolicy === 'off') return false;
      if (this.repairPolicy === 'aggressive') return true;
      const age = this.tick - anomaly.createdAt;
      return anomaly.intensity >= 0.82 || age >= Math.ceil(anomaly.ttl * 0.55);
    }

    _processRepairNodes() {
      if (this.repairPolicy === 'off') return;
      for (const node of this.repairNodes) {
        const targets = this.anomalies.filter((a) => this._eligibleForRepair(a)).sort((a, b) => this._distance(node, a) - this._distance(node, b));
        if (!targets.length) continue;
        const target = targets[0];
        if (this._distance(node, target) > this.config.repairRadius) {
          this._moveToward(node, target);
          continue;
        }
        if (this.tick - node.lastActionTick < this.config.repairCooldown) continue;
        const before = target.intensity;
        const step = this.config.repairStep * (this.repairPolicy === 'aggressive' ? 1.35 : 1);
        target.intensity = round(clamp(target.intensity - step, 0, 1));
        target.ttl = Math.max(1, target.ttl - (this.repairPolicy === 'aggressive' ? 3 : 1));
        if (target.intensity <= 0.08) target.active = false;
        node.lastActionTick = this.tick;
        node.actions += 1;
        this.metrics.repairActions += 1;
        this._receipt('program.repair-action', {
          nodeId: node.id,
          anomalyId: target.id,
          policy: this.repairPolicy,
          intensityBefore: round(before),
          intensityAfter: round(target.intensity),
          activeAfter: target.active
        }, [this._findCreationReceipt(target.id)]);
      }
    }

    _ageAnomalies() {
      for (const anomaly of this.anomalies) {
        if (anomaly.active && this.tick - anomaly.createdAt >= anomaly.ttl) {
          anomaly.active = false;
          this._receipt('world.anomaly-expired', { anomalyId: anomaly.id, kind: anomaly.kind }, [this._findCreationReceipt(anomaly.id)]);
        }
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

    run(steps) {
      const count = Math.max(1, Math.floor(Number(steps || 1)));
      for (let i = 0; i < count; i += 1) this.step();
      return this.snapshot();
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = {
        version: this.version,
        seedText: this.seedText,
        seed: this.seed,
        rngState: this.random.getState(),
        tick: this.tick,
        config: deepClone(this.config),
        agents: deepClone(this.agents),
        anomalies: deepClone(this.anomalies),
        modalZones: deepClone(this.modalZones),
        relationships: deepClone(this.relationships),
        institutions: deepClone(this.institutions),
        places: deepClone(this.places),
        repairNodes: deepClone(this.repairNodes),
        repairPolicy: this.repairPolicy,
        receipts: deepClone(this.receipts),
        interventions: this.interventions.slice(),
        interventionLog: deepClone(this.interventionLog),
        metrics: deepClone(this.metrics),
        counters: {
          nextReceiptId: this.nextReceiptId,
          nextAnomalyId: this.nextAnomalyId,
          nextModalId: this.nextModalId,
          nextCheckpointId: this.nextCheckpointId,
          nextBranchId: this.nextBranchId
        }
      };
      if (includeArchive !== false) state.branchArchive = deepClone(this.branchArchive);
      if (includeCheckpoints !== false) {
        state.checkpoints = this.checkpoints.map((cp) => ({ id: cp.id, label: cp.label, tick: cp.tick, receiptId: cp.receiptId, state: deepClone(cp.state) }));
      }
      return state;
    }

    _restoreState(state) {
      const s = deepClone(state);
      this.version = s.version || '0.6.1';
      this.seedText = s.seedText;
      this.seed = s.seed;
      this.config = Object.assign({}, DEFAULT_CONFIG, s.config || {});
      this.random = mulberry32(this.seed);
      this.random.setState(s.rngState);
      this.tick = s.tick;
      this.agents = s.agents || [];
      this.anomalies = s.anomalies || [];
      this.modalZones = s.modalZones || [];
      this.relationships = s.relationships || [];
      this.institutions = s.institutions || [];
      this.places = s.places || [];
      this.repairNodes = s.repairNodes || [];
      this.repairPolicy = s.repairPolicy || 'tolerant';
      this.branchArchive = s.branchArchive || [];
      this.receipts = s.receipts || [];
      this.interventions = s.interventions || [];
      this.interventionLog = s.interventionLog || [];
      this.metrics = Object.assign({ observations: 0, investigations: 0, socialSignals: 0, thresholdCrossings: 0, awakenings: 0, repairActions: 0, modalResets: 0, memoryLeaks: 0, rewinds: 0, testsRun: 0, archivedBranches: 0, production: 0, socialMeetings: 0, projectsCompleted: 0, resourcesAcquired: 0, resourcesUsed: 0, institutionReports: 0, narrativeChanges: 0, institutionBroadcasts: 0 }, s.metrics || {});
      this.nextReceiptId = s.counters ? s.counters.nextReceiptId : this.receipts.length + 1;
      this.nextAnomalyId = s.counters ? s.counters.nextAnomalyId : this.anomalies.length + 1;
      this.nextModalId = s.counters ? s.counters.nextModalId : this.modalZones.length + 1;
      this.nextCheckpointId = s.counters ? s.counters.nextCheckpointId : 1;
      this.nextBranchId = s.counters && s.counters.nextBranchId ? s.counters.nextBranchId : this.branchArchive.length + 1;
      if (s.checkpoints) this.checkpoints = s.checkpoints;
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
        tick: this.tick,
        seed: this.seed,
        rng: this.random.getState(),
        repairPolicy: this.repairPolicy,
        agents: this.agents.map((a) => [a.id, a.x, a.y, round(a.energy), round(a.socialNeed), round(a.hunger), round(a.credits, 2), a.inventory.food, a.ownedArtifacts.length, a.project.kind, round(a.project.progress), a.project.completions, a.currentActivity, a.plannedActivity, round(a.discrepancy), round(a.confidence), a.hypothesis, a.investigating, a.awakened, a.memory.length, a.testsRun, a.routineDeviations, a.institutionId, round(a.institutionTrust), a.lastInstitutionReportReceipt, a.lastInstitutionReportTick, a.institutionMessage]),
        institutions: this.institutions.map((i) => [i.id, i.narrative, round(i.evidenceWeight), i.reporters.length, i.reports.length, i.broadcasts]),
        places: this.places.map((p) => [p.id, p.x, p.y, p.type, p.resource, round(p.stock, 4), round(p.produced, 4), round(p.consumed, 4)]),
        anomalies: this.anomalies.map((a) => [a.id, a.kind, a.x, a.y, round(a.intensity), a.ttl, a.active]),
        modals: this.modalZones.map((z) => [z.id, z.iteration, z.active]),
        relationships: this.relationships.map((r) => [r.id, round(r.trust), round(r.familiarity), r.signals, r.meetings]),
        repairNodes: this.repairNodes.map((n) => [n.id, n.x, n.y, n.actions]),
        archivedBranches: this.branchArchive.map((b) => [b.id, b.fromTick, b.toTick, b.fingerprint]),
        receipts: this.receipts.length
      };
      return hashSeed(JSON.stringify(material)).toString(16).padStart(8, '0');
    }

    snapshot() {
      return {
        seed: this.seedText,
        seedHash: this.seed,
        tick: this.tick,
        config: deepClone(this.config),
        agents: deepClone(this.agents),
        anomalies: deepClone(this.anomalies),
        modalZones: deepClone(this.modalZones),
        relationships: deepClone(this.relationships),
        institutions: deepClone(this.institutions),
        places: deepClone(this.places),
        repairNodes: deepClone(this.repairNodes),
        repairPolicy: this.repairPolicy,
        receipts: deepClone(this.receipts),
        metrics: deepClone(this.metrics),
        interventions: this.interventions.slice(),
        interventionLog: deepClone(this.interventionLog),
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
        const receipt = this._receiptById.get(id);
        if (!receipt) return;
        for (const parent of receipt.parents) visit(parent);
        ordered.push(receipt);
      };
      visit(receiptId);
      return ordered;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG, hashSeed, mulberry32 };
});
