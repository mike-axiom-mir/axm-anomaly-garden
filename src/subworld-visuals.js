(function () {
  'use strict';
  const panel = document.querySelector('.completion-panel');
  if (!panel) return;
  const heading = document.createElement('p');
  heading.className = 'world-note';
  heading.textContent = 'Nested Worldglass · each view uses its own local coordinates and clock. Select a resident to inspect its recorded state.';
  const deck = document.createElement('div');
  deck.className = 'subworld-views';
  panel.append(heading, deck);
  const cards = new Map();
  let owner = null;
  function render() {
    const sim = window.AnomalyGardenActiveSimulation;
    if (!sim) return;
    if (owner !== sim) { deck.replaceChildren(); cards.clear(); owner = sim; }
    const seen = new Set();
    for (const zone of sim.modalZones.filter(z => z.active && z.subworld)) {
      seen.add(zone.id);
      let card = cards.get(zone.id);
      if (!card) {
        const el = document.createElement('article');
        const title = document.createElement('h3');
        const map = document.createElement('div');
        map.className = 'world nested-world';
        map.setAttribute('aria-label', zone.id + ' local world');
        const detail = document.createElement('p'); detail.className = 'world-note';
        el.append(title, map, detail); deck.appendChild(el);
        card = { el, title, detail, selected: null, view: {}, renderer: null };
        card.renderer = new window.AnomalyGardenWorldRenderer(map, id => { card.selected = id; render(); });
        cards.set(zone.id, card);
      }
      const sw = zone.subworld;
      card.title.textContent = zone.id + ' / depth ' + zone.depth + ' / local tick ' + sw.tick;
      Object.assign(card.view, {
        tick: sw.tick, config: { width: sw.width, height: sw.height },
        places: [], modalZones: [], repairNodes: [], machinePrograms: sw.programs,
        anomalies: sw.anomalies.map(a => Object.assign({}, a, { kind: a.kind || 'local-distortion' })),
        agents: sw.residents.map(r => Object.assign({}, r, { awakened: r.modelBreak, currentActivity: r.occupation || 'resident' }))
      });
      card.renderer.render(card.view, card.selected);
      const resident = sw.residents.find(r => r.id === card.selected);
      card.detail.textContent = resident ? resident.name + ' · ' + resident.hypothesis + ' · memories ' + resident.memory.length : sw.residents.length + ' residents · ' + sw.programs.filter(p => p.active).length + ' active programs';
    }
    for (const [id, card] of cards) if (!seen.has(id)) { card.el.remove(); cards.delete(id); }
  }
  document.addEventListener('garden:refresh', render);
  document.addEventListener('click', render);
  setInterval(render, 420);
  render();
})();
