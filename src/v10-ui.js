(function () {
  'use strict';

  const anchor = document.querySelector('.lower-grid');
  if (!anchor) return;

  const panel = document.createElement('section');
  panel.className = 'panel glass future-explorer';
  panel.innerHTML = [
    '<div class="panel-head future-head">',
    '<div><p class="eyebrow">CAUSAL FUTURE EXPLORER</p><h2>Retained timelines</h2></div>',
    '<small>compare branches without rewriting them</small>',
    '</div>',
    '<div class="future-toolbar">',
    '<label>A <select id="future-a"></select></label>',
    '<label>B <select id="future-b"></select></label>',
    '<button id="future-compare">Compare</button>',
    '<button id="future-fork" class="primary">Fork B → current</button>',
    '</div>',
    '<div class="future-layout">',
    '<div><h3>Branch tree</h3><div id="future-tree" class="future-tree"></div></div>',
    '<div><h3>Comparison</h3><div id="future-comparison" class="future-comparison"></div></div>',
    '</div>'
  ].join('');
  anchor.insertAdjacentElement('afterend', panel);

  const aSelect = panel.querySelector('#future-a');
  const bSelect = panel.querySelector('#future-b');
  const compareButton = panel.querySelector('#future-compare');
  const forkButton = panel.querySelector('#future-fork');
  const treeEl = panel.querySelector('#future-tree');
  const comparisonEl = panel.querySelector('#future-comparison');

  const style = document.createElement('style');
  style.textContent = '.future-explorer{margin-top:.8rem}.future-head{margin-bottom:.65rem}.future-toolbar{display:flex;gap:.55rem;flex-wrap:wrap;align-items:end;margin-bottom:.8rem}.future-toolbar label{display:grid;gap:.25rem;color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}.future-toolbar select{min-width:190px;background:rgba(0,0,0,.28);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:.55rem}.future-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.8rem}.future-layout h3{margin:.15rem 0 .55rem;color:var(--mint);font-size:.74rem;text-transform:uppercase;letter-spacing:.1em}.future-tree,.future-comparison{display:grid;gap:.45rem;max-height:420px;overflow:auto}.future-card,.future-diff{border:1px solid var(--line);border-radius:11px;padding:.65rem;background:rgba(0,0,0,.16)}.future-card.current{border-color:rgba(141,255,194,.55)}.future-card strong,.future-diff strong{display:block;font-size:.78rem}.future-card small,.future-diff small{display:block;color:var(--muted);font-size:.67rem;margin-top:.18rem}.future-card code,.future-diff code{color:var(--mint);font-size:.68rem}.future-warning{border-color:rgba(255,216,141,.4);color:var(--amber)}.future-danger{border-color:rgba(255,159,172,.45);color:var(--danger)}.future-metrics{display:grid;grid-template-columns:1fr auto;gap:.22rem .7rem;font-size:.7rem}.future-metrics span{color:var(--muted)}@media(max-width:900px){.future-layout{grid-template-columns:1fr}.future-toolbar label{width:100%}.future-toolbar select{width:100%}}';
  document.head.appendChild(style);

  function sim() { return window.AnomalyGardenActiveSimulation || null; }
  function status(message) { const el = document.getElementById('status'); if (el) el.textContent = message; }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]; }); }

  function refreshMainWorldglass() {
    const person = document.querySelector('.person');
    if (person && typeof person.click === 'function') person.click();
  }

  function optionLabel(future) {
    return (future.id === 'current' ? 'CURRENT' : future.id) + ' · t' + future.tick + ' · ' + future.worldDigest;
  }

  function renderSelectors(futures) {
    const oldA = aSelect.value || 'current';
    const oldB = bSelect.value || (futures.length > 1 ? futures[futures.length - 1].id : 'current');
    for (const select of [aSelect, bSelect]) select.innerHTML = '';
    for (const future of futures) {
      for (const select of [aSelect, bSelect]) {
        const option = document.createElement('option');
        option.value = future.id;
        option.textContent = optionLabel(future);
        select.appendChild(option);
      }
    }
    aSelect.value = futures.some((f) => f.id === oldA) ? oldA : 'current';
    const preferredB = futures.some((f) => f.id === oldB) ? oldB : (futures.length > 1 ? futures[futures.length - 1].id : 'current');
    bSelect.value = preferredB;
    forkButton.disabled = bSelect.value === 'current';
  }

  function renderTree(futures) {
    treeEl.innerHTML = '';
    for (const future of futures) {
      const card = document.createElement('button');
      card.className = 'future-card' + (future.id === 'current' ? ' current' : '');
      card.innerHTML = '<strong>' + escapeHtml(future.id === 'current' ? '● Current canonical future' : '○ ' + future.id) + '</strong>' +
        '<small>tick ' + future.tick + ' · ' + escapeHtml(future.reason) + '</small>' +
        '<small>world <code>' + escapeHtml(future.worldDigest) + '</code> · full <code>' + escapeHtml(future.fingerprint) + '</code></small>' +
        '<small>model breaks ' + future.modelBreaks + ' · investigations ' + future.investigating + ' · programs ' + future.activePrograms + ' + ' + future.quarantinedPrograms + 'Q</small>';
      card.addEventListener('click', function () { bSelect.value = future.id; forkButton.disabled = future.id === 'current'; compare(); });
      treeEl.appendChild(card);
    }
    if (futures.length === 1) {
      const hint = document.createElement('div'); hint.className = 'future-card';
      hint.innerHTML = '<strong>No archived futures yet</strong><small>Create a checkpoint, run a path, then rewind. The abandoned path will appear here instead of disappearing.</small>';
      treeEl.appendChild(hint);
    }
  }

  function divergenceHtml(divergence) {
    if (!divergence) return '';
    if (divergence.kind === 'intervention-divergence') {
      const a = divergence.a;
      const b = divergence.b;
      return '<div class="future-diff future-warning"><strong>First intervention divergence</strong>' +
        '<small>A: ' + (a ? escapeHtml(a.kind) + ' @ t' + a.tick + ' · ' + escapeHtml(a.receiptId || 'no receipt') : 'no further intervention') + '</small>' +
        '<small>B: ' + (b ? escapeHtml(b.kind) + ' @ t' + b.tick + ' · ' + escapeHtml(b.receiptId || 'no receipt') : 'no further intervention') + '</small>' +
        '<small>shared non-administrative interventions: ' + divergence.commonInterventions + '</small></div>';
    }
    if (divergence.kind === 'state-divergence-with-same-interventions') {
      return '<div class="future-diff future-danger"><strong>State diverged with the same intervention history</strong><small>Do not invent a cause. This is a signal to inspect hidden nondeterminism, model-version differences, or an untracked state transition.</small></div>';
    }
    if (divergence.kind === 'administrative-divergence') {
      return '<div class="future-diff"><strong>Same modeled world, different archive/control history</strong><small>World digests match. Full fingerprints differ because receipts, branch archives, or other administrative state differ.</small></div>';
    }
    return '<div class="future-diff"><strong>Equivalent at current comparison depth</strong><small>No modeled world or intervention divergence detected.</small></div>';
  }

  function compare() {
    const active = sim();
    if (!active || typeof active.compareFutures !== 'function') return;
    const result = active.compareFutures(aSelect.value, bSelect.value);
    if (!result) return;
    const keys = ['awakenings','investigations','production','socialMeetings','projectsCompleted','strainEvents','containmentCycles','replicatorsQuarantined'];
    const rows = keys.map(function (key) { return '<span>' + escapeHtml(key) + ' (B−A)</span><strong>' + result.metricDelta[key] + '</strong>'; }).join('');
    comparisonEl.innerHTML = divergenceHtml(result.divergence) +
      '<div class="future-diff"><strong>A · ' + escapeHtml(result.a.id) + '</strong><small>world ' + result.a.worldDigest + ' · full ' + result.a.fingerprint + ' · t' + result.a.tick + '</small></div>' +
      '<div class="future-diff"><strong>B · ' + escapeHtml(result.b.id) + '</strong><small>world ' + result.b.worldDigest + ' · full ' + result.b.fingerprint + ' · t' + result.b.tick + '</small></div>' +
      '<div class="future-diff"><strong>Metric delta</strong><div class="future-metrics">' + rows + '</div></div>';
    forkButton.disabled = bSelect.value === 'current';
  }

  function render() {
    const active = sim();
    if (!active || typeof active.listFutures !== 'function') {
      treeEl.innerHTML = '<div class="future-card"><strong>Future Explorer engine not ready</strong></div>';
      return;
    }
    const futures = active.listFutures();
    renderSelectors(futures);
    renderTree(futures);
    compare();
  }

  compareButton.addEventListener('click', compare);
  aSelect.addEventListener('change', compare);
  bSelect.addEventListener('change', function () { forkButton.disabled = bSelect.value === 'current'; compare(); });
  forkButton.addEventListener('click', function () {
    const active = sim();
    const branchId = bSelect.value;
    if (!active || branchId === 'current' || typeof active.forkFromArchivedFuture !== 'function') return;
    const result = active.forkFromArchivedFuture(branchId);
    if (!result) { status('Future fork failed: archived branch not found.'); return; }
    status('Forked ' + branchId + ' into canonical play. Previous current future was preserved as ' + result.preservedCurrentBranchId + '. Source branch was not consumed.');
    refreshMainWorldglass();
    render();
  });

  setInterval(render, 700);
  render();
})();
