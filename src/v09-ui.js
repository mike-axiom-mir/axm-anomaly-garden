(function () {
  'use strict';
  const policy = document.getElementById('containment-policy');
  const readout = document.getElementById('containment-readout');
  const world = document.getElementById('world');
  if (!policy || !readout || !world) return;

  function sim() { return window.AnomalyGardenActiveSimulation || null; }
  function status(message) {
    const el = document.getElementById('status');
    if (el) el.textContent = message;
  }

  function render() {
    const active = sim();
    if (!active || !Array.isArray(active.machinePrograms)) {
      readout.textContent = 'engine not ready';
      return;
    }
    policy.value = active.containmentPolicy || 'off';
    const live = typeof active.activeReplicators === 'function' ? active.activeReplicators().length : active.machinePrograms.filter((program) => program.active).length;
    const quarantined = typeof active.quarantinedReplicators === 'function' ? active.quarantinedReplicators().length : active.machinePrograms.filter((program) => program.quarantined).length;
    readout.textContent = live + ' active · ' + quarantined + ' quarantined · ' + (active.metrics.containmentCycles || 0) + ' containment cycles';

  }

  policy.addEventListener('change', function () {
    const active = sim();
    if (!active || typeof active.setContainmentPolicy !== 'function') return;
    active.setContainmentPolicy(policy.value);
    status('Containment → ' + policy.value + '. Quarantine preserves lineage and removes copies from active replication/load; it does not delete them.');
    render();
  });

  setInterval(render, 420);
  render();
})();