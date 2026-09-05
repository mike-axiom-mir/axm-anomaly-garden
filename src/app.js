(function () {
  'use strict';
  const { GardenSimulation } = window.AnomalyGardenSim;
  const world = document.getElementById('world');
  const truthList = document.getElementById('truth-list');
  const peopleList = document.getElementById('people-list');
  const causalList = document.getElementById('causal-list');
  const selectedDetail = document.getElementById('selected-detail');
  const seedInput = document.getElementById('seed');
  const repairPolicy = document.getElementById('repair-policy');
  const scenario = document.getElementById('scenario');
  const tickLabel = document.getElementById('tick');
  const metricAwake = document.getElementById('metric-awake');
  const metricInvestigating = document.getElementById('metric-investigating');
  const metricSignals = document.getElementById('metric-signals');
  const metricRepairs = document.getElementById('metric-repairs');
  const metricModals = document.getElementById('metric-modals');
  const metricFingerprint = document.getElementById('metric-fingerprint');
  const metricTests = document.getElementById('metric-tests');
  const metricBranches = document.getElementById('metric-branches');
  const status = document.getElementById('status');
  const selectedLabel = document.getElementById('selected-agent');
  const importFile = document.getElementById('import-file');
  let sim = null;
  let timer = null;
  let selectedAgentId = null;
  let selectedReceiptId = null;
  let latestCheckpointId = null;

  function newSimulation() {
    stop();
    sim = new GardenSimulation({ seed: seedInput.value.trim() || 'rabbit-001', repairPolicy: repairPolicy.value });
    selectedAgentId = sim.agents[0] ? sim.agents[0].id : null;
    selectedReceiptId = sim.receipts[0] ? sim.receipts[0].id : null;
    latestCheckpointId = null;
    setStatus('World reset. Same seed + same ordered actions = same deterministic trajectory.');
    render();
  }

  function step(count) { sim.run(count || 1); render(); }

  function start() {
    if (timer) return;
    timer = setInterval(function () { step(1); }, 420);
    setStatus('World running. Interventions, repairs, loops, and major transitions become causal receipts.');
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
    setStatus('Injected ' + kind + '. Its location is machine truth; inhabitants must encounter evidence themselves.');
    render();
  }

  function whisper() {
    const target = selectedAgentId || (sim.agents[0] && sim.agents[0].id);
    const agent = sim.whisper(target);
    if (agent) setStatus('Whispered to ' + agent.name + '. Evidence pressure changed; their later state remains simulation-driven.');
    render();
  }

  function plantModal() {
    const selected = sim.agents.find(function (a) { return a.id === selectedAgentId; });
    const opts = selected ? { x: selected.x, y: selected.y, radius: 3.2, period: 10, memoryLeak: 0.3 } : { radius: 3.2, period: 10, memoryLeak: 0.3 };
    const modal = sim.addModal(opts);
    setStatus('Planted ' + modal.id + ': a repeating local zone with 30% deterministic memory-leak probability per anchored inhabitant/reset.');
    render();
  }

  function createCheckpoint() {
    const checkpoint = sim.createCheckpoint('t' + sim.tick + ' branch point');
    latestCheckpointId = checkpoint.id;
    setStatus('Created ' + checkpoint.id + ' at tick ' + checkpoint.tick + '. Future experiments can rewind to this exact internal state.');
    render();
  }

  function rewind() {
    const available = sim.checkpoints;
    if (!latestCheckpointId && available.length) latestCheckpointId = available[available.length - 1].id;
    if (!latestCheckpointId) {
      setStatus('No checkpoint exists yet. Create one before branching the experiment.');
      return;
    }
    stop();
    const receipt = sim.rewindToCheckpoint(latestCheckpointId);
    if (!receipt) {
      latestCheckpointId = sim.checkpoints.length ? sim.checkpoints[sim.checkpoints.length - 1].id : null;
      setStatus('That checkpoint is no longer on the current causal branch.');
      return;
    }
    selectedReceiptId = receipt.id;
    latestCheckpointId = sim.checkpoints.length ? sim.checkpoints[sim.checkpoints.length - 1].id : null;
    setStatus('Rewound to ' + receipt.payload.checkpointId + '. The abandoned future was archived before this branch was restored; the rewind itself is receipted.');
    render();
  }

  function exportState() {
    const blob = new Blob([sim.serialize()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anomaly-garden-' + sim.seedText.replace(/[^a-z0-9_-]+/gi, '-') + '-t' + sim.tick + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Exported complete inspectable state, including RNG position, receipts, social topology, Modals, repairs, checkpoints, and archived futures.');
  }

  async function importState(file) {
    if (!file) return;
    stop();
    try {
      const text = await file.text();
      sim = GardenSimulation.deserialize(text);
      seedInput.value = sim.seedText;
      repairPolicy.value = sim.repairPolicy;
      selectedAgentId = sim.agents[0] ? sim.agents[0].id : null;
      selectedReceiptId = sim.receipts.length ? sim.receipts[sim.receipts.length - 1].id : null;
      latestCheckpointId = sim.checkpoints.length ? sim.checkpoints[sim.checkpoints.length - 1].id : null;
      setStatus('Imported exact state at tick ' + sim.tick + '. RNG state was restored, so deterministic continuation can continue from here.');
      render();
    } catch (error) {
      setStatus('Import rejected: ' + error.message);
    } finally {
      importFile.value = '';
    }
  }


  function applyScenario() {
    const choice = scenario.value;
    stop();
    if (choice === 'open-glitch') repairPolicy.value = 'off';
    else if (choice === 'control-pressure') repairPolicy.value = 'aggressive';
    else repairPolicy.value = 'tolerant';
    newSimulation();
    if (choice === 'open-glitch') {
      sim.addModal({ x: 5, y: 4, radius: 3.4, period: 11, memoryLeak: 0.34 });
      sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 48 });
      setStatus('Open glitch planted: repair off, one loop anomaly, one repeating Modal. Outcomes are not scripted.');
    } else if (choice === 'tolerant-loop') {
      sim.addModal({ x: 5, y: 4, radius: 3.4, period: 11, memoryLeak: 0.32 });
      sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 48 });
      sim.addAnomaly('memory-scar', { x: 7, y: 3, radius: 2.6, intensity: 0.76, ttl: 38 });
      setStatus('Tolerant loop planted: repair may respond, but weaker anomalies can persist long enough to be encountered.');
    } else if (choice === 'control-pressure') {
      sim.addModal({ x: 5, y: 4, radius: 3.4, period: 11, memoryLeak: 0.32 });
      sim.addAnomaly('loop-echo', { x: 5, y: 4, radius: 3.2, intensity: 0.9, ttl: 48 });
      sim.addAnomaly('gravity-slip', { x: 7, y: 3, radius: 2.8, intensity: 0.88, ttl: 42 });
      setStatus('Control pressure planted: aggressive repair starts with the same sort of anomaly pressure, but outcomes remain simulation-driven.');
    } else {
      setStatus('Quiet garden planted. No anomaly has been added yet.');
    }
    render();
  }

  function render() {
    renderWorld();
    renderTruth();
    renderPeople();
    renderCausal();
    tickLabel.textContent = String(sim.tick);
    metricAwake.textContent = String(sim.metrics.awakenings);
    metricInvestigating.textContent = String(sim.agents.filter(function (a) { return a.investigating && !a.awakened; }).length);
    metricSignals.textContent = String(sim.metrics.socialSignals);
    metricRepairs.textContent = String(sim.metrics.repairActions);
    metricModals.textContent = String(sim.metrics.modalResets);
    metricTests.textContent = String(sim.metrics.testsRun);
    metricBranches.textContent = String(sim.branchArchive.length);
    metricFingerprint.textContent = sim.stateFingerprint();
  }

  function renderWorld() {
    world.innerHTML = '';
    world.style.setProperty('--cols', sim.config.width);
    world.style.setProperty('--rows', sim.config.height);
    for (let y = 0; y < sim.config.height; y += 1) {
      for (let x = 0; x < sim.config.width; x += 1) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        world.appendChild(cell);
      }
    }
    for (const modal of sim.modalZones.filter(function (z) { return z.active; })) {
      const marker = document.createElement('div');
      marker.className = 'modal-marker';
      marker.style.gridColumn = modal.x + 1;
      marker.style.gridRow = modal.y + 1;
      marker.title = modal.id + ' · period ' + modal.period + ' · iteration ' + modal.iteration;
      marker.textContent = '↻';
      world.appendChild(marker);
    }
    for (const anomaly of sim.anomalies.filter(function (a) { return a.active; })) {
      const marker = document.createElement('div');
      marker.className = 'anomaly ' + anomaly.kind;
      marker.style.gridColumn = anomaly.x + 1;
      marker.style.gridRow = anomaly.y + 1;
      marker.title = anomaly.kind + ' · intensity ' + anomaly.intensity.toFixed(2) + ' · machine truth only';
      world.appendChild(marker);
    }
    for (const node of sim.repairNodes) {
      const repair = document.createElement('div');
      repair.className = 'repair-node';
      repair.style.gridColumn = node.x + 1;
      repair.style.gridRow = node.y + 1;
      repair.title = node.id + ' · ' + node.actions + ' repair actions';
      repair.textContent = 'R';
      world.appendChild(repair);
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
    const active = sim.anomalies.filter(function (a) { return a.active; });
    const activeModals = sim.modalZones.filter(function (z) { return z.active; });
    const truthRows = [
      ['Seed', sim.seedText + ' / ' + sim.seed],
      ['World tick', sim.tick],
      ['Fingerprint', sim.stateFingerprint()],
      ['Active anomalies', active.length],
      ['Repair policy', sim.repairPolicy],
      ['Repair programs', sim.repairNodes.length],
      ['Modal zones', activeModals.length],
      ['Social edges', sim.relationships.length],
      ['Checkpoints', sim.checkpoints.length],
      ['Archived futures', sim.branchArchive.length],
      ['Inhabitant tests', sim.metrics.testsRun],
      ['Receipts', sim.receipts.length]
    ];
    for (const row of truthRows) truthList.appendChild(keyValue(row[0], row[1]));

    if (active.length) {
      const subtitle = document.createElement('h4'); subtitle.textContent = 'Hidden local truth'; truthList.appendChild(subtitle);
      for (const anomaly of active) {
        const item = document.createElement('div'); item.className = 'truth-event';
        item.textContent = anomaly.kind + ' @ ' + anomaly.x + ',' + anomaly.y + ' · intensity ' + anomaly.intensity.toFixed(2) + ' · ttl ' + Math.max(0, anomaly.ttl - (sim.tick - anomaly.createdAt));
        truthList.appendChild(item);
      }
    }

    if (activeModals.length) {
      const subtitle = document.createElement('h4'); subtitle.textContent = 'Repeating Modals'; truthList.appendChild(subtitle);
      for (const modal of activeModals) {
        const item = document.createElement('div'); item.className = 'truth-event modal-event';
        item.textContent = modal.id + ' @ ' + modal.x + ',' + modal.y + ' · period ' + modal.period + ' · loops ' + modal.iteration + ' · anchors ' + modal.anchors.length;
        truthList.appendChild(item);
      }
    }

    if (sim.branchArchive.length) {
      const subtitle = document.createElement('h4'); subtitle.textContent = 'Archived futures'; truthList.appendChild(subtitle);
      for (const branch of sim.branchArchive.slice(-5).reverse()) {
        const item = document.createElement('div'); item.className = 'truth-event branch-event';
        item.textContent = branch.id + ' · abandoned t' + branch.fromTick + ' → rewind t' + branch.toTick + ' · ' + branch.fingerprint;
        truthList.appendChild(item);
      }
    }
  }

  function renderPeople() {
    peopleList.innerHTML = '';
    selectedDetail.innerHTML = '';
    const agents = sim.agents.slice().sort(function (a, b) { return b.discrepancy - a.discrepancy; });
    const selected = sim.agents.find(function (a) { return a.id === selectedAgentId; });
    selectedLabel.textContent = selected ? selected.name : 'none';
    if (selected) renderSelectedDetail(selected);
    for (const agent of agents) {
      const item = document.createElement('button'); item.className = 'agent-card';
      if (agent.id === selectedAgentId) item.classList.add('selected');
      const state = agent.awakened ? 'MODEL BROKEN' : agent.investigating ? 'INVESTIGATING' : 'ROUTINE';
      const ties = sim.relationships.filter(function (r) { return r.a === agent.id || r.b === agent.id; }).length;
      item.innerHTML = '<strong>' + escapeHtml(agent.name) + '</strong><span>' + state + '</span><small>curiosity ' + agent.curiosity.toFixed(2) + ' · discrepancy ' + agent.discrepancy.toFixed(2) + ' · ties ' + ties + '</small><em>“' + escapeHtml(agent.lastObservation) + '”</em>';
      item.addEventListener('click', function () {
        selectedAgentId = agent.id;
        if (agent.memory.length) selectedReceiptId = agent.memory[agent.memory.length - 1].receiptId;
        render();
      });
      peopleList.appendChild(item);
    }
  }

  function renderSelectedDetail(agent) {
    const relations = sim.relationships.filter(function (r) { return r.a === agent.id || r.b === agent.id; });
    const averageTrust = relations.length ? relations.reduce(function (sum, r) { return sum + r.trust; }, 0) / relations.length : 0;
    const fragments = Object.values(agent.modalMemory || {}).reduce(function (sum, value) { return sum + value; }, 0);
    const rows = [
      ['hypothesis', agent.hypothesis],
      ['confidence', agent.confidence.toFixed(2)],
      ['discrepancy', agent.discrepancy.toFixed(2)],
      ['social ties', relations.length],
      ['average trust', averageTrust.toFixed(2)],
      ['modal fragments', fragments],
      ['tests run', agent.testsRun],
      ['test skill', agent.testSkill.toFixed(2)],
      ['recorded memories', agent.memory.length]
    ];
    for (const row of rows) selectedDetail.appendChild(keyValue(row[0], row[1]));
  }

  function renderCausal() {
    causalList.innerHTML = '';
    for (const receipt of sim.receipts.slice(-34).reverse()) {
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
  document.getElementById('apply-scenario').addEventListener('click', applyScenario);
  document.getElementById('step').addEventListener('click', function () { step(1); });
  document.getElementById('step10').addEventListener('click', function () { step(10); });
  document.getElementById('run').addEventListener('click', start);
  document.getElementById('pause').addEventListener('click', stop);
  document.getElementById('whisper').addEventListener('click', whisper);
  document.getElementById('modal').addEventListener('click', plantModal);
  document.getElementById('checkpoint').addEventListener('click', createCheckpoint);
  document.getElementById('rewind').addEventListener('click', rewind);
  document.getElementById('export').addEventListener('click', exportState);
  document.getElementById('import').addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () { importState(importFile.files && importFile.files[0]); });
  repairPolicy.addEventListener('change', function () { sim.setRepairPolicy(repairPolicy.value); setStatus('Repair policy changed to ' + sim.repairPolicy + ' and recorded as an intervention.'); render(); });
  document.querySelectorAll('[data-anomaly]').forEach(function (button) { button.addEventListener('click', function () { inject(button.dataset.anomaly); }); });
  newSimulation();
})();
