(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v10.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const BaseGardenSimulation = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits) => Number(value.toFixed(digits == null ? 3 : digits));
  const makeId = (prefix, n) => prefix + '-' + String(n).padStart(3, '0');

  const V11_DEFAULTS = Object.freeze({
    nestedModalMaxDepth: 3,
    nestedModalMinRadius: 0.6,
    nestedModalMotionStep: 0.25
  });

  const V11_METRICS = Object.freeze({
    nestedModalsCreated: 0,
    nestedModalResets: 0,
    nestedParentCascadeResets: 0,
    nestedMemoryLeaks: 0
  });

  const DIRECTIONS = Object.freeze([
    [1, 0], [0, 1], [-1, 0], [0, -1],
    [1, 1], [-1, 1], [-1, -1], [1, -1]
  ]);

  class GardenSimulation extends BaseGardenSimulation {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.11.0';
      this.config = Object.assign({}, V11_DEFAULTS, this.config, opts.config || {});
      this.metrics = Object.assign({}, V11_METRICS, this.metrics || {});
      this._normalizeModalFabric();
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    _normalizeModalFabric() {
      const byId = new Map((this.modalZones || []).map((zone) => [zone.id, zone]));
      for (const zone of this.modalZones || []) {
        zone.parentModalId = zone.parentModalId || null;
        zone.depth = Number.isInteger(zone.depth) ? zone.depth : (zone.parentModalId && byId.get(zone.parentModalId) ? Number(byId.get(zone.parentModalId).depth || 0) + 1 : 0);
        zone.nested = Boolean(zone.parentModalId);
        zone.localTick = Number(zone.localTick || 0);
        zone.lifetimeResets = Number(zone.lifetimeResets || 0);
        zone.parentResetCount = Number(zone.parentResetCount || 0);
        zone.lastResetTick = zone.lastResetTick == null ? null : Number(zone.lastResetTick);
        if (zone.nested) {
          zone.iteration = Number(zone.iteration || 0);
          zone.localEntities = Array.isArray(zone.localEntities) ? zone.localEntities : (zone.anchors || []).map((anchor) => ({
            agentId: anchor.agentId,
            baseX: Number(anchor.x || 0) - Number(zone.x || 0),
            baseY: Number(anchor.y || 0) - Number(zone.y || 0),
            x: Number(anchor.x || 0) - Number(zone.x || 0),
            y: Number(anchor.y || 0) - Number(zone.y || 0),
            steps: 0
          }));
        }
      }
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.metrics = deepClone(this.metrics);
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      const s = deepClone(state);
      this.version = '0.11.0';
      this.config = Object.assign({}, V11_DEFAULTS, this.config, s.config || {});
      this.metrics = Object.assign({}, V11_METRICS, this.metrics || {}, s.metrics || {});
      this._normalizeModalFabric();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : deepClone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    _modalById(modalId) {
      return (this.modalZones || []).find((zone) => zone.id === modalId) || null;
    }

    _modalChildren(modalId) {
      return (this.modalZones || []).filter((zone) => zone.parentModalId === modalId && zone.active);
    }

    _modalFitsInside(parent, x, y, radius) {
      const dx = Number(x) - Number(parent.x);
      const dy = Number(y) - Number(parent.y);
      return Math.sqrt(dx * dx + dy * dy) + radius <= Number(parent.radius) + 1e-9;
    }

    _anchorsForNestedZone(parent, x, y, radius) {
      const source = Array.isArray(parent.anchors) ? parent.anchors : [];
      const inside = source.filter((anchor) => {
        const dx = Number(anchor.x) - x;
        const dy = Number(anchor.y) - y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });
      const chosen = inside.length ? inside : source.slice(0, 1);
      return chosen.map((anchor) => ({ agentId: anchor.agentId, x: anchor.x, y: anchor.y }));
    }

    addNestedModal(parentModalId, options) {
      const parent = this._modalById(parentModalId);
      if (!parent || !parent.active) throw new Error('Nested Modal parent must be an active Modal');
      const depth = Number(parent.depth || 0) + 1;
      if (depth > this.config.nestedModalMaxDepth) throw new Error('Nested Modal depth limit exceeded');

      const opts = options || {};
      const minRadius = Number(this.config.nestedModalMinRadius);
      const maxRadius = Math.max(minRadius, Number(parent.radius) * 0.7);
      const radius = clamp(Number(opts.radius == null ? Number(parent.radius) * 0.5 : opts.radius), minRadius, maxRadius);
      const x = Number.isFinite(Number(opts.x)) ? Number(opts.x) : Number(parent.x);
      const y = Number.isFinite(Number(opts.y)) ? Number(opts.y) : Number(parent.y);
      if (!this._modalFitsInside(parent, x, y, radius)) throw new Error('Nested Modal must fit completely inside its parent Modal');

      const anchors = this._anchorsForNestedZone(parent, x, y, radius);
      const zone = {
        id: makeId('modal', this.nextModalId++),
        x,
        y,
        radius,
        period: Math.max(4, Math.floor(Number(opts.period || Math.max(4, Number(parent.period || 12) - 2)))),
        memoryLeak: clamp(Number(opts.memoryLeak == null ? parent.memoryLeak : opts.memoryLeak), 0, 1),
        createdAt: this.tick,
        iteration: 0,
        active: true,
        anchors,
        parentModalId: parent.id,
        depth,
        nested: true,
        localTick: 0,
        lifetimeResets: 0,
        parentResetCount: 0,
        lastResetTick: null,
        localEntities: anchors.map((anchor) => ({
          agentId: anchor.agentId,
          baseX: round(Number(anchor.x) - x, 4),
          baseY: round(Number(anchor.y) - y, 4),
          x: round(Number(anchor.x) - x, 4),
          y: round(Number(anchor.y) - y, 4),
          steps: 0
        }))
      };

      this.modalZones.push(zone);
      this.metrics.nestedModalsCreated += 1;
      const parentReceipt = this._modalCreationById.get(parent.id) || null;
      const receipt = this._receipt('intervention.modal-added', {
        modal: deepClone(zone),
        nested: true,
        parentModalId: parent.id,
        depth
      }, parentReceipt ? [parentReceipt] : []);
      this._modalCreationById.set(zone.id, receipt.id);
      this._recordIntervention('nested-modal', deepClone(zone), receipt.id);
      return zone;
    }

    _processModals() {
      const all = this.modalZones;
      this.modalZones = all.filter((zone) => !zone.parentModalId);
      try {
        super._processModals();
      } finally {
        this.modalZones = all;
      }
    }

    _nestedEntropy(zone, entityId, localTick, salt) {
      return hashSeed([this.seed, zone.id, entityId || '-', localTick, salt || '-'].join('|')) >>> 0;
    }

    _stepNestedEntity(zone, entity) {
      const value = this._nestedEntropy(zone, entity.agentId, zone.localTick, 'motion');
      const direction = DIRECTIONS[value % DIRECTIONS.length];
      const magnitude = Number(this.config.nestedModalMotionStep);
      const candidateX = round(entity.x + direction[0] * magnitude, 4);
      const candidateY = round(entity.y + direction[1] * magnitude, 4);
      if (Math.sqrt(candidateX * candidateX + candidateY * candidateY) <= zone.radius) {
        entity.x = candidateX;
        entity.y = candidateY;
      }
      entity.steps = Number(entity.steps || 0) + 1;
    }

    _nestedLeak(zone, resetReceipt) {
      for (const anchor of zone.anchors || []) {
        const agent = this._agentById.get(anchor.agentId);
        if (!agent) continue;
        const value = this._nestedEntropy(zone, agent.id, zone.lifetimeResets, 'memory-leak') / 4294967296;
        if (value >= zone.memoryLeak) continue;
        agent.modalMemory[zone.id] = (agent.modalMemory[zone.id] || 0) + 1;
        agent.discrepancy = clamp(agent.discrepancy + 0.075 + agent.curiosity * 0.025, 0, 1.5);
        agent.lastObservation = 'a memory fragment survived from a deeper repeating layer';
        this.metrics.memoryLeaks += 1;
        this.metrics.nestedMemoryLeaks += 1;
        const leakReceipt = this._receipt('inhabitant.modal-memory-leak', {
          modalId: zone.id,
          parentModalId: zone.parentModalId,
          depth: zone.depth,
          nested: true,
          agentId: agent.id,
          iteration: zone.iteration,
          lifetimeResets: zone.lifetimeResets,
          fragments: agent.modalMemory[zone.id]
        }, [resetReceipt.id]);
        this._remember(agent, leakReceipt.id, agent.lastObservation);
      }
    }

    _resetNestedModal(zone, cause, causeReceiptId) {
      const parentReset = cause === 'parent-reset';
      if (parentReset) {
        zone.localTick = 0;
        zone.iteration = 0;
        zone.parentResetCount += 1;
        this.metrics.nestedParentCascadeResets += 1;
      } else {
        zone.iteration += 1;
      }
      zone.lifetimeResets += 1;
      zone.lastResetTick = this.tick;
      for (const entity of zone.localEntities || []) {
        entity.x = entity.baseX;
        entity.y = entity.baseY;
      }
      this.metrics.modalResets += 1;
      this.metrics.nestedModalResets += 1;
      const creationReceipt = this._modalCreationById.get(zone.id) || null;
      const parents = [creationReceipt, causeReceiptId].filter(Boolean);
      const resetReceipt = this._receipt('world.modal-reset', {
        modalId: zone.id,
        parentModalId: zone.parentModalId,
        depth: zone.depth,
        nested: true,
        cause,
        iteration: zone.iteration,
        lifetimeResets: zone.lifetimeResets,
        parentResetCount: zone.parentResetCount,
        anchoredAgents: (zone.anchors || []).length,
        localTick: zone.localTick
      }, parents);
      this._nestedLeak(zone, resetReceipt);
      for (const child of this._modalChildren(zone.id)) this._resetNestedModal(child, 'parent-reset', resetReceipt.id);
      return resetReceipt;
    }

    _rootResetReceipt(modalId) {
      for (let i = this.receipts.length - 1; i >= 0; i -= 1) {
        const receipt = this.receipts[i];
        if (receipt.tick !== this.tick) break;
        if (receipt.type === 'world.modal-reset' && receipt.payload && receipt.payload.modalId === modalId && !receipt.payload.nested) return receipt;
      }
      return null;
    }

    _processNestedModalFabric(rootResets) {
      const resetRoots = rootResets || new Set();
      const cascaded = new Set();
      for (const rootId of resetRoots) {
        const rootReceipt = this._rootResetReceipt(rootId);
        for (const child of this._modalChildren(rootId)) {
          this._resetNestedModal(child, 'parent-reset', rootReceipt ? rootReceipt.id : null);
          const walk = [child.id];
          while (walk.length) {
            const id = walk.pop();
            cascaded.add(id);
            for (const nested of this._modalChildren(id)) walk.push(nested.id);
          }
        }
      }

      const nestedZones = this.modalZones.filter((zone) => zone.active && zone.parentModalId).sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
      for (const zone of nestedZones) {
        if (cascaded.has(zone.id)) continue;
        const parent = this._modalById(zone.parentModalId);
        if (!parent || !parent.active) continue;
        zone.localTick += 1;
        for (const entity of zone.localEntities || []) this._stepNestedEntity(zone, entity);
        if (zone.localTick > 0 && zone.localTick % zone.period === 0) {
          this._resetNestedModal(zone, 'local-period', null);
          const stack = this._modalChildren(zone.id).map((child) => child.id);
          while (stack.length) {
            const id = stack.pop();
            cascaded.add(id);
            for (const nested of this._modalChildren(id)) stack.push(nested.id);
          }
        }
      }
    }

    step() {
      const rootIterations = new Map(this.modalZones.filter((zone) => !zone.parentModalId).map((zone) => [zone.id, Number(zone.iteration || 0)]));
      super.step();
      const resetRoots = new Set();
      for (const zone of this.modalZones.filter((item) => !item.parentModalId)) {
        if (Number(zone.iteration || 0) > Number(rootIterations.get(zone.id) || 0)) resetRoots.add(zone.id);
      }
      this._processNestedModalFabric(resetRoots);
      return this.snapshot();
    }

    modalTree() {
      const build = (parentId, depth) => this.modalZones
        .filter((zone) => (zone.parentModalId || null) === parentId && zone.active)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((zone) => ({
          id: zone.id,
          depth: Number(zone.depth || depth || 0),
          parentModalId: zone.parentModalId || null,
          period: zone.period,
          iteration: zone.iteration,
          localTick: zone.parentModalId ? zone.localTick : (this.tick - zone.createdAt),
          lifetimeResets: Number(zone.lifetimeResets || zone.iteration || 0),
          parentResetCount: Number(zone.parentResetCount || 0),
          anchors: (zone.anchors || []).length,
          children: build(zone.id, Number(zone.depth || 0) + 1)
        }));
      return build(null, 0);
    }

    stateFingerprint() {
      const parent = super.stateFingerprint();
      const nested = this.modalZones.filter((zone) => zone.parentModalId).map((zone) => [
        zone.id, zone.parentModalId, zone.depth, zone.localTick, zone.iteration,
        zone.lifetimeResets, zone.parentResetCount, zone.lastResetTick,
        (zone.localEntities || []).map((entity) => [entity.agentId, entity.x, entity.y, entity.steps])
      ]);
      return hashSeed(JSON.stringify({ parent, nested })).toString(16).padStart(8, '0');
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.modalTree = this.modalTree();
      snapshot.nestedModalCount = this.modalZones.filter((zone) => zone.parentModalId).length;
      snapshot.fingerprint = this.stateFingerprint();
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, V11_DEFAULTS), hashSeed, mulberry32 };
});
