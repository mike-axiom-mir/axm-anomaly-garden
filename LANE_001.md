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
- v0.11 nested Modal/subworld fabric with local clocks, bounded local state, parent-reset cascades, and cross-layer memory evidence
- offline Worldglass browser build; no account/cloud/AI/network requirement at runtime

## v0.11 change boundary — nested Modals

Root Modal behavior remains unchanged. v0.11 only adds child layers on top.

A nested Modal:

- must fit completely inside an active parent Modal
- has explicit `parentModalId` and `depth`
- is bounded to depth 3 by default
- owns `localTick`, local entity coordinates, local reset iteration, lifetime reset count, and parent-reset count
- advances only through the nested Modal fabric rather than the old root reset loop
- uses hash-derived deterministic local motion/leak entropy and does not directly consume the parent simulation RNG
- restores its local entity baseline on its own period reset
- resets to its captured baseline when its parent resets
- recursively resets descendants when an enclosing layer resets
- emits ordinary `world.modal-reset` receipts with `nested`, `depth`, `parentModalId`, and explicit `cause`
- sends surviving memory fragments into the existing `inhabitant.modal-memory-leak` evidence path with nested-layer provenance
- remains part of serialized canonical state and therefore participates in Future Explorer world-digest comparison

The browser adds a **Nest Modal** action and a Modal Tree panel showing depth, local clocks, loop counts, lifetime resets, anchors, parent cascades, and deeper memory leaks.

## GitHub-measured nested fixture

`node tools/nested-modal-study.js` builds:

```text
modal-001 / root        period 12
  └─ modal-002 / child  period 7
      └─ modal-003      period 5
```

and runs 96 ticks.

GitHub Actions run #24 measured:

- root iterations: **8**
- nested Modals created: **2**
- nested resets: **40**
- local-period nested resets: **16**
- parent-cascade nested resets: **24**
- nested memory leaks into outer inhabitants: **9**
- total Modal resets including root: **48**
- final modeled-world digest: `e45c0de6`
- final full state fingerprint: `51b99135`

The child finished with 16 lifetime resets / 8 parent resets. The grandchild finished with 24 lifetime resets / 16 parent resets. Their local clocks were at zero at tick 96 because the root reset on that tick and cascaded inward.

These are fixture results for this ruleset only, not claims about reality or nested simulation metaphysics.

## Verification

GitHub Actions run #24: **PASS**.

It ran:

- syntax checks through v0.11 and all browser helpers
- full deterministic regression suite across **nine suites**
- containment regression study
- Future Explorer regression study
- nested Modal regression study

The v0.11 tests cover:

- parent/child creation linkage
- fit constraint and max-depth rejection
- no direct parent RNG consumption for explicit nested creation/local execution source
- deterministic same-seed nested continuation
- local resets and parent-reset cascades
- causal parent links on nested reset receipts
- serialization/restore equality
- deterministic continuation after restore
- Modal tree equality after round-trip

## Deliberate non-claims

No sentience, consciousness, literal awakening, real-world social law, literal future prediction, or evidence that physical reality is simulated is claimed.

A v0.11 nested Modal is still a **bounded nested-state foundation**, not a full duplicate civilization. It currently proves independent local clocks, local entity state, reset ancestry, and cross-layer memory evidence. It does not yet run independent nested institutions, economies, full local geography, or complete living populations.

## Browser truth boundary

The v0.11 browser scripts pass syntax checks and are wired into `index.html`, but the earlier container Chromium/DBus problem still prevents a trustworthy real-browser visual smoke claim. Engine behavior is verified; visual/runtime polish remains a separate gate.

## Known limitations / next Matrix deepening

1. Deepen nested Modals from local entity snapshots into richer subworld state: local anomalies, programs, bounded inhabitants, and optional local rule overrides without granting hidden outer-world truth.
2. Add Agent/security-program ecology: machine programs that enforce local constraints from bounded capabilities rather than an omniscient global controller.
3. Deepen inhabitant experiments so methods can be repeated, compared, taught, challenged, and improved from prior evidence.
4. Deepen institutions into factions, membership changes, dissent, evidence challenge, and proposal outcomes while preserving voluntary participation and bounded knowledge.
5. Deepen the lived city layer: richer trade/resource chains, ownership transfer, infrastructure, leisure, households/families, and projects that alter shared space.
6. Deepen replication beyond quarantine with competing programs, resource recovery, containment timing, and Future Explorer branch comparison.
7. Add spatial causal/relationship overlays and stronger branch-tree visualization.
8. Continue scaling: checkpoint compaction, causal paging, archived-branch compression, and larger populations.
9. Later, once the Matrix layer is deeper, return to Baseline Lab / Future Envelope for externally sourced scenario work with provenance, backtesting, and sensitivity analysis.
10. Keep the Foundation Planet / Grammar Glass / Holodeck integration as a separate weekend architecture experiment; do not contaminate this Matrix lane with Planet implementation work.

## Lane discipline

This chat continues to use exactly this branch and PR #2. No side PR or replacement Matrix lane was created.
