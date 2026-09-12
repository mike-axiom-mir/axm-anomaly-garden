'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, text) {
  fs.writeFileSync(path, text, 'utf8');
}

function replaceOnce(path, from, to, alreadyPresent) {
  const text = read(path);
  if (alreadyPresent && text.includes(alreadyPresent)) return;
  const first = text.indexOf(from);
  const last = text.lastIndexOf(from);
  if (first < 0 || first !== last) {
    throw new Error(`${path}: expected exactly one reconciliation anchor`);
  }
  write(path, text.replace(from, to));
}

replaceOnce(
  'index.html',
  '  <link rel="stylesheet" href="styles-v16.css">\n  <link rel="stylesheet" href="styles-animation.css">',
  '  <link rel="stylesheet" href="styles-v16.css">\n  <link rel="stylesheet" href="styles-action-feedback.css">\n  <link rel="stylesheet" href="styles-animation.css">',
  'styles-action-feedback.css',
);

const actionPulse = `  <section id="action-pulse" class="action-pulse glass" data-state="ready" aria-label="Current simulation action">
    <span class="action-pulse-orb" aria-hidden="true"></span>
    <div class="action-pulse-copy">
      <span class="action-pulse-label">CURRENT LOOP</span>
      <strong id="action-pulse-state">READY</strong>
      <span id="action-pulse-message" role="status" aria-live="polite" aria-atomic="true">Worldglass is preparing the deterministic world.</span>
    </div>
    <div class="action-pulse-context" aria-hidden="true">
      <strong id="action-pulse-clock">PAUSED · T0</strong>
      <span id="action-pulse-next">Next: choose a preset or disturb one condition.</span>
    </div>
  </section>`;
replaceOnce(
  'index.html',
  '  </main>\n\n  <script src="src/sim.js"></script>',
  `  </main>\n\n${actionPulse}\n\n  <script src="src/sim.js"></script>`,
  'id="action-pulse"',
);
replaceOnce(
  'index.html',
  '  <script src="src/v16-ui.js"></script>\n  <script src="src/subworld-visuals.js"></script>',
  '  <script src="src/v16-ui.js"></script>\n  <script src="src/action-feedback.js"></script>\n  <script src="src/subworld-visuals.js"></script>',
  'src/action-feedback.js',
);

const stopBlock = `  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    document.body.classList.remove('running');
  }
`;
const pauseBlock = `${stopBlock}
  function pause() {
    stop();
    setStatus('World paused at tick ' + sim.tick + '. Canonical state is held; step once, inspect evidence, or continue the clock.');
  }
`;
replaceOnce('src/app.js', stopBlock, pauseBlock, 'function pause()');
replaceOnce(
  'src/app.js',
  "  document.getElementById('pause').addEventListener('click', stop);",
  "  document.getElementById('pause').addEventListener('click', pause);",
  "document.getElementById('pause').addEventListener('click', pause);",
);

const packagePath = 'package.json';
const pkg = JSON.parse(read(packagePath));
pkg.main = './src/v16.js';
pkg.exports = {
  '.': './src/v16.js',
  './runner': './src/portable-runner.js',
  './capability.json': './capability.json',
};
pkg.bin = { 'anomaly-garden': './bin/anomaly-garden.cjs' };
pkg.engines = { node: '>=18' };
pkg.files = [
  'bin/anomaly-garden.cjs',
  'capability.json',
  'PACKAGE_CONSUMER.md',
  'THIRD_PARTY.json',
  'src/sim.js',
  'src/v07.js',
  'src/v08.js',
  'src/v09.js',
  'src/v10.js',
  'src/v11.js',
  'src/v12.js',
  'src/v13.js',
  'src/v14.js',
  'src/v15.js',
  'src/v16.js',
  'src/portable-runner.js',
];
const testEntrypoints = [
  'tests/sim.test.js',
  'tests/intervention-admission.test.js',
  'tests/life.test.js',
  'tests/institutions.test.js',
  'tests/institution-actions.test.js',
  'tests/history.test.js',
  'tests/replication.test.js',
  'tests/containment.test.js',
  'tests/future-explorer.test.js',
  'tests/nested-modals.test.js',
  'tests/subworld-security.test.js',
  'tests/cross-layer.test.js',
  'tests/local-economy.test.js',
  'tests/civilization.test.js',
  'tests/completion.test.js',
  'tests/browser-contract.test.js',
  'tests/world-renderer.test.js',
  'tests/city-projection.test.js',
  'tests/city-signals.test.js',
  'tests/city-renderer.test.js',
  'tests/living-city.test.js',
  'tests/city-fidelity.test.js',
  'tests/action-feedback.test.js',
  'tests/package-consumer.test.js',
];
pkg.scripts.test = testEntrypoints.map((path) => `node ${path}`).join(' && ');
pkg.scripts['test:package'] = 'node tests/package-consumer.test.js';
write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

replaceOnce(
  'README.md',
  '`runCompletionAudit()` is the explicit mutating action. It increments audit metrics and writes a causal `world.completion-audit` receipt.\n',
  '`runCompletionAudit()` is the explicit mutating action. It increments audit metrics and writes a causal `world.completion-audit` receipt.\n\nRoot `addAnomaly()` and `addModal()` interventions admit every supplied numeric option before consuming RNG, identifiers, receipts or live state. Non-finite values fail with `AXM_INTERVENTION_NUMBER_INVALID` and identify the rejected field; finite values retain the established defaulting, clamping and integer-period behavior.\n',
  'AXM_INTERVENTION_NUMBER_INVALID',
);

const packageSection = `## Consume the deterministic engine outside this checkout

The completed v0.16 engine now has a bounded CommonJS package and JSON command
surface. \`npm pack\` creates a local, dependency-free tarball; the package stays
private so it cannot be published to a registry accidentally. External
consumers can import \`GardenSimulation\`, run the declared completion scenario,
and verify a receipt through full deterministic re-execution without copying
the version-layer source chain.

\`\`\`bash
npm pack --pack-destination ./dist
npm install --ignore-scripts --no-audit --no-fund \\
  ./dist/axm-anomaly-garden-0.16.0.tgz
npx --no-install anomaly-garden run --seed consumer-proof --ticks 28 > receipt.json
npx --no-install anomaly-garden verify receipt.json
\`\`\`

See [\`PACKAGE_CONSUMER.md\`](PACKAGE_CONSUMER.md) for offline installation,
library entrypoints, request limits, and the exact truth boundary.

`;
replaceOnce('README.md', '## Verification\n', `${packageSection}## Verification\n`, '## Consume the deterministic engine outside this checkout');

let readme = read('README.md');
readme = readme.replace(/`npm test` runs [^\n]+\n/, '`npm test` runs twenty-four regression entrypoints spanning the original world, root intervention admission, productive life, institutions, causal history, replication/containment, Future Explorer, nested Modals, living subworld security, cross-layer gates, local economy, civilization behavior, completion integrity, offline browser wiring, the Living City realization, visible action feedback and clean external package consumption.\n');
if (!readme.includes('rejected root interventions must not consume RNG')) {
  const anchor = '- pure observation: read-only Worldglass methods must not mutate canonical state\n';
  if (!readme.includes(anchor)) throw new Error('README.md: maintenance invariant anchor missing');
  readme = readme.replace(anchor, `${anchor}- rejected root interventions must not consume RNG, identifiers, receipts or canonical state\n`);
}
write('README.md', readme);

console.log(`growth integration reconciliation: PASS (${testEntrypoints.length} npm test entrypoints)`);
