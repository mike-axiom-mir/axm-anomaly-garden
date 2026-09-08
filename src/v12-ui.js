(function () {
  'use strict';

  const shell = document.querySelector('main.shell');
  if (!shell) return;

  const panel = document.createElement('section');
  panel.className = 'panel glass subworld-ecology-panel';
  panel.innerHTML = [
    '<div class="panel-head">',
      '<div><p class="eyebrow">NESTED LIVING LAYER</p><h2>Subworld + Security Ecology</h2></div>',
      '<small>bounded residents · local anomalies/programs · jurisdiction-limited security</small>',
    '</div>',
    '<div class="subworld-controls">',
      '<select id="subworld-modal-select" aria-label="nested Modal"></select>',
      '<button id="subworld-init">Initialize</button>',
      '<button id="subworld-anomaly">Local Glitch</button>',
      '<button id="subworld-replicator">Seed Replicator</button>',
      '<button id="subworld-warden">Deploy Warden</button>',
      '<button id="subworld-repairer">Deploy Repairer</button>',
    '</div>',
    '<div id="subworld-ecology-readout" class="subworld-ecology-readout">No living subworld selected.</div>'
  ].join('');

  const footer = shell.querySelector('footer');
  shell.insertBefore(panel, footer || null);

  const select = panel.querySelector('#subworld-modal-select');
  const readout = panel.querySelector('#subworld-ecology-readout');

  function sim() { return window.AnomalyGardenActiveSimulation || null; }
  function status(message) { const el = document.getElementById('status'); if (el) el.textContent = message; }

  function nestedZones(active) {
    return (active && active.modalZones || [])
      .filter((zone) => zone.active && zone.parentModalId)
      .sort((a, b) => Number(a.depth || 0) - Number(b.depth || 0) || String(a.id).localeCompare(String(b.id)));
  }

  function selectedZone(active) { return nestedZones(active).find((zone) => zone.id === select.value) || null; }

  function ensureOptions(active) {
    const current = select.value;
    const zones = nestedZones(active);
    select.innerHTML = '';
    if (!zones.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = 'No nested Modal'; select.appendChild(option); return;
    }
    for (const zone of zones) {
      const option = document.createElement('option');
      option.value = zone.id;
      option.textContent = zone.id + ' · depth ' + zone.depth + (zone.subworld ? ' · living' : '');
      select.appendChild(option);
    }
    if (zones.some((zone) => zone.id === current)) select.value = current;
  }

  function render() {
    const active = sim();
    if (!active || typeof active.subworldSummary !== 'function') { readout.textContent = 'v0.12 engine not ready'; return; }
    ensureOptions(active);
    const zone = selectedZone(active);
    if (!zone) { readout.textContent = 'Create a nested Modal first, then initialize its bounded living subworld.'; return; }
    if (!zone.subworld) { readout.textContent = zone.id + ' has a nested clock but no living subworld yet.'; return; }

    const summary = active.subworldSummary(zone.id);
    const sw = zone.subworld;
    const security = summary.securityPrograms.length
      ? summary.securityPrograms.map((item) => item.role + ' ' + item.id + ' · known ' + item.knownTargets + ' · actions ' + item.actions).join('\n')
      : 'no security programs';
    const denied = sw.programs.filter((item) => item.kind !== 'security' && item.authorization === 'denied');
    readout.textContent = [
      zone.id + ' · depth ' + zone.depth + ' · local tick ' + summary.tick,
      summary.residents + ' residents · ' + summary.residentInvestigating + ' investigating · ' + summary.residentModelBreaks + ' model breaks',
      summary.activeAnomalies + ' active anomalies · ' + summary.activePrograms + ' active programs · ' + summary.quarantinedPrograms + ' quarantined',
      denied.length + ' denied local program(s)',
      'security: ' + security,
      'receipted local observations ' + summary.metrics.residentObservations + ' · security observations ' + summary.metrics.securityObservations + ' · actions ' + summary.metrics.securityActions,
      'subworld evidence leaks ' + summary.metrics.evidenceLeaks + ' · resets ' + summary.metrics.resets
    ].join('\n');
  }

  function withZone(callback) {
    const active = sim(); if (!active) return;
    const zone = selectedZone(active);
    if (!zone) { status('Create/select a nested Modal first.'); return; }
    try { callback(active, zone); render(); } catch (error) { status('Subworld action rejected: ' + error.message); }
  }

  panel.querySelector('#subworld-init').addEventListener('click', function () {
    withZone(function (active, zone) {
      const sw = active.initializeModalSubworld(zone.id, { population: 4, width: 7, height: 7 });
      status('Initialized ' + zone.id + ' living subworld with ' + sw.residents.length + ' bounded local residents. Nothing outside the Modal learns its state automatically.');
    });
  });

  panel.querySelector('#subworld-anomaly').addEventListener('click', function () {
    withZone(function (active, zone) {
      if (!zone.subworld) active.initializeModalSubworld(zone.id, { population: 4 });
      const sw = zone.subworld;
      const anomaly = active.seedSubworldAnomaly(zone.id, 'local-distortion', { x: Math.floor(sw.width / 2), y: Math.floor(sw.height / 2), radius: 2.4, intensity: 0.9, ttl: 28 });
      status('Seeded ' + anomaly.id + ' inside ' + zone.id + '. Only local residents/security can encounter it unless evidence later leaks outward.');
    });
  });

  panel.querySelector('#subworld-replicator').addEventListener('click', function () {
    withZone(function (active, zone) {
      if (!zone.subworld) active.initializeModalSubworld(zone.id, { population: 4 });
      const sw = zone.subworld;
      const program = active.seedSubworldProgram(zone.id, 'replicator', { x: Math.max(0, sw.width - 2), y: Math.max(0, sw.height - 2), authorization: 'denied', period: 3 });
      status('Seeded denied local replicator ' + program.id + '. It is locally real state, but outer/security layers do not get omniscient access.');
    });
  });

  panel.querySelector('#subworld-warden').addEventListener('click', function () {
    withZone(function (active, zone) {
      if (!zone.subworld) active.initializeModalSubworld(zone.id, { population: 4 });
      const sw = zone.subworld;
      const program = active.deploySecurityProgram(zone.id, 'warden', { x: Math.max(0, sw.width - 3), y: Math.max(0, sw.height - 2), sensorRadius: 3, actionRadius: 2 });
      status('Deployed ' + program.id + ' as a bounded warden in ' + zone.id + '. It can observe/quarantine programs only inside its own jurisdiction and range.');
    });
  });

  panel.querySelector('#subworld-repairer').addEventListener('click', function () {
    withZone(function (active, zone) {
      if (!zone.subworld) active.initializeModalSubworld(zone.id, { population: 4 });
      const sw = zone.subworld;
      const program = active.deploySecurityProgram(zone.id, 'repairer', { x: Math.max(0, Math.floor(sw.width / 2) - 1), y: Math.floor(sw.height / 2), sensorRadius: 3, actionRadius: 2 });
      status('Deployed ' + program.id + ' as a bounded repairer. It can repair seen local anomalies but cannot quarantine programs.');
    });
  });

  select.addEventListener('change', render);
  setInterval(render, 420);
  render();
})();