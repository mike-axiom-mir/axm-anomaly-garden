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

`npm test` runs sixteen regression entrypoints spanning the original world, productive life, institutions, causal history, replication/containment, Future Explorer, nested Modals, living subworld security, cross-layer gates, local economy, civilization behavior, completion integrity, offline browser wiring and clean external package consumption.

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

Read [`AGENTS.md`](AGENTS.md) before contributing. The historical v0.12 lane record remains in [`LANE_001.md`](LANE_001.md); the final v0.13–v0.16 completion record is [`FINAL_HANDOFF.md`](FINAL_HANDOFF.md).
