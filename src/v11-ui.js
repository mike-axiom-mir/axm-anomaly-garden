(function () {
  'use strict';

  const interventionRow = document.querySelector('.intervention-group .button-row');
  const shell = document.querySelector('main.shell');
  if (!interventionRow || !shell) return;

  const button = document.createElement('button');
  button.id = 'nested-modal';
  button.textContent = 'Nest Modal';
  button.title = 'Plant one deterministic repeating subworld inside the deepest active Modal.';
  interventionRow.appendChild(button);

  const panel = document.createElement('section');
  panel.className = 'panel glass nested-modal-panel';
  panel.innerHTML = '<div class="panel-head"><div><p class="eyebrow">SIMULATION INSIDE SIMULATION</p><h2>Modal Tree</h2></div><small>nested local clocks · parent-reset cascades</small></div><div id="nested-modal-tree" class="nested-modal-tree"></div>';
  const footer = shell.querySelector('footer');
  shell.insertBefore(panel, footer || null);
  const tree = panel.querySelector('#nested-modal-tree');

  function sim() { return window.AnomalyGardenActiveSimulation || null; }

  function status(message) {
    const el = document.getElementById('status');
    if (el) el.textContent = message;
  }

  function deepestActiveModal(active) {
    const zones = (active.modalZones || []).filter((zone) => zone.active);
    zones.sort((a, b) => Number(b.depth || 0) - Number(a.depth || 0) || String(b.id).localeCompare(String(a.id)));
    return zones[0] || null;
  }

  function renderNode(node, container) {
    const item = document.createElement('div');
    item.className = 'nested-modal-node depth-' + Math.min(3, Number(node.depth || 0));
    const indent = '↳ '.repeat(Number(node.depth || 0));
    item.textContent = indent + node.id + ' · d' + node.depth + ' · local ' + node.localTick + ' · loops ' + node.iteration + ' · lifetime resets ' + node.lifetimeResets + ' · anchors ' + node.anchors;
    container.appendChild(item);
    for (const child of node.children || []) renderNode(child, container);
  }

  function render() {
    const active = sim();
    tree.innerHTML = '';
    if (!active || typeof active.modalTree !== 'function') {
      tree.textContent = 'v0.11 engine not ready';
      return;
    }
    const roots = active.modalTree();
    if (!roots.length) {
      tree.textContent = 'No Modal exists yet. Plant a root Modal, then nest another layer inside it.';
      return;
    }
    for (const root of roots) renderNode(root, tree);
    const summary = document.createElement('div');
    summary.className = 'nested-modal-summary';
    summary.textContent = (active.metrics.nestedModalsCreated || 0) + ' nested created · ' + (active.metrics.nestedModalResets || 0) + ' nested resets · ' + (active.metrics.nestedParentCascadeResets || 0) + ' parent cascades · ' + (active.metrics.nestedMemoryLeaks || 0) + ' deeper memory leaks';
    tree.appendChild(summary);
  }

  button.addEventListener('click', function () {
    const active = sim();
    if (!active || typeof active.addNestedModal !== 'function') return;
    const parent = deepestActiveModal(active);
    if (!parent) {
      status('Plant a root Modal first. Nested Modals require an existing parent layer.');
      return;
    }
    try {
      const child = active.addNestedModal(parent.id, {
        x: parent.x,
        y: parent.y,
        radius: Math.max(active.config.nestedModalMinRadius, Number(parent.radius) * 0.5),
        period: Math.max(4, Number(parent.period || 12) - 2),
        memoryLeak: Math.min(0.5, Number(parent.memoryLeak || 0.28) + 0.06)
      });
      status('Nested ' + child.id + ' inside ' + parent.id + ' at depth ' + child.depth + '. Its local clock/reset state is bounded inside the parent; leaks are receipted into the outer living layer.');
      render();
    } catch (error) {
      status('Nested Modal rejected: ' + error.message);
    }
  });

  setInterval(render, 420);
  render();
})();
