(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenActionFeedback = api;
  if (root && root.document) api.install(root.document);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const heldPattern = /\b(rejected|failed|blocked|not found|not ready|unavailable|requires?|occupied|no checkpoint|no living|no usable|must)\b/i;
  const readyPattern = /\b(reset|quiet garden|initializ)/i;

  function classify(message, running) {
    const text = String(message || '');
    if (heldPattern.test(text)) return 'held';
    if (running) return 'running';
    if (/\bpaused\b/i.test(text)) return 'paused';
    if (readyPattern.test(text)) return 'ready';
    return 'recorded';
  }

  function stateLabel(state) {
    return {
      held: 'HELD',
      paused: 'PAUSED',
      ready: 'READY',
      recorded: 'RECORDED',
      running: 'RUNNING'
    }[state] || 'RECORDED';
  }

  function nextAction(state) {
    return {
      held: 'Read the reason, satisfy the prerequisite, then try again.',
      paused: 'Step once, inspect a receipt, or continue the clock.',
      ready: 'Choose a preset or disturb one condition.',
      recorded: 'Run or step the clock to observe consequences.',
      running: 'Watch the Garden; pause when a receipt deserves inspection.'
    }[state] || 'Inspect the visible evidence before the next action.';
  }

  function install(doc) {
    const panel = doc.getElementById('action-pulse');
    const source = doc.getElementById('status');
    const message = doc.getElementById('action-pulse-message');
    const state = doc.getElementById('action-pulse-state');
    const clock = doc.getElementById('action-pulse-clock');
    const next = doc.getElementById('action-pulse-next');
    const tick = doc.getElementById('tick');
    const run = doc.getElementById('run');
    const pause = doc.getElementById('pause');
    if (!panel || !source || !message || !state || !clock || !next || !tick || !run || !pause) return null;

    function syncStatus() {
      const current = classify(source.textContent, doc.body.classList.contains('running'));
      panel.dataset.state = current;
      state.textContent = stateLabel(current);
      message.textContent = source.textContent;
      next.textContent = 'Next: ' + nextAction(current);
    }

    function syncClock() {
      const running = doc.body.classList.contains('running');
      clock.textContent = (running ? 'ADVANCING' : 'HELD') + ' · T' + tick.textContent;
      run.disabled = running;
      pause.disabled = !running;
      run.setAttribute('aria-pressed', running ? 'true' : 'false');
      pause.setAttribute('aria-pressed', running ? 'false' : 'true');
      if (running && panel.dataset.state !== 'held') {
        panel.dataset.state = 'running';
        state.textContent = stateLabel('running');
        next.textContent = 'Next: ' + nextAction('running');
      }
    }

    new MutationObserver(function () { syncStatus(); syncClock(); }).observe(source, { childList: true, characterData: true, subtree: true });
    new MutationObserver(function () { syncStatus(); syncClock(); }).observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncClock).observe(tick, { childList: true, characterData: true, subtree: true });
    syncStatus();
    syncClock();
    return { syncStatus, syncClock };
  }

  return { classify, stateLabel, nextAction, install };
});
