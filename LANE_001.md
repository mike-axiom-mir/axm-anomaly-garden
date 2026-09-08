# Lane 001 — First Garden Heartbeat → Nested Causal Civilization

Branch: `build/first-garden-2026-09-05`

## Goal

Grow one truthful playable causal world without rebuilding or splitting this chat across PRs. Each layer stays inspectable, deterministic where claimed, and additive unless a measured reason justifies changing an older boundary.

## Current GitHub-verified executable stack

- deterministic seeded world + exact RNG restore
- lived inhabitants: homes, roles, work, hunger, credits, inventory, projects, meetings
- persistent relationship topology and bounded social evidence exchange
- anomalies, investigation, inhabitant-authored tests, and model-break transitions
- bounded institutions with source-linked reports, explicit narratives, voluntary proposals, and no raw Worldglass access
- root Modals with repeating resets and receipted memory leakage
- repair programs with off/tolerant/aggressive policies
- full checkpoints, rewind, abandoned-future preservation, and exact JSON state restore
- exact hot/cold causal history with ancestry lookup and fingerprint preservation
- v0.8 locally-valid machine replication vs global shared-load viability
- v0.9 lineage-preserving quarantine with retained occupied cells and no deletion
- v0.10 Future Explorer with world-digest comparison, first-intervention divergence, no-loss archived-future forking, and same-intervention drift alarms
- v0.11 nested Modal fabric with local clocks, bounded local state, parent-reset cascades, and cross-layer memory evidence
- v0.12 living nested subworlds with local residents/anomalies/programs plus bounded security-program ecology
- offline Worldglass browser build; no account/cloud/AI/network requirement at runtime

## v0.12 change boundary

v0.12 stays additive over v0.11. Root and nested Modal clock/reset semantics remain underneath it. A living subworld is initialized explicitly on an existing nested Modal rather than silently changing every Modal.

A living nested subworld owns a bounded local grid, deterministic local residents, local anomalies, local machine programs, locally-valid local replication, reset-to-seeded-baseline state, global causal receipts that survive reset, and explicit evidence leakage into the outer memory path.

### Bounded Agent/security programs

Security roles are capability bundles rather than omniscient controllers:

- `observer` → observe only
- `warden` → observe + quarantine programs
- `repairer` → observe + repair anomalies
- `custodian` → both action capabilities

A security action passes only after jurisdiction, capability, knowledge, and range gates all succeed. Failed attempts emit `security.action-blocked`. Quarantine retains target lineage and records `deletionCount: 0`.

## GitHub-measured v0.12 comparison

`node tools/subworld-security-study.js 12 35`

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

Sample world digests: no security `49fc8c00`; bounded security `ac5835fa`.

The narrow result is that bounded security reduced the denied local replication and repaired the seeded anomaly. It does **not** show prevention of investigation/model-break transitions because both conditions measured zero.

## Verification

GitHub Actions run #34: **PASS** on the v0.12 browser/test head.

- syntax through v0.12 + browser helpers
- full deterministic regression suite across **ten suites**
- containment study
- Future Explorer study
- nested Modal study
- living-subworld/security comparison study

v0.12 tests cover deterministic continuation, nested-only initialization, local evidence, capability denial, cross-Modal jurisdiction denial, target-not-observed denial, action-range denial, no-loss quarantine, role separation, local replication, reset-baseline restoration without history deletion, and exact serialization/restore.

## Deliberate non-claims

No sentience, consciousness, literal awakening, real-world social law, literal future prediction, evidence that physical reality is simulated, or universal security theorem is claimed. v0.12 residents and security programs are bounded simulation actors under explicit model rules.

## Browser truth boundary

The v0.12 browser scripts pass syntax checks and are wired into `index.html`, but the earlier container Chromium/DBus problem still prevents a trustworthy real-browser visual smoke claim. Engine behavior is verified; visual/runtime polish remains separate.

## Next Matrix deepening

1. Cross-layer movement/handoff through explicit gates rather than teleporting state.
2. Multiple security jurisdictions, policy handoffs/escalation, limited budgets, and repair/appeal paths without a global controller.
3. Richer local tasks/resources and small economies inside nested subworlds.
4. Stronger inhabitant experiments and institution dissent/evidence challenge.
5. Replication competition/resource recovery/containment timing with Future Explorer comparison.
6. Better spatial causal/relationship overlays and larger-scale history storage.
7. Keep Foundation Planet / Grammar Glass / Holodeck as the separate weekend architecture experiment.

## Lane discipline

This chat continues to use exactly this branch and PR #2. No side PR or replacement Matrix lane was created.
