(function (root) {
  'use strict';
  // Projection only: never writes to the simulation, consumes RNG or advances time.
  class WorldRenderer {
    constructor(world, select) {
      this.world = world;
      this.select = select;
      this.nodes = new Map();
      this.sim = null;
      this.tick = -1;
    }
    render(sim, selectedId) {
      const reset = this.sim !== sim || sim.tick < this.tick;
      if (reset) {
        this.world.replaceChildren();
        this.nodes.clear();
      }
      const contiguous = !reset && sim.tick === this.tick + 1;
      this.sim = sim;
      this.tick = sim.tick;
      this.world.style.setProperty('--cols', sim.config.width);
      this.world.style.setProperty('--rows', sim.config.height);
      const seen = new Set();
      const put = (key, kind, entity, label, title, extra) => {
        seen.add(key);
        let node = this.nodes.get(key);
        const fresh = !node;
        if (fresh) {
          node = document.createElement(kind === 'person' ? 'button' : 'div');
          node.dataset.entity = key;
          if (kind === 'person') node.addEventListener('click', () => this.select(entity.id));
          this.nodes.set(key, node);
          this.world.appendChild(node);
        }
        const moved = !fresh && (node.dataset.x !== String(entity.x) || node.dataset.y !== String(entity.y));
        node.className = 'world-entity ' + kind + (extra ? ' ' + extra : '');
        // A multi-tick skip or rewind has no known intermediate path: snap honestly.
        node.style.transition = contiguous || !moved ? '' : 'none';
        node.style.left = ((entity.x + 0.5) / sim.config.width * 100) + '%';
        node.style.top = ((entity.y + 0.5) / sim.config.height * 100) + '%';
        node.dataset.x = String(entity.x);
        node.dataset.y = String(entity.y);
        node.textContent = label;
        node.title = title;
        if (kind === 'person') {
          node.setAttribute('aria-label', title);
          node.setAttribute('aria-pressed', String(entity.id === selectedId));
          node.dataset.activity = entity.currentActivity || 'routine';
        }
        return node;
      };
      for (const p of sim.places) put('place:' + p.id, 'place-marker', p, p.name.slice(0, 1), p.name + ' · ' + p.type, p.type);
      for (const m of sim.modalZones.filter(m => m.active)) put('modal:' + m.id, 'modal-marker', m, '↻', m.id + ' · iteration ' + m.iteration);
      for (const a of sim.anomalies.filter(a => a.active)) put('anomaly:' + a.id, 'anomaly', a, '', a.kind + ' · intensity ' + a.intensity.toFixed(2) + ' · machine truth only', a.kind);
      for (const r of sim.repairNodes) put('repair:' + r.id, 'repair-node', r, 'R', r.id + ' · ' + r.actions + ' repair actions');
      for (const p of sim.machinePrograms || []) if (p.active || p.quarantined) put('program:' + p.id, p.quarantined ? 'quarantine-marker' : 'replicator-marker', p, p.quarantined ? 'Q' : (p.kind === 'security' ? 'S' : 'R'), p.id + ' · ' + (p.role || p.kind || 'replicator') + ' · ' + (p.quarantined ? 'quarantined, lineage retained' : 'active'));
      for (const a of sim.agents) put('agent:' + a.id, 'person', a, a.name.slice(0, 1), a.name + ' · ' + a.currentActivity + ' · discrepancy ' + a.discrepancy.toFixed(2), [a.investigating ? 'investigating' : '', a.awakened ? 'awakened' : '', a.id === selectedId ? 'selected' : ''].join(' '));
      for (const [key, node] of this.nodes) if (!seen.has(key)) { node.remove(); this.nodes.delete(key); }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { WorldRenderer };
  else root.AnomalyGardenWorldRenderer = WorldRenderer;
})(typeof window !== 'undefined' ? window : this);
