# Anomaly Garden

> Build a world. Disturb one thing. See what notices.

Anomaly Garden is an offline deterministic causal simulation lab. It separates machine truth from inhabitant perception, preserves causal receipts and abandoned futures, and grows by additive layers rather than pretending every new mechanic was always present.

The browser build has no runtime account, cloud, AI service, package manager, or internet requirement: open `index.html`.

## Current executable stack

- deterministic seeded world + exact RNG save/restore
- 16 outer inhabitants with homes, roles, work, needs, credits, inventory, projects, relationships, institutions, memories, investigations and model-break transitions
- local anomalies and inhabitant-authored tests
- root Modals with repeating resets and receipted memory leakage
- repair programs with off/tolerant/aggressive policies
- checkpoints, rewind, abandoned-future preservation, exact JSON export/import
- exact hot/cold causal history and ancestry lookup
- v0.8 locally-valid machine replication vs shared global viability
- v0.9 lineage-preserving quarantine
- v0.10 Future Explorer with world-digest comparison, intervention divergence, drift alarms, and no-loss archived-future forking
- v0.11 nested Modals with independent local clocks and parent-reset cascades
- v0.12 living nested subworlds with bounded local residents, local anomalies/programs, local replication, and jurisdiction-limited security programs

## v0.12 — living nested subworlds

A living subworld is initialized explicitly on an already-existing nested Modal. It owns a bounded local grid, deterministic local residents, local anomalies, local machine programs, and a seeded local baseline that is restored when the enclosing Modal resets.

Important local transitions still write to the outer causal ledger, so a reset does not erase history.

Local resident state currently includes position, curiosity/skepticism, confidence/discrepancy, local memory, an investigation threshold, investigating state, and local model-break state.

Local anomaly evidence does **not** automatically become outer-world knowledge. Evidence can cross outward only through the explicit deterministic subworld-memory leak path into the existing `inhabitant.modal-memory-leak` mechanism.

## Bounded Agent / security-program ecology

Security is modeled as multiple local programs, not one omniscient controller.

Roles:

- `observer`: observe only
- `warden`: observe + quarantine programs
- `repairer`: observe + repair anomalies
- `custodian`: both action capabilities

Every action must pass four gates:

1. **jurisdiction** — target belongs to the same Modal subworld
2. **capability** — that security role owns the requested action
3. **knowledge** — that security program has actually observed the target
4. **range** — target is within action radius

A failed gate creates a `security.action-blocked` receipt. Quarantine preserves the target program and its lineage; receipts explicitly record `deletionCount: 0`.

This is intentionally different from giving an Agent magical access to all simulator state.

## GitHub-measured v0.12 fixture

`node tools/subworld-security-study.js 12 35`

Each seed contains 4 local residents, one strong `local-distortion`, and one denied local replicator. Only the security condition changes.

| Average at tick 35 | No security | Bounded security |
| --- | ---: | ---: |
| active programs | 3.00 | 2.00 |
| quarantined programs | 0.00 | 1.00 |
| active anomalies | 1.00 | 0.00 |
| local program copies | 32.00 | 1.00 |
| local resident observations | 12.00 | 9.33 |
| local investigations | 0.00 | 0.00 |
| local model breaks | 0.00 | 0.00 |
| security observations | 0.00 | 12.42 |
| security actions | 0.00 | 10.00 |
| evidence leaks outward | 3.42 | 2.67 |

Sample modeled-world digests:

- no security: `49fc8c00`
- bounded security: `ac5835fa`

The narrow measured result is that the explicit bounded-security condition reduced the denied local replication and repaired the seeded local anomaly. It does **not** demonstrate prevention of investigation/model-break transitions because both fixture conditions produced zero.

See `EXPERIMENTS/SUBWORLD_SECURITY_STUDY_001.md`.

## Verification

With Node.js installed:

```bash
npm test
```

GitHub Actions currently runs syntax checks through v0.12, all **ten deterministic regression suites**, plus the retained containment, Future Explorer, nested-Modal, and living-subworld/security study fixtures.

The v0.12 suite checks capability denial, jurisdiction denial, target-not-observed denial, range denial, no-loss quarantine, repair/warden separation, local replication, reset-baseline restoration without history deletion, and exact serialize/restore deterministic continuation.

## Worldglass

The browser exposes machine truth separately from inhabitant perception and now includes replication + containment controls, Modal Tree, Future Explorer, living nested-subworld controls, local anomaly/replicator seeding, warden/repairer deployment, local resident/program/security readouts, and causal receipts.

Browser-script syntax and engine behavior are verified. A trustworthy real-browser visual smoke test is still not claimed complete because the prior container Chromium environment failed around desktop/DBus.

## Truth boundary

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware, or literally awakening. A nested simulation mechanic is not evidence that physical reality is simulated. A conditional Future Explorer branch is not a prediction of the actual future.

Likewise, v0.12 does not establish a universal security rule. Security roles, ranges, anomaly effects, replication timing, reset rules, and resident thresholds are explicit simulation choices.

## Direction

The next Matrix-specific work is to deepen cross-layer movement/handoffs, multiple security jurisdictions/policies/budgets, richer nested tasks/resources, stronger inhabitant experimentation and institutions, and larger-scale causal visualization.

Foundation Planet / Grammar Glass / Holodeck integration remains a separate weekend architecture experiment rather than being mixed into this Matrix lane.

## Agent workflow

Read [`AGENTS.md`](AGENTS.md) before contributing. The repository uses **one chat = one PR lane** so parallel AI work does not silently overwrite another lane.
