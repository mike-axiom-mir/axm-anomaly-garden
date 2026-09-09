const assert = require('assert');
const fs = require('fs');
const path = require('path');
const feedback = require('../src/action-feedback.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles-action-feedback.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

(function statusClassesPreserveActionMeaning() {
  assert.strictEqual(feedback.classify('World running.', true), 'running');
  assert.strictEqual(feedback.classify('World paused at tick 4.', false), 'paused');
  assert.strictEqual(feedback.classify('No checkpoint exists yet.', false), 'held');
  assert.strictEqual(feedback.classify('Transit blocked: out-of-range.', false), 'held');
  assert.strictEqual(feedback.classify('Nested Modals require an existing parent layer.', false), 'held');
  assert.strictEqual(feedback.classify('Injected gravity-slip.', false), 'recorded');
  assert.strictEqual(feedback.classify('Quiet garden planted.', false), 'ready');
  assert.match(feedback.nextAction('held'), /prerequisite/);
  assert.match(feedback.nextAction('running'), /pause/);
})();

(function browserContractHasPersistentLiveFeedback() {
  for (const id of ['action-pulse', 'action-pulse-state', 'action-pulse-message', 'action-pulse-clock', 'action-pulse-next']) {
    assert(html.includes('id="' + id + '"'), 'missing action feedback target #' + id);
  }
  assert(html.includes('role="status"'));
  assert(html.includes('aria-live="polite"'));
  assert(html.indexOf('src/action-feedback.js') > html.indexOf('src/v16-ui.js'));
  assert(html.includes('styles-action-feedback.css'));
  assert(css.includes('prefers-reduced-motion'));
})();

(function pauseCreatesTruthfulPersistentState() {
  assert.match(app, /World paused at tick/);
  assert.match(app, /addEventListener\('click', pause\)/);
})();

console.log('Anomaly Garden action feedback contract: PASS');
