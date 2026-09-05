# Lane 001 — First Garden Heartbeat → Persistent Causal World

Branch: `build/first-garden-2026-09-05`

## Goal

Turn the empty repository into a truthful playable simulation foundation with enough persistent machinery that later lanes can deepen the world rather than rebuild it.

## Executable behavior now

- deterministic seeded world and state fingerprint
- 16 inhabitants with independent measurable internal variables
- local anomaly injection and targeted whisper intervention
- evidence observation and missed observations
- discrepancy accumulation/decay
- investigation and model-break thresholds
- investigator-authored tests against anomalies and repeating Modals
- persistent relationship topology with trust/familiarity/signal state
- social anomaly sharing constrained by relationship + physical proximity
- repeating Modal zones with anchored inhabitants and configurable memory leakage
- local repair programs with off/tolerant/aggressive policies
- repair actions alter real anomaly state and emit receipts
- append-only causal receipts on the current branch with ancestor traversal
- full-state checkpoints and rewind
- abandoned-future branch archive retained during rewind
- exact RNG state capture/restoration
- complete JSON export/import and deterministic continuation after restore
- dual Worldglass view: inhabitant layer vs machine truth
- offline browser interface with no runtime dependency or network requirement
- reproducible browser experiment presets
- command-line single-seed and 24-seed repair-policy experiments

## Deliberate non-claims

No sentience, consciousness, genuine belief, genuine curiosity, literal awakening, or real-world social law is claimed. These are implemented simulation variables and transitions only.

## Verification performed

```bash
node tests/sim.test.js
node --check src/sim.js
node --check src/app.js
node tools/compare-repair-policies.js
node tools/batch-policy-study.js 24
```

Current deterministic test suite: **PASS**.

The 24-seed study is recorded in `EXPERIMENTS/REPAIR_POLICY_STUDY_001.md` with explicit scope limits.

## Browser truth boundary

The earlier headless Chromium attempt in this environment hung before rendering due to the container desktop/DBus setup. Engine behavior and JavaScript syntax are verified, but a real-browser visual/runtime smoke test remains a separate gate and is not silently claimed complete.

## Known limitations

- geography remains a compact grid rather than a lived city/world
- inhabitants do not yet have schedules, jobs, needs, institutions, families, inventories, or long-term projects
- social topology is persistent but still simple
- Modal reset behavior currently targets position/discrepancy/memory-fragment mechanics, not a full nested subworld snapshot
- repair programs act only on anomaly objects, not every possible inconsistent state
- causal links cover major transitions but are not yet a complete provenance edge for every numeric state change
- abandoned futures are preserved, but there is not yet a dedicated browser for opening and comparing archived branches side-by-side
- JSON saves are complete current-state archives, not compressed long-term storage
- UI has not yet received the real-browser visual smoke test described above

## Next useful deepening

1. Add real daily-life loops: needs, schedules, locations, work/play/rest, social meetings.
2. Deepen inhabitant-authored experiments so investigators can repeat tests, compare results, share methods, and design stronger tests from prior evidence.
3. Add institutions and competing narratives without giving any one institution perfect global truth.
4. Add nested Modal state snapshots with per-zone clocks and richer reset semantics.
5. Add a branch-tree browser so archived futures can be reopened, compared, and forked without replacing canonical state.
6. Add resource budgets and Smith-style replication experiments with locally valid but globally harmful transitions.
7. Add richer repair-program strategies and compare suppression, tolerance, quarantine, explanation, and coexistence.
8. Add spatial causal overlays and relationship-line visualization in Worldglass.
9. Add preset batch runners and side-by-side scenario comparison so browser experiments can be repeated rather than merely planted.
10. Add longer-run performance tests and state compression before population/world scale increases.

## Lane discipline

This chat continues to use exactly this branch and PR. No side PRs or replacement lanes were created.
