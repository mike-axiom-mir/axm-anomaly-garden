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
    repairCooldown: 3
  });

  function makeId(prefix, n) {
    return prefix + '-' + String(n).padStart(3, '0');
  }

  class GardenSimulation {
    constructor(options) {
      const opts = options || {};
      this.version = '0.2.0';
      this.config = Object.assign({}, DEFAULT_CONFIG, opts.config || {});
      this.seedText = String(opts.seed || 'rabbit-001');
      this.seed = hashSeed(this.seedText);
      this.random = mulberry32(this.seed);
      this.tick = 0;
      this.receipts = [];
      this.interventions = [];
      this.interventionLog = [];
      this.anomalies = [];
      this.modalZones = [];
      this.relationships = [];
      this.repairNodes = [];
      this.checkpoints = [];
      this.repairPolicy = opts.repairPolicy || 'tolerant';
      this.nextReceiptId = 1;
      this.nextAnomalyId = 1;
      this.nextModalId = 1;
      this.nextCheckpointId = 1;
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
        rewinds: 0
      };
      this._createAgents();
      this._createRelationships();
      this._createRepairNodes();
      this._receipt('world.initialized', {
        seed: this.seedText,
        seedHash: this.seed,
        population: this.agents.length,
        dimensions: [this.config.width, this.config.height],
        relationshipEdges: this.relationships.length,
        repairNodes: this.repairNodes.length
      });
    }

    _createAgents() {
      for (let i = 0; i < this.config.population; i += 1) {
        this.agents.push({
          id: makeId('inhabitant', i + 1),
          name: FIRST_NAMES[i % FIRST_NAMES.length],
          x: Math.floor(this.random() * this.config.width),
          y: Math.floor(this.random() * this.config.height),
          curiosity: round(0.18 + this.random() * 0.78),
          skepticism: round(0.18 + this.random() * 0.68),
          social: round(0.2 + this.random() * 0.7),
          threshold: round(0.48 + this.random() * 0.38),
          confidence: round(0.88 + this.random() * 0.1),
          discrepancy: 0,
          hypothesis: 'world-is-consistent',
          investigating: false,
          awakened: false,
          memory: [],
          modalMemory: {},
          lastObservation: 'ordinary day'
        });
      }
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
          signals: 0
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
        state: this._captureState(false)
      };
      this.checkpoints.push(checkpoint);
      return { id: checkpoint.id, label: checkpoint.label, tick: checkpoint.tick, receiptId: checkpoint.receiptId };
    }

    rewindToCheckpoint(checkpointId) {
      const checkpoint = this.checkpoints.find((item) => item.id === checkpointId);
      if (!checkpoint) return null;
      const fromTick = this.tick;
      const preservedCheckpoints = this.checkpoints.filter((item) => item.tick <= checkpoint.tick).map((item) => deepClone(item));
      this._restoreState(checkpoint.state);
      this.checkpoints = preservedCheckpoints;
      this.metrics.rewinds += 1;
      const receipt = this._receipt('intervention.rewind', {
        checkpointId: checkpoint.id,
        fromTick,
        toTick: this.tick
      }, [checkpoint.receiptId]);
      this._recordIntervention('rewind', { checkpointId: checkpoint.id, fromTick, toTick: this.tick }, receipt.id);
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

    _move(agent) {
      const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      let choice = directions[Math.floor(this.random() * directions.length)];
      if (agent.investigating) {
        const live = this.anomalies.filter((a) => a.active).sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
        if (live.length) {
          this._moveToward(agent, live[0]);
          return;
        }
      }
      agent.x = clamp(agent.x + choice[0], 0, this.config.width - 1);
      agent.y = clamp(agent.y + choice[1], 0, this.config.height - 1);
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
      const receipt = this.receipts.find((item) => item.type === 'intervention.anomaly-added' && item.payload.anomaly && item.payload.anomaly.id === anomalyId);
      return receipt ? receipt.id : null;
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
        const parent = agent.memory.length ? agent.memory[agent.memory.length - 1].receiptId : null;
        const receipt = this._receipt('inhabitant.started-investigation', {
          agentId: agent.id,
          score: round(score),
          threshold: agent.threshold
        }, parent ? [parent] : []);
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
        const a = this.agents.find((item) => item.id === relation.a);
        const b = this.agents.find((item) => item.id === relation.b);
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
        const creation = this.receipts.find((r) => r.type === 'intervention.modal-added' && r.payload.modal && r.payload.modal.id === zone.id);
        const parent = creation ? creation.id : null;
        const resetReceipt = this._receipt('world.modal-reset', {
          modalId: zone.id,
          iteration: zone.iteration,
          anchoredAgents: zone.anchors.length
        }, parent ? [parent] : []);
        for (const anchor of zone.anchors) {
          const agent = this.agents.find((item) => item.id === anchor.agentId);
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
        this._move(agent);
        this._observe(agent);
        this._updateBelief(agent);
      }
      this._socialExchange();
      for (const agent of this.agents) this._updateBelief(agent);
      return this.snapshot();
    }

    run(steps) {
      const count = Math.max(1, Math.floor(Number(steps || 1)));
      for (let i = 0; i < count; i += 1) this.step();
      return this.snapshot();
    }

    _captureState(includeCheckpoints) {
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
          nextCheckpointId: this.nextCheckpointId
        }
      };
      if (includeCheckpoints !== false) {
        state.checkpoints = this.checkpoints.map((cp) => ({ id: cp.id, label: cp.label, tick: cp.tick, receiptId: cp.receiptId, state: deepClone(cp.state) }));
      }
      return state;
    }

    _restoreState(state) {
      const s = deepClone(state);
      this.version = s.version || '0.2.0';
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
      this.repairNodes = s.repairNodes || [];
      this.repairPolicy = s.repairPolicy || 'tolerant';
      this.receipts = s.receipts || [];
      this.interventions = s.interventions || [];
      this.interventionLog = s.interventionLog || [];
      this.metrics = Object.assign({ observations: 0, investigations: 0, socialSignals: 0, thresholdCrossings: 0, awakenings: 0, repairActions: 0, modalResets: 0, memoryLeaks: 0, rewinds: 0 }, s.metrics || {});
      this.nextReceiptId = s.counters ? s.counters.nextReceiptId : this.receipts.length + 1;
      this.nextAnomalyId = s.counters ? s.counters.nextAnomalyId : this.anomalies.length + 1;
      this.nextModalId = s.counters ? s.counters.nextModalId : this.modalZones.length + 1;
      this.nextCheckpointId = s.counters ? s.counters.nextCheckpointId : 1;
      if (s.checkpoints) this.checkpoints = s.checkpoints;
    }

    serialize() {
      return JSON.stringify({ schema: 'axm-anomaly-garden/state-v1', state: this._captureState(true) }, null, 2);
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
        agents: this.agents.map((a) => [a.id, a.x, a.y, round(a.discrepancy), round(a.confidence), a.hypothesis, a.investigating, a.awakened, a.memory.length]),
        anomalies: this.anomalies.map((a) => [a.id, a.kind, a.x, a.y, round(a.intensity), a.ttl, a.active]),
        modals: this.modalZones.map((z) => [z.id, z.iteration, z.active]),
        relationships: this.relationships.map((r) => [r.id, round(r.trust), round(r.familiarity), r.signals]),
        repairNodes: this.repairNodes.map((n) => [n.id, n.x, n.y, n.actions]),
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
        repairNodes: deepClone(this.repairNodes),
        repairPolicy: this.repairPolicy,
        receipts: deepClone(this.receipts),
        metrics: deepClone(this.metrics),
        interventions: this.interventions.slice(),
        interventionLog: deepClone(this.interventionLog),
        checkpoints: this.checkpoints.map((cp) => ({ id: cp.id, label: cp.label, tick: cp.tick, receiptId: cp.receiptId })),
        fingerprint: this.stateFingerprint()
      };
    }

    causalAncestors(receiptId) {
      const byId = new Map(this.receipts.map((receipt) => [receipt.id, receipt]));
      const visited = new Set();
      const ordered = [];
      const visit = (id) => {
        if (!id || visited.has(id)) return;
        visited.add(id);
        const receipt = byId.get(id);
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
