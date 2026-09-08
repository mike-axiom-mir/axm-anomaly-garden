(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v12.js') : root.AnomalyGardenSim;
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
  const pad = (n) => String(n).padStart(3, '0');

  const DEFAULTS = {
    subworldGateCapacity: 2,
    subworldGateAccessRadius: 1.25
  };

  const METRICS = {
    subworldGatesCreated: 0,
    subworldResidentTransits: 0,
    subworldEvidenceHandoffs: 0,
    subworldTransitBlocked: 0
  };

  class GardenSimulation extends Base {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.13.0';
      this.config = Object.assign({}, DEFAULTS, this.config, opts.config || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {});
      this.subworldGates = Array.isArray(this.subworldGates) ? this.subworldGates : [];
      this.nextSubworldGateId = Number(this.nextSubworldGateId || 1);
      this._normalizeGateFabric();
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.metrics = clone(this.metrics);
      state.subworldGates = clone(this.subworldGates);
      state.nextSubworldGateId = this.nextSubworldGateId;
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      this.version = '0.13.0';
      this.config = Object.assign({}, DEFAULTS, this.config, (state && state.config) || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {}, (state && state.metrics) || {});
      this.subworldGates = clone((state && state.subworldGates) || []);
      this.nextSubworldGateId = Number((state && state.nextSubworldGateId) || this.subworldGates.length + 1);
      this._normalizeGateFabric();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : clone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    initializeModalSubworld(modalId, options) {
      const sw = super.initializeModalSubworld(modalId, options);
      this._normalizeGateFabric();
      const zone = this._livingZone(modalId);
      if (zone) this._refreshBaseline(zone);
      return sw;
    }

    _restoreLivingBaseline(zone) {
      super._restoreLivingBaseline(zone);
      this._normalizeGateFabric();
    }

    _normalizeGateFabric() {
      for (const zone of this.modalZones || []) {
        if (!zone.subworld) continue;
        zone.subworld.inboundEvidence = Array.isArray(zone.subworld.inboundEvidence) ? zone.subworld.inboundEvidence : [];
        zone.subworld.residents.forEach((resident) => {
          resident.transitHistory = Array.isArray(resident.transitHistory) ? resident.transitHistory : [];
          resident.originModalId = resident.originModalId || zone.id;
        });
      }
      this.subworldGates = (this.subworldGates || []).map((gate) => Object.assign({
        active: true,
        bidirectional: true,
        capacityPerTick: Number(this.config.subworldGateCapacity),
        accessRadius: Number(this.config.subworldGateAccessRadius),
        usedTick: -1,
        usedThisTick: 0,
        transits: 0,
        evidenceHandoffs: 0
      }, gate));
    }

    _living(modalId) {
      const zone = this._livingZone(modalId);
      if (!zone || !zone.active) throw new Error('Gate endpoint requires an active living nested Modal');
      return zone;
    }

    _directlyRelated(a, b) {
      return a.parentModalId === b.id || b.parentModalId === a.id;
    }

    _gateEndpoint(zone, x, y) {
      return {
        modalId: zone.id,
        x: Number.isFinite(Number(x)) ? clamp(Number(x), 0, zone.subworld.width - 1) : Math.floor(zone.subworld.width / 2),
        y: Number.isFinite(Number(y)) ? clamp(Number(y), 0, zone.subworld.height - 1) : Math.floor(zone.subworld.height / 2)
      };
    }

    createSubworldGate(fromModalId, toModalId, options) {
      if (fromModalId === toModalId) throw new Error('Cross-layer gate endpoints must differ');
      const from = this._living(fromModalId);
      const to = this._living(toModalId);
      if (!this._directlyRelated(from, to)) throw new Error('Cross-layer gate endpoints must be direct parent/child Modals');
      const opts = options || {};
      const id = 'gate-' + pad(this.nextSubworldGateId++);
      const gate = {
        id,
        active: opts.active !== false,
        bidirectional: opts.bidirectional !== false,
        from: this._gateEndpoint(from, opts.fromX, opts.fromY),
        to: this._gateEndpoint(to, opts.toX, opts.toY),
        capacityPerTick: Math.max(1, Math.floor(Number(opts.capacityPerTick || this.config.subworldGateCapacity))),
        accessRadius: Math.max(0.25, Number(opts.accessRadius == null ? this.config.subworldGateAccessRadius : opts.accessRadius)),
        usedTick: -1,
        usedThisTick: 0,
        transits: 0,
        evidenceHandoffs: 0,
        createdAt: this.tick,
        creationReceiptId: null
      };
      this.subworldGates.push(gate);
      this.metrics.subworldGatesCreated += 1;
      const receipt = this._receipt('intervention.subworld-gate-created', {
        gateId: gate.id,
        fromModalId: gate.from.modalId,
        toModalId: gate.to.modalId,
        bidirectional: gate.bidirectional,
        capacityPerTick: gate.capacityPerTick,
        accessRadius: gate.accessRadius
      }, [this._modalCreationById.get(from.id), this._modalCreationById.get(to.id)].filter(Boolean));
      gate.creationReceiptId = receipt.id;
      this._recordIntervention('subworld-gate', clone(gate), receipt.id);
      return gate;
    }

    setSubworldGateActive(gateId, active) {
      const gate = this.subworldGates.find((item) => item.id === gateId);
      if (!gate) throw new Error('Unknown subworld gate');
      gate.active = Boolean(active);
      const receipt = this._receipt('intervention.subworld-gate-state', {
        gateId: gate.id,
        active: gate.active
      }, [gate.creationReceiptId].filter(Boolean));
      this._recordIntervention('subworld-gate-state', { gateId: gate.id, active: gate.active }, receipt.id);
      return gate;
    }

    _gateDirection(gate, fromModalId) {
      if (gate.from.modalId === fromModalId) return { source: gate.from, target: gate.to };
      if (gate.bidirectional && gate.to.modalId === fromModalId) return { source: gate.to, target: gate.from };
      return null;
    }

    _residentLocation(residentId, preferredModalId) {
      const matches = [];
      for (const zone of this.modalZones || []) {
        if (!zone.subworld) continue;
        const index = zone.subworld.residents.findIndex((resident) => resident.id === residentId);
        if (index >= 0) matches.push({ zone, sw: zone.subworld, resident: zone.subworld.residents[index], index });
      }
      if (preferredModalId) return matches.find((match) => match.zone.id === preferredModalId) || null;
      return matches.length === 1 ? matches[0] : null;
    }

    _gateBlocked(gate, residentId, fromModalId, reason) {
      this.metrics.subworldTransitBlocked += 1;
      return this._receipt('subworld.transit-blocked', {
        gateId: gate ? gate.id : null,
        residentId: residentId || null,
        fromModalId: fromModalId || null,
        reason,
        tick: this.tick
      }, gate && gate.creationReceiptId ? [gate.creationReceiptId] : []);
    }

    _resetGateCapacity(gate) {
      if (gate.usedTick !== this.tick) {
        gate.usedTick = this.tick;
        gate.usedThisTick = 0;
      }
    }

    transitResident(gateId, residentId, fromModalId) {
      const gate = this.subworldGates.find((item) => item.id === gateId);
      if (!gate) throw new Error('Unknown subworld gate');
      if (!gate.active) return this._gateBlocked(gate, residentId, fromModalId, 'gate-inactive');
      const location = this._residentLocation(residentId, fromModalId);
      if (!location) return this._gateBlocked(gate, residentId, fromModalId, 'resident-not-at-unique-source');
      const direction = this._gateDirection(gate, location.zone.id);
      if (!direction) return this._gateBlocked(gate, residentId, location.zone.id, 'direction-not-allowed');
      this._resetGateCapacity(gate);
      if (gate.usedThisTick >= gate.capacityPerTick) return this._gateBlocked(gate, residentId, location.zone.id, 'gate-capacity-exhausted');
      if (this._dist(location.resident, direction.source) > gate.accessRadius) return this._gateBlocked(gate, residentId, location.zone.id, 'resident-outside-gate-radius');
      const targetZone = this._livingZone(direction.target.modalId);
      if (!targetZone || !targetZone.active) return this._gateBlocked(gate, residentId, location.zone.id, 'target-unavailable');
      const targetSw = targetZone.subworld;
      if (targetSw.residents.some((resident) => resident.id === residentId)) return this._gateBlocked(gate, residentId, location.zone.id, 'resident-already-at-target');

      const resident = location.sw.residents.splice(location.index, 1)[0];
      const previousModalId = location.zone.id;
      resident.x = clamp(Math.round(direction.target.x), 0, targetSw.width - 1);
      resident.y = clamp(Math.round(direction.target.y), 0, targetSw.height - 1);
      resident.baseX = resident.x;
      resident.baseY = resident.y;
      resident.transitHistory = resident.transitHistory || [];
      resident.transitHistory.push({ gateId: gate.id, fromModalId: previousModalId, toModalId: targetZone.id, tick: this.tick });
      targetSw.residents.push(resident);
      gate.usedThisTick += 1;
      gate.transits += 1;
      this.metrics.subworldResidentTransits += 1;

      this._refreshBaseline(location.zone);
      this._refreshBaseline(targetZone);
      const parents = [gate.creationReceiptId].concat((resident.memory || []).slice(-1).map((memory) => memory.receiptId)).filter(Boolean);
      const receipt = this._receipt('subworld.resident-transited', {
        gateId: gate.id,
        residentId: resident.id,
        fromModalId: previousModalId,
        toModalId: targetZone.id,
        destination: { x: resident.x, y: resident.y },
        historyPreserved: true,
        memoryEntries: (resident.memory || []).length
      }, parents);
      return receipt;
    }

    handoffResidentEvidence(gateId, residentId, receiptId, fromModalId) {
      const gate = this.subworldGates.find((item) => item.id === gateId);
      if (!gate) throw new Error('Unknown subworld gate');
      if (!gate.active) return this._gateBlocked(gate, residentId, fromModalId, 'gate-inactive');
      const location = this._residentLocation(residentId, fromModalId);
      if (!location) return this._gateBlocked(gate, residentId, fromModalId, 'resident-not-at-unique-source');
      const direction = this._gateDirection(gate, location.zone.id);
      if (!direction) return this._gateBlocked(gate, residentId, location.zone.id, 'direction-not-allowed');
      const memory = (location.resident.memory || []).find((item) => item.receiptId === receiptId);
      if (!memory) return this._gateBlocked(gate, residentId, location.zone.id, 'evidence-not-in-resident-memory');
      if (this._dist(location.resident, direction.source) > gate.accessRadius) return this._gateBlocked(gate, residentId, location.zone.id, 'resident-outside-gate-radius');
      const targetZone = this._livingZone(direction.target.modalId);
      if (!targetZone) return this._gateBlocked(gate, residentId, location.zone.id, 'target-unavailable');
      targetZone.subworld.inboundEvidence = targetZone.subworld.inboundEvidence || [];
      const packet = {
        id: gate.id + '-evidence-' + String(gate.evidenceHandoffs + 1).padStart(3, '0'),
        gateId: gate.id,
        sourceModalId: location.zone.id,
        targetModalId: targetZone.id,
        sourceResidentId: residentId,
        sourceReceiptId: receiptId,
        summary: String(memory.summary || 'source-linked evidence'),
        tick: this.tick
      };
      targetZone.subworld.inboundEvidence.push(packet);
      gate.evidenceHandoffs += 1;
      this.metrics.subworldEvidenceHandoffs += 1;
      return this._receipt('subworld.evidence-handed-off', clone(packet), [gate.creationReceiptId, receiptId].filter(Boolean));
    }

    subworldSummary(modalId) {
      const summary = super.subworldSummary(modalId);
      if (!summary) return null;
      const zone = this._livingZone(modalId);
      summary.gates = this.subworldGates.filter((gate) => gate.from.modalId === modalId || gate.to.modalId === modalId).map((gate) => ({
        id: gate.id,
        active: gate.active,
        bidirectional: gate.bidirectional,
        fromModalId: gate.from.modalId,
        toModalId: gate.to.modalId,
        transits: gate.transits,
        evidenceHandoffs: gate.evidenceHandoffs
      }));
      summary.inboundEvidence = zone && zone.subworld ? zone.subworld.inboundEvidence.length : 0;
      return summary;
    }

    stateFingerprint() {
      const parent = super.stateFingerprint();
      const gates = (this.subworldGates || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id))).map((gate) => [
        gate.id,
        Boolean(gate.active),
        Boolean(gate.bidirectional),
        [gate.from && gate.from.modalId, Number(gate.from && gate.from.x), Number(gate.from && gate.from.y)],
        [gate.to && gate.to.modalId, Number(gate.to && gate.to.x), Number(gate.to && gate.to.y)],
        Number(gate.capacityPerTick),
        Number(gate.accessRadius),
        Number(gate.usedTick),
        Number(gate.usedThisTick),
        Number(gate.transits),
        Number(gate.evidenceHandoffs),
        Number(gate.createdAt),
        gate.creationReceiptId || null
      ]);
      return hashSeed(JSON.stringify({ parent, gates })).toString(16).padStart(8, '0');
    }

    snapshot() {
      const snapshot = super.snapshot();
      snapshot.version = this.version;
      snapshot.subworldGates = clone(this.subworldGates);
      snapshot.fingerprint = this.stateFingerprint();
      return snapshot;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, DEFAULTS), hashSeed, mulberry32 };
});