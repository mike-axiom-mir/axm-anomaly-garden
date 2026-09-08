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

## v0.12 change boundary — living subworld + security ecology

v0.12 stays additive over v0.11. Root and nested Modal clock/reset semantics remain underneath it. A living subworld is initialized explicitly on an existing nested Modal rather than silently changing every Modal.

A living nested subworld owns:

- bounded local grid
- deterministic local residents with local perception, memory, discrepancy, investigation and model-break state
- local anomalies
- local machine programs
- locally-valid local replication
- reset-to-seeded-baseline state when the enclosing Modal resets
- global causal receipts for major local transitions so reset does not erase history
- evidence leakage into the existing outer `inhabitant.modal-memory-leak` path only through an explicit deterministic leak gate

### Bounded Agent/security programs

Security roles are capability bundles rather than omniscient controllers:

- `observer` → observe only
- `warden` → observe + quarantine programs
- `repairer` → observe + repair anomalies
- `custodian` → both action capabilities

A security action is admitted only if all gates pass:

1. **jurisdiction** — same Modal subworld
2. **capability** — role actually owns the action
3. **knowledge** — target has been observed by that program
4. **range** — target is inside action radius

Blocked attempts receive `security.action-blocked` receipts with the failed gate. Program quarantine is no-loss: the target remains retained with lineage and `deletionCount: 0`.

Worldglass adds a living-subworld panel with controls to initialize a nested local world, seed a local anomaly/replicator, and deploy bounded warden/repairer programs.

## GitHub-measured v0.12 comparison

`node tools/subworld-security-study.js 12 35`

Each of 12 seeds contains 4 local residents, one strong local anomaly, and one denied replicator. Only the security condition changes.

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

Sample world digests:

- no security: `49fc8c00`
- bounded security: `ac5835fa`

The measured result supports only a narrow claim inside this ruleset: bounded security strongly reduced the denied local replication and repaired the seeded anomaly. It does **not** support a claim that security prevented local investigations/model breaks, because both conditions measured zero of those transitions.

See `EXPERIMENTS/SUBWORLD_SECURITY_STUDY_001.md`.

## Verification

GitHub Actions run #34 on head `33edd06...`: **PASS**.

It ran:

- syntax checks through v0.12 and browser helpers
- full deterministic regression suite across **ten suites**
- containment regression study
- Future Explorer regression study
- nested Modal regression study
- living-subworld/security comparison study

The v0.12 tests cover:

- deterministic same-seed living-subworld continuation
- nested-only initialization boundary
- local anomaly evidence receipts
- explicit capability denial
- cross-Modal jurisdiction denial
- no-omniscience / target-not-observed gate
- action-range denial
- no-loss program quarantine
- repairer/warden capability separation
- executable local replication
- Modal reset restoring seeded local state without erasing history
- exact serialization and deterministic continuation

## Deliberate non-claims

No sentience, consciousness, literal awakening, real-world social law, literal future prediction, evidence that physical reality is simulated, or universal security theorem is claimed.

The v0.12 local residents are bounded simulation actors. Security roles, sensing ranges, anomaly effects, replication periods, reset rules, and thresholds are explicit model choices.

## Browser truth boundary

The v0.12 browser scripts pass syntax checks and are wired into `index.html`, but the earlier container Chromium/DBus problem still prevents a trustworthy real-browser visual smoke claim. Engine behavior is verified; visual/runtime polish remains a separate gate.

## Next Matrix deepening

1. Let bounded local residents/programs cross between compatible Modal layers through explicit gates rather than teleporting state.
2. Add richer Agent/security ecology: multiple jurisdictions, handoff/escalation, competing policies, limited budgets, and appeal/repair paths without a single global controller.
3. Give nested subworlds richer local tasks/resources and small economies without duplicating the entire outer civilization engine at once.
4. Deepen inhabitant experiments so methods can be repeated, taught, challenged, and improved from prior evidence.
5. Deepen institutions into factions, dissent, evidence challenge, membership changes, and proposal outcomes while preserving bounded knowledge.
6. Deepen replication beyond quarantine with competing programs, resource recovery, containment timing, and Future Explorer comparison.
7. Add stronger spatial causal/relationship overlays and branch-tree visualization.
8. Continue scaling: checkpoint compaction, causal paging, archived-branch compression, and larger populations.
9. Later return to Baseline Lab / Future Envelope for sourced scenario work with provenance/backtesting/sensitivity analysis.
10. Keep Foundation Planet / Grammar Glass / Holodeck integration as the separate weekend architecture experiment; do not contaminate this Matrix lane with Planet implementation work.

## Lane discipline

This chat continues to use exactly this branch and PR #2. No side PR or replacement Matrix lane was created.
