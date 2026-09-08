(function () {
  'use strict';

  const policy = document.getElementById('replication-policy');
  const seed = document.getElementById('seed-replicator');
  const readout = document.getElementById('replication-readout');
  const world = document.getElementById('world');
  if (!policy || !seed || !readout || !world) return;

  function sim() { return window.AnomalyGardenActiveSimulation || null; }

  function status(message) {
    const el = document.getElementById('status');
    if (el) el.textContent = message;
  }

  function render() {
    const active = sim();
    world.querySelectorAll('.replicator-marker').forEach((node) => node.remove());
    if (!active || !Array.isArray(active.machinePrograms)) {
      readout.textContent = 'engine not ready';
      return;
    }
    policy.value = active.replicationPolicy || 'off';
    readout.textContent = active.machinePrograms.length + ' programs · load ' + active.systemLoad().toFixed(2) + ' · viability ' + active.systemViability().toFixed(2) + ' · strain ' + (active.metrics.strainEvents || 0);
    for (const program of active.machinePrograms) {
      if (!program.active) continue;
      const marker = document.createElement('div');
      marker.className = 'replicator-marker';
      marker.style.gridColumn = program.x + 1;
      marker.style.gridRow = program.y + 1;
      marker.textContent = 'R';
      marker.title = program.id + ' · gen ' + program.generation + ' · locally valid copy chain';
      world.appendChild(marker);
    }
  }

  policy.addEventListener('change', function () {
    const active = sim();
    if (!active || typeof active.setReplicationPolicy !== 'function') return;
    active.setReplicationPolicy(policy.value);
    status('Replication policy → ' + policy.value + '. This changes machine-layer copy admission, not inhabitant goals.');
    render();
  });

  seed.addEventListener('click', function () {
    const active = sim();
    if (!active || typeof active.seedReplicator !== 'function') return;
    const planted = active.seedReplicator({ x: Math.floor(active.config.width / 2), y: Math.floor(active.config.height / 2) });
    status(planted ? 'Seeded ' + planted.id + '. Run the clock to see whether locally valid copies stay inside global capacity.' : 'Replicator seed cell is occupied.');
    render();
  });

  setInterval(render, 420);
  render();
})();
