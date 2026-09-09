# Portable engine consumer

Anomaly Garden's completed v0.16 simulation can be consumed as a CommonJS library or a deterministic JSON command without copying its engine files. The package remains private to prevent accidental registry publication; `npm pack` creates an explicit local tarball that can be installed without network access.

## Build and install locally

```bash
npm pack --pack-destination ./dist
npm install --ignore-scripts --no-audit --no-fund ./dist/axm-anomaly-garden-0.16.0.tgz
```

The tarball contains only the engine chain, portable runner, capability record, license/provenance files and this consumer guide. Browser UI, tests, experiments, GitHub configuration and lane records remain repository surfaces.

## Library

```js
const { GardenSimulation } = require('axm-anomaly-garden');
const { runScenario, verifyReceipt } = require('axm-anomaly-garden/runner');

const simulation = new GardenSimulation({ seed: 'my-world' });
simulation.run(10);

const receipt = runScenario({
  schema: 'axm.anomaly-garden.run-request/v1',
  scenario: 'completion-v0.16',
  seed: 'consumer-proof',
  ticks: 28
});
verifyReceipt(receipt);
```

## Command

```bash
anomaly-garden describe
anomaly-garden run --seed consumer-proof --ticks 28 > receipt.json
anomaly-garden verify receipt.json
```

`verify` checks the canonical receipt SHA-256 and then fully re-executes the declared seed, scenario and tick count. Altered or even re-sealed false results fail because they do not match replay. Requests reject unknown fields, unsupported scenarios, control characters, non-integer ticks and work above the 1,000-tick bound.

The package requires Node.js 18 or newer and has no runtime dependencies, network calls, account, telemetry, AI model or cloud service.

## Truth boundary

Replay proves deterministic agreement with this packaged Anomaly Garden engine and scenario. It does not prove real-world truth, consciousness, authorship, safety, good strategy or compatibility with another simulation engine. SHA-256 detects drift; it is not a signature. Packaging does not publish, adopt, merge or declare the engine CANON.
