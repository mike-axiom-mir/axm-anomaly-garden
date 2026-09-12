# Anomaly Garden

> Build a world. Disturb one thing. See what notices.

Anomaly Garden is an offline deterministic causal simulation lab. It separates machine truth from inhabitant perception, preserves causal receipts and abandoned futures, and grows by additive layers rather than pretending every new mechanic was always present.

The browser build has no runtime account, cloud, AI service, package manager, or internet requirement: open `index.html`.

## Completion state — v0.16

v0.16 is the completion boundary for this repository. It is not a claim that every imaginable simulation feature exists; it means the intended Matrix/living-civilization lane now has an executable end-to-end form, deterministic regression coverage, a bounded stress study, and a browser-facing Worldglass control surface. New feature work is not part of the completion plan. Future changes should be maintenance, repair, or deliberately opened new work.

The executable stack now includes:

- deterministic seeded world + exact RNG save/restore
- outer inhabitants with homes, roles, work, needs, credits, inventory, projects, relationships, institutions, memories, investigations and model-break transitions
- anomalies and inhabitant-authored tests
- root Modals plus nested Modals with independent clocks, reset cascades and receipted memory leakage
- repair programs and explicit repair policies
- checkpoints, rewind, abandoned-future preservation and exact JSON export/import
- hot/cold causal history and ancestry lookup
- locally-valid machine replication versus shared viability
- lineage-preserving quarantine with no deletion
- Future Explorer with world-digest comparison, intervention divergence and archived-future forking
- living nested subworlds with local residents, anomalies, programs and bounded security
- explicit parent/child cross-layer gates for resident transit and source-linked evidence handoff
- local food/energy/material economies, tasks, treasury and voluntary resident credit transfer
- local security policy with role admission, finite budgets and explicit action costs
- repeated resident experiments that can genuinely produce investigations and local model-break states
- source-linked local assemblies that preserve disagreement without access to raw machine truth
- resource-aware local replication, explicit resource pressure and deterministic resource recovery
- pure Worldglass integrity observation plus an explicit causally-receipted completion audit
- a multi-layer completion scenario and bounded multi-seed completion stress study

## v0.13 — explicit cross-layer movement

Living subworlds no longer need state to appear to teleport between layers. A gate can connect only directly related living parent/child Modals. Gates have an explicit direction, access radius and per-tick capacity.

`transitResident(...)` moves the resident itself, preserving identity, memory and transit history. `handoffResidentEvidence(...)` can pass only evidence already present in that resident's memory. The target receives a source-linked packet, not Worldglass/machine truth.

Gate fingerprints use an explicit canonical tuple, so logically identical save/restore state is not affected by JavaScript object key insertion order.

## v0.14 — local economy and budgeted governance

Every living subworld can maintain explicit food, energy and material stock plus a treasury. Residents have deterministic occupations and can perform bounded tasks. Missing inputs block the task rather than creating resources silently. Resident credit transfer is explicit and voluntary.

Security remains an ecology rather than one omniscient controller. Local policy can admit or deny roles, and security programs receive finite local budgets. Quarantine and repair consume explicit budget; exhausted programs are blocked with a causal receipt instead of acting for free.

## v0.15 — experiments, dissent and resource pressure

A resident can experiment on an anomaly only after actually observing it. Repeated deterministic experiments produce source-linked evidence and can now drive real local investigation and model-break transitions.

The Local Inquiry Assembly constructs reports from resident memory and inbound source-linked evidence. Reports explicitly exclude raw machine truth and can preserve competing stances rather than collapsing disagreement into one narrative. Follow-up proposals remain voluntary.

Local replicators consume material and energy. If the required stock is absent, the copy is blocked with a `resource-pressure` receipt. Recovery is explicit rather than an invisible refill.

## v0.16 — completion / integrity surface

`plantCompletionScenario()` creates an end-to-end nested scenario with two living subworlds, a real cross-layer gate, anomalies, allowed and denied replicators, local economies and budgeted security.

`worldIntegrityReport()` is a **pure observer**. Reading Worldglass or taking snapshots does not increment audit counters or change canonical state. It checks the important cross-layer invariants: unique identities, no active+quarantined program contradiction, finite non-negative budgets/resources, source-linked evidence boundaries, direct living gate endpoints and gate capacity.

`runCompletionAudit()` is the explicit mutating action. It increments audit metrics and writes a causal `world.completion-audit` receipt.

Root `addAnomaly()` and `addModal()` interventions admit every supplied numeric option before consuming RNG, identifiers, receipts or live state. Non-finite values fail with `AXM_INTERVENTION_NUMBER_INVALID` and identify the rejected field; finite values retain the established defaulting, clamping and integer-period behavior.

The browser includes a final Living Matrix panel for planting the completion scenario, running a resident task, convening an assembly, attempting gate transit, running the explicit integrity audit and reading the selected subworld's economy/security/institution state.

## Bounded security truth boundary

Security roles remain capability bundles:

- `observer`: observe only
- `warden`: observe + quarantine programs
- `repairer`: observe + repair anomalies
- `custodian`: both action capabilities

Before an action succeeds, the target must pass jurisdiction, capability, knowledge and range checks; v0.14 additionally requires enough explicit local budget. Quarantine retains the target program and lineage and records `deletionCount: 0`.

No security program receives magical access to all simulator state.

## Consume the deterministic engine outside this checkout

The completed v0.16 engine now has a bounded CommonJS package and JSON command
surface. `npm pack` creates a local, dependency-free tarball; the package stays
private so it cannot be published to a registry accidentally. External
consumers can import `GardenSimulation`, run the declared completion scenario,
and verify a receipt through full deterministic re-execution without copying
the version-layer source chain.

```bash
npm pack --pack-destination ./dist
npm install --ignore-scripts --no-audit --no-fund \
  ./dist/axm-anomaly-garden-0.16.0.tgz
npx --no-install anomaly-garden run --seed consumer-proof --ticks 28 > receipt.json
npx --no-install anomaly-garden verify receipt.json
```

See [`PACKAGE_CONSUMER.md`](PACKAGE_CONSUMER.md) for offline installation,
library entrypoints, request limits, and the exact truth boundary.

## Verification

With Node.js installed:

```bash
npm test
npm run study:completion
```

`npm test` runs twenty-four regression entrypoints spanning the original world, root intervention admission, productive life, institutions, causal history, replication/containment, Future Explorer, nested Modals, living subworld security, cross-layer gates, local economy, civilization behavior, completion integrity, offline browser wiring, the Living City realization, visible action feedback and clean external package consumption.

`npm run study:completion` runs the v0.16 scenario across multiple deterministic seeds and fails if any integrity audit fails, save/restore fingerprints diverge, resident experiments/investigations/model breaks never occur, assemblies never occur, or the explicit resident transit fails to occur once per seed.

GitHub Actions also runs the retained containment, Future Explorer, nested-Modal and subworld-security studies.

The browser contract test verifies that `index.html` loads the latest v0.16 engine before the controller and that every runtime script/stylesheet reference is local and present. This is executable wiring verification, not a claim of a human pixel-by-pixel visual review on every browser/OS.

## Worldglass

Worldglass intentionally keeps two different things separate:

- **machine layer:** simulator state, anomalies, programs, gates, receipts and integrity evidence
- **inhabitant layer:** only what simulated perception, memory, experiments and source-linked social/institutional evidence make available

The completion surface exposes enough of the nested system to operate and inspect the intended lane without silently granting inhabitants machine truth.

## Non-claims

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware or literally awakening. A nested simulation mechanic is not evidence that physical reality is simulated. Future Explorer branches are conditional simulated histories, not predictions of the actual future.

Likewise, the security/economy/institution results are properties of these explicit model rules, not universal laws about real societies or security systems.

## Architecture boundary

Anomaly Garden is the Matrix/living-civilization layer. Foundation Planet, Grammar Glass and Holodeck remain separate architecture layers rather than being folded into this repository merely to make one monolith.

## Maintenance boundary

The feature lane ends at v0.16. Preserve these invariants when repairing the repository:

- determinism for claimed deterministic paths
- exact save/restore continuation
- causal/source provenance
- machine-truth versus perception separation
- explicit cross-layer gates instead of teleporting state
- bounded jurisdiction/capability/knowledge/range/budget for security actions
- no-loss quarantine/history
- source-linked institutions with no raw Worldglass access
- pure observation: read-only Worldglass methods must not mutate canonical state
- rejected root interventions must not consume RNG, identifiers, receipts or canonical state

Read [`AGENTS.md`](AGENTS.md) before contributing. The historical v0.12 lane record remains in [`LANE_001.md`](LANE_001.md); the final v0.13–v0.16 completion record is [`FINAL_HANDOFF.md`](FINAL_HANDOFF.md).

## Matrix world realization — September 2026

The app now opens on a stylized isometric city. Inhabitants visibly walk, work, rest, socialize and investigate according to their recorded state. Follow a resident's real route and destination, watch the camera move to actual world changes, inspect live building stock, or use the navigator, pan and zoom controls. Code view exposes program generations, security knowledge, anomaly strength and institutional narratives.

**Seed living worlds** creates the existing completion scenario. Nested worlds have deterministic depth-specific palettes and architecture; choose one from the World menu or select an enterable portal. **Inject glitch** creates a real anomaly through the existing simulation control. Repair, experiments, memory, model breaks, program copies, quarantine and institutional updates appear when their source state changes.

The expandable **laboratory** retains the exact map, simulation settings, checkpoint/rewind, import/export, evidence and gate actions. City architecture, rain and lighting are presentation; they do not add simulation facts. Viewing another layer does not move a resident. This is a 2.5D realization, not a full 3D game.

See [LIVING_CITY_V1.md](LIVING_CITY_V1.md) for the current expression contract and acceptance evidence. [CITY_REALIZATION.md](CITY_REALIZATION.md) preserves the original gap analysis and earlier browser evidence.

## Earlier animation pass — September 2026

The animation lane adds persistent, state-driven world markers and separate nested-world maps. Consecutive ticks interpolate between recorded positions; skipped ticks, rewinds and imported worlds snap to their recorded state. Anomaly and Modal animation plays while the world is running. Use **Motion → Reduced**, or the operating system's reduced-motion preference, to disable motion. Selecting a nested resident shows its recorded hypothesis and memory count.

Living Matrix actions now refresh the main map and fingerprint immediately. Rendering never advances simulation time or consumes its RNG. The v0.16 engine rules are unchanged.

`npm test` includes the dependency-free renderer regression. An optional DOM integration check can be run with `node tests/dom-integration.cjs` when `jsdom` is installed for development; `AXM_JSDOM_PATH` may point to an external installation. The app itself still opens offline without installing packages.

Browser follow-up: the managed preview successfully rendered the outer and nested worlds. Run advanced the world with visible inhabitant movement; Pause held tick 74; checkpoint/rewind returned to tick 74; Reduced Motion was selectable; the live integrity audit passed with zero errors and warnings. Mobile layout and frame-rate smoothness were not measured.

For development preview, install development dependencies with `npm ci` and run `npm run dev`. Vite is development-only; the offline runtime remains plain local HTML/CSS/JavaScript.
