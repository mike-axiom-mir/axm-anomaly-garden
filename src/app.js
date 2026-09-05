(function () {
  'use strict';
  const { GardenSimulation } = window.AnomalyGardenSim;
  const world = document.getElementById('world');
  const truthList = document.getElementById('truth-list');
  const peopleList = document.getElementById('people-list');
  const causalList = document.getElementById('causal-list');
  const seedInput = document.getElementById('seed');
  const tickLabel = document.getElementById('tick');
  const metricAwake = document.getElementById('metric-awake');
  const metricInvestigating = document.getElementById('metric-investigating');
  const metricReceipts = document.getElementById('metric-receipts');
  const metricSignals = document.getElementById('metric-signals');
  const status = document.getElementById('status');
  const selectedLabel = document.getElementById('selected-agent');
  let sim = null;
  let timer = null;
  let selectedAgentId = null;
  let selectedReceiptId = null;

  function newSimulation() {
    stop();
    sim = new GardenSimulation({ seed: seedInput.value.trim() || 'rabbit-001' });
    selectedAgentId = sim.agents[0] ? sim.agents[0].id : null;
    selectedReceiptId = sim.receipts[0] ? sim.receipts[0].id : null;
    setStatus('World reset. Same seed = same initial world and same deterministic sequence of actions.');
    render();
  }
  function step(count) { sim.run(count || 1); render(); }
  function start() {
    if (timer) return;
    timer = setInterval(() => step(1), 420);
    setStatus('World running. Interventions are recorded as causal receipts.');
    document.body.classList.add('running');
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    document.body.classList.remove('running');
  }
  function setStatus(message) { status.textContent = message; }
  function inject(kind) {
    sim.addAnomaly(kind, { intensity: 0.78, radius: 2.1, ttl: 22 });
    setStatus('Injected ' + kind + '. Location is now part of machine truth; inhabitants only know what they manage to observe.');
    render();
  }
  function whisper() {
    const target = selectedAgentId || (sim.agents[0] && sim.agents[0].id);
    const agent = sim.whisper(target);
    if (agent) setStatus('Whispered to ' + agent.name + '. The intervention changed evidence pressure, not the final outcome.');
    render();
  }
  function render() {
    renderWorld(); renderTruth(); renderPeople(); renderCausal();
    tickLabel.textContent = String(sim.tick);
    metricAwake.textContent = String(sim.metrics.awakenings);
    metricInvestigating.textContent = String(sim.agents.filter((a) => a.investigating && !a.awakened).length);
    metricReceipts.textContent = String(sim.receipts.length);
    metricSignals.textContent = String(sim.metrics.socialSignals);
  }
  function renderWorld() {
    world.innerHTML = '';
    world.style.setProperty('--cols', sim.config.width);
    world.style.setProperty('--rows', sim.config.height);
    for (let y = 0; y < sim.config.height; y += 1) {
      for (let x = 0; x < sim.config.width; x += 1) {
        const cell = document.createElement('div'); cell.className = 'cell'; world.appendChild(cell);
      }
    }
    for (const anomaly of sim.anomalies.filter((a) => a.active)) {
      const marker = document.createElement('div');
      marker.className = 'anomaly ' + anomaly.kind;
      marker.style.gridColumn = anomaly.x + 1;
      marker.style.gridRow = anomaly.y + 1;
      marker.title = anomaly.kind + ' · machine truth only';
      world.appendChild(marker);
    }
    for (const agent of sim.agents) {
      const person = document.createElement('button');
      person.className = 'person';
      if (agent.investigating) person.classList.add('investigating');
      if (agent.awakened) person.classList.add('awakened');
      if (agent.id === selectedAgentId) person.classList.add('selected');
      person.style.gridColumn = agent.x + 1;
      person.style.gridRow = agent.y + 1;
      person.textContent = agent.name.slice(0, 1);
      person.title = agent.name + ' · discrepancy ' + agent.discrepancy.toFixed(2);
      person.addEventListener('click', function () { selectedAgentId = agent.id; render(); });
      world.appendChild(person);
    }
  }
  function renderTruth() {
    truthList.innerHTML = '';
    const active = sim.anomalies.filter((a) => a.active);
    const truthRows = [['Seed', sim.seedText + ' / ' + sim.seed], ['World tick', sim.tick], ['Active anomalies', active.length], ['Observations', sim.metrics.observations], ['Investigations', sim.metrics.investigations], ['Model breaks', sim.metrics.awakenings]];
    for (const row of truthRows) truthList.appendChild(keyValue(row[0], row[1]));
    if (active.length) {
      const subtitle = document.createElement('h4'); subtitle.textContent = 'Hidden local truth'; truthList.appendChild(subtitle);
      for (const anomaly of active) {
        const item = document.createElement('button'); item.className = 'truth-event';
        item.textContent = anomaly.kind + ' @ ' + anomaly.x + ',' + anomaly.y + ' · ttl ' + Math.max(0, anomaly.ttl - (sim.tick - anomaly.createdAt));
        truthList.appendChild(item);
      }
    }
  }
  function renderPeople() {
    peopleList.innerHTML = '';
    const agents = sim.agents.slice().sort((a, b) => b.discrepancy - a.discrepancy);
    const selected = sim.agents.find((a) => a.id === selectedAgentId);
    selectedLabel.textContent = selected ? selected.name : 'none';
    for (const agent of agents) {
      const item = document.createElement('button'); item.className = 'agent-card';
      if (agent.id === selectedAgentId) item.classList.add('selected');
      const state = agent.awakened ? 'MODEL BROKEN' : agent.investigating ? 'INVESTIGATING' : 'ROUTINE';
      item.innerHTML = '<strong>' + escapeHtml(agent.name) + '</strong><span>' + state + '</span><small>curiosity ' + agent.curiosity.toFixed(2) + ' · discrepancy ' + agent.discrepancy.toFixed(2) + '</small><em>“' + escapeHtml(agent.lastObservation) + '”</em>';
      item.addEventListener('click', function () {
        selectedAgentId = agent.id;
        if (agent.memory.length) selectedReceiptId = agent.memory[agent.memory.length - 1].receiptId;
        render();
      });
      peopleList.appendChild(item);
    }
  }
  function renderCausal() {
    causalList.innerHTML = '';
    for (const receipt of sim.receipts.slice(-24).reverse()) {
      const item = document.createElement('button'); item.className = 'receipt';
      if (receipt.id === selectedReceiptId) item.classList.add('selected');
      item.innerHTML = '<span>' + receipt.id + '</span><strong>' + escapeHtml(receipt.type) + '</strong><small>t' + receipt.tick + (receipt.parents.length ? ' · ← ' + receipt.parents.join(', ') : '') + '</small>';
      item.addEventListener('click', function () { selectedReceiptId = receipt.id; showAncestors(receipt.id); });
      causalList.appendChild(item);
    }
  }
  function showAncestors(receiptId) {
    causalList.innerHTML = '';
    const back = document.createElement('button'); back.className = 'receipt back'; back.textContent = '← recent receipts'; back.addEventListener('click', renderCausal); causalList.appendChild(back);
    for (const receipt of sim.causalAncestors(receiptId)) {
      const item = document.createElement('div'); item.className = 'receipt selected';
      item.innerHTML = '<span>' + receipt.id + '</span><strong>' + escapeHtml(receipt.type) + '</strong><small>tick ' + receipt.tick + '</small>';
      causalList.appendChild(item);
    }
  }
  function keyValue(key, value) {
    const row = document.createElement('div'); row.className = 'kv';
    const k = document.createElement('span'); k.textContent = key;
    const v = document.createElement('strong'); v.textContent = String(value);
    row.appendChild(k); row.appendChild(v); return row;
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; });
  }
  document.getElementById('reset').addEventListener('click', newSimulation);
  document.getElementById('step').addEventListener('click', function () { step(1); });
  document.getElementById('step10').addEventListener('click', function () { step(10); });
  document.getElementById('run').addEventListener('click', start);
  document.getElementById('pause').addEventListener('click', stop);
  document.getElementById('whisper').addEventListener('click', whisper);
  document.querySelectorAll('[data-anomaly]').forEach(function (button) { button.addEventListener('click', function () { inject(button.dataset.anomaly); }); });
  newSimulation();
})();
