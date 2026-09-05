(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function hashSeed(input) {
    const text = String(input || 'anomaly-garden');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));

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
    memoryLimit: 12
  });

  function makeId(prefix, n) {
    return prefix + '-' + String(n).padStart(3, '0');
  }

  class GardenSimulation {
    constructor(options) {
      const opts = options || {};
      this.config = Object.assign({}, DEFAULT_CONFIG, opts.config || {});
      this.seedText = String(opts.seed || 'rabbit-001');
      this.seed = hashSeed(this.seedText);
      this.random = mulberry32(this.seed);
      this.tick = 0;
      this.running = false;
      this.receipts = [];
      this.interventions = [];
      this.anomalies = [];
      this.nextReceiptId = 1;
      this.nextAnomalyId = 1;
      this.agents = [];
      this.metrics = { observations: 0, investigations: 0, socialSignals: 0, thresholdCrossings: 0, awakenings: 0 };
      this._createAgents();
      this._receipt('world.initialized', {
        seed: this.seedText,
        seedHash: this.seed,
        population: this.agents.length,
        dimensions: [this.config.width, this.config.height]
      });
    }

    _createAgents() {
      for (let i = 0; i < this.config.population; i += 1) {
        const curiosity = round(0.18 + this.random() * 0.78);
        const skepticism = round(0.18 + this.random() * 0.68);
        const social = round(0.2 + this.random() * 0.7);
        const threshold = round(0.48 + this.random() * 0.38);
        this.agents.push({
          id: makeId('inhabitant', i + 1),
          name: FIRST_NAMES[i % FIRST_NAMES.length],
          x: Math.floor(this.random() * this.config.width),
          y: Math.floor(this.random() * this.config.height),
          curiosity,
          skepticism,
          social,
          threshold,
          confidence: round(0.88 + this.random() * 0.1),
          discrepancy: 0,
          hypothesis: 'world-is-consistent',
          investigating: false,
          awakened: false,
          memory: [],
          lastObservation: 'ordinary day'
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
      const receipt = this._receipt('intervention.anomaly-added', { anomaly: Object.assign({}, anomaly) });
      this.interventions.push(receipt.id);
      return anomaly;
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
      this.interventions.push(receipt.id);
      this._remember(agent, receipt.id, 'A question did not fit the routine.');
      return agent;
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

    _move(agent) {
      const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      let choice = directions[Math.floor(this.random() * directions.length)];
      if (agent.investigating) {
        const live = this.anomalies.filter((a) => a.active).sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
        if (live.length) {
          const target = live[0];
          choice = [Math.sign(target.x - agent.x), Math.sign(target.y - agent.y)];
          if (choice[0] !== 0 && choice[1] !== 0) choice = this.random() < 0.5 ? [choice[0], 0] : [0, choice[1]];
        }
      }
      agent.x = clamp(agent.x + choice[0], 0, this.config.width - 1);
      agent.y = clamp(agent.y + choice[1], 0, this.config.height - 1);
    }

    _observe(agent) {
      const nearby = this.anomalies.filter((anomaly) => anomaly.active && this._distance(agent, anomaly) <= anomaly.radius).sort((a, b) => this._distance(agent, a) - this._distance(agent, b));
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

    _socialExchange() {
      for (let i = 0; i < this.agents.length; i += 1) {
        const a = this.agents[i];
        if (!a.investigating && !a.awakened) continue;
        for (let j = 0; j < this.agents.length; j += 1) {
          if (i === j) continue;
          const b = this.agents[j];
          if (this._distance(a, b) > this.config.socialRadius) continue;
          const chance = a.social * b.curiosity * 0.23;
          if (this.random() >= chance) continue;
          const influence = this.config.socialInfluence * (0.6 + a.discrepancy * 0.5);
          const before = b.discrepancy;
          b.discrepancy = clamp(b.discrepancy + influence, 0, 1.5);
          b.lastObservation = a.name + ' mentioned a pattern that should not exist';
          this.metrics.socialSignals += 1;
          const parent = a.memory.length ? a.memory[a.memory.length - 1].receiptId : null;
          const receipt = this._receipt('inhabitant.shared-anomaly', {
            fromAgentId: a.id,
            toAgentId: b.id,
            discrepancyBefore: round(before),
            discrepancyAfter: round(b.discrepancy)
          }, parent ? [parent] : []);
          this._remember(b, receipt.id, b.lastObservation);
        }
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

    snapshot() {
      return {
        seed: this.seedText,
        seedHash: this.seed,
        tick: this.tick,
        config: Object.assign({}, this.config),
        agents: this.agents.map((agent) => Object.assign({}, agent, { memory: agent.memory.map((m) => Object.assign({}, m)) })),
        anomalies: this.anomalies.map((anomaly) => Object.assign({}, anomaly)),
        receipts: this.receipts.map((receipt) => ({
          id: receipt.id,
          tick: receipt.tick,
          type: receipt.type,
          payload: JSON.parse(JSON.stringify(receipt.payload)),
          parents: receipt.parents.slice()
        })),
        metrics: Object.assign({}, this.metrics),
        interventions: this.interventions.slice()
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
