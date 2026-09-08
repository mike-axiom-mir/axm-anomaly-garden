(function () {
  'use strict';

  const shell = document.querySelector('main.shell');
  if (!shell) return;

  const panel = document.createElement('section');
  panel.className = 'panel glass completion-panel';
  panel.innerHTML = [
    '<div class="panel-head">',
      '<div><p class="eyebrow">WORLDGLASS · COMPLETION SURFACE</p><h2>Living Matrix</h2></div>',
      '<small>transit · economy · experiments · dissent · bounded security · integrity</small>',
    '</div>',
    '<div class="completion-controls">',
      '<select id="completion-subworld-select" aria-label="living subworld"></select>',
      '<button id="completion-plant">Plant Full Scenario</button>',
      '<button id="completion-task">Run Resident Task</button>',
      '<button id="completion-assembly">Convene Assembly</button>',
      '<button id="completion-transit">Transit At Gate</button>',
      '<button id="completion-audit">Run Integrity Audit</button>',
    '</div>',
    '<pre id="completion-readout" class="completion-readout">v0.16 engine not ready.</pre>'
  ].join('');

  const footer = shell.querySelector('footer');
  shell.insertBefore(panel, footer || null);

  const select = panel.querySelector('#completion-subworld-select');
  const readout = panel.querySelector('#completion-readout');

  function sim() { return window.AnomalyGardenActiveSimulation || null; }
  function status(message) { const el = document.getElementById('status'); if (el) el.textContent = message; }

  function livingZones(active) {
    return (active && active.modalZones || [])
      .filter((zone) => zone.active && zone.subworld)
      .sort((a, b) => Number(a.depth || 0) - Number(b.depth || 0) || String(a.id).localeCompare(String(b.id)));
  }

  function ensureOptions(active) {
    const current = select.value;
    const zones = livingZones(active);
    select.innerHTML = '';
    if (!zones.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No living subworld';
      select.appendChild(option);
      return;
    }
    zones.forEach((zone) => {
      const option = document.createElement('option');
      option.value = zone.id;
      option.textContent = zone.id + ' · depth ' + zone.depth;
      select.appendChild(option);
    });
    if (zones.some((zone) => zone.id === current)) select.value = current;
  }

  function selectedZone(active) {
    return livingZones(active).find((zone) => zone.id === select.value) || livingZones(active)[0] || null;
  }

  function formatEconomy(economy) {
    if (!economy) return 'economy unavailable';
    const stock = economy.stock || {};
    return 'food ' + Number(stock.food || 0) + ' · energy ' + Number(stock.energy || 0) + ' · material ' + Number(stock.material || 0) + ' · treasury ' + Number(economy.treasury || 0);
  }

  function render() {
    const active = sim();
    if (!active || typeof active.worldIntegrityReport !== 'function') {
      readout.textContent = 'v0.16 engine not ready.';
      return;
    }
    ensureOptions(active);
    const overview = active.worldglassOverview();
    const audit = active.worldIntegrityReport();
    const zone = selectedZone(active);
    const lines = [
      'v' + active.version + ' · tick ' + active.tick + ' · fingerprint ' + active.stateFingerprint(),
      'integrity ' + (audit.pass ? 'PASS' : 'FAIL') + ' · errors ' + audit.errors.length + ' · warnings ' + audit.warnings.length,
      'world: ' + overview.totals.residents + ' local residents · ' + overview.totals.experiments + ' experiments · ' + overview.totals.modelBreaks + ' model breaks · ' + overview.totals.assemblies + ' assemblies',
      'fabric: ' + overview.gates.length + ' cross-layer gate(s) · ' + overview.totals.activePrograms + ' active programs · ' + overview.totals.quarantinedPrograms + ' quarantined'
    ];
    if (zone) {
      const summary = active.subworldSummary(zone.id);
      const latestInstitution = summary.institutions && summary.institutions[0];
      lines.push('selected ' + zone.id + ' · depth ' + zone.depth + ' · local tick ' + summary.tick);
      lines.push(formatEconomy(summary.economy));
      lines.push('residents ' + summary.residents + ' · investigating ' + summary.residentInvestigating + ' · model breaks ' + summary.residentModelBreaks + ' · inbound evidence ' + Number(summary.inboundEvidence || 0));
      lines.push('security ' + summary.securityPrograms.map((program) => program.role + ':' + program.budget).join(', ') || 'security none');
      lines.push('institution ' + (latestInstitution ? ((latestInstitution.latestNarrative || 'no report yet') + ' · reports ' + latestInstitution.reports + ' · proposals ' + latestInstitution.proposals) : 'none'));
    } else {
      lines.push('Plant Full Scenario to create a two-level living nested world with a real transit gate.');
    }
    if (!audit.pass) lines.push('first integrity error: ' + JSON.stringify(audit.errors[0]));
    readout.textContent = lines.join('\n');
  }

  panel.querySelector('#completion-plant').addEventListener('click', function () {
    const active = sim();
    if (!active || typeof active.plantCompletionScenario !== 'function') return;
    try {
      const planted = active.plantCompletionScenario();
      ensureOptions(active);
      select.value = planted.child.id;
      status('Planted full v0.16 scenario: nested living worlds, explicit gate, local economy, anomaly evidence, replicators, and budgeted security.');
      render();
    } catch (error) {
      status('Completion scenario rejected: ' + error.message);
    }
  });

  panel.querySelector('#completion-task').addEventListener('click', function () {
    const active = sim();
    const zone = active && selectedZone(active);
    if (!zone || !zone.subworld.residents.length) { status('No living resident available for a local task.'); return; }
    const resident = zone.subworld.residents[0];
    try {
      const result = active.performSubworldTask(zone.id, resident.id, resident.occupation || 'forage');
      status(result.type === 'subworld.task-completed' ? resident.id + ' completed ' + result.payload.task + '.' : resident.id + ' task blocked: ' + result.payload.reason + '.');
      render();
    } catch (error) {
      status('Resident task rejected: ' + error.message);
    }
  });

  panel.querySelector('#completion-assembly').addEventListener('click', function () {
    const active = sim();
    const zone = active && selectedZone(active);
    if (!zone) { status('No living subworld available for an assembly.'); return; }
    try {
      const report = active.conveneSubworldAssembly(zone.id);
      status('Assembly report: ' + report.narrative + ' · source-linked evidence ' + report.sourceReceiptIds.length + ' · dissent ' + report.dissent + '.');
      render();
    } catch (error) {
      status('Assembly rejected: ' + error.message);
    }
  });

  panel.querySelector('#completion-transit').addEventListener('click', function () {
    const active = sim();
    const zone = active && selectedZone(active);
    if (!zone) { status('No living subworld selected.'); return; }
    const gate = (active.subworldGates || []).find((item) => item.active && (item.from.modalId === zone.id || (item.bidirectional && item.to.modalId === zone.id)));
    if (!gate) { status('Selected subworld has no usable cross-layer gate.'); return; }
    const endpoint = gate.from.modalId === zone.id ? gate.from : gate.to;
    const residents = zone.subworld.residents.slice().sort((a, b) => {
      const da = Math.hypot(Number(a.x) - Number(endpoint.x), Number(a.y) - Number(endpoint.y));
      const db = Math.hypot(Number(b.x) - Number(endpoint.x), Number(b.y) - Number(endpoint.y));
      return da - db || String(a.id).localeCompare(String(b.id));
    });
    if (!residents.length) { status('No resident available at this gate.'); return; }
    try {
      const receipt = active.transitResident(gate.id, residents[0].id, zone.id);
      if (receipt.type === 'subworld.resident-transited') status(receipt.payload.residentId + ' crossed ' + gate.id + ' into ' + receipt.payload.toModalId + '; memory and identity were preserved.');
      else status('Transit blocked: ' + receipt.payload.reason + '. Move/let the resident reach the gate first.');
      render();
    } catch (error) {
      status('Transit rejected: ' + error.message);
    }
  });

  panel.querySelector('#completion-audit').addEventListener('click', function () {
    const active = sim();
    if (!active) return;
    const report = active.runCompletionAudit();
    status('Integrity audit ' + (report.pass ? 'PASS' : 'FAIL') + ': ' + report.errors.length + ' error(s), ' + report.warnings.length + ' warning(s). Audit was causally receipted.');
    render();
  });

  select.addEventListener('change', render);
  setInterval(render, 650);
  render();
})();