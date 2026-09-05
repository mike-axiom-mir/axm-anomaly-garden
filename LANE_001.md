# Lane 001 — First Garden Heartbeat → Persistent Causal World

Branch: `build/first-garden-2026-09-05`

## Goal

Turn the empty repository into a truthful playable simulation foundation with enough persistent machinery that later lanes can deepen the world rather than rebuild it.

## Executable behavior now

- deterministic seeded world and state fingerprint
- 16 inhabitants with independent measurable internal variables
- persistent homes, roles, shared workplaces/social places, 48-tick day cycle, planned activity, energy, social need, and hunger
- workplace production and stock, personal credits/inventory, resource acquisition/use, repeated social meetings, and role-shaped multi-day projects that create owned artifacts
- routine-following movement with investigation-driven deviation from planned life
- local anomaly injection and targeted whisper intervention
- evidence observation and missed observations
- discrepancy accumulation/decay
- investigation and model-break thresholds
- investigator-authored tests against anomalies and repeating Modals
- persistent relationship topology with trust/familiarity/signal/meeting state
- bounded institutions with membership, source-linked reports, evidence accumulation, competing narrative frames, and periodic broadcasts without raw machine truth
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
- command-line repair-policy, productive-life, long-run, and institution-narrative experiments
- runtime receipt/agent/place/anomaly indexes that preserve the exact state result while reducing long-run lookup cost

## Deliberate non-claims

No sentience, consciousness, genuine belief, genuine curiosity, literal awakening, or real-world social law is claimed. These are implemented simulation variables and transitions only.

## Verification performed

```bash
npm test
node --check src/sim.js
node --check src/app.js
node tools/compare-repair-policies.js
node tools/batch-policy-study.js 24
```

Current deterministic test suite: **PASS**.

The 24-seed study is recorded in `EXPERIMENTS/REPAIR_POLICY_STUDY_001.md` with explicit scope limits. Productive-life tradeoff, bounded-institution narrative distributions, and 2,000-tick scaling/optimization notes are recorded separately under `EXPERIMENTS/`.

## Browser truth boundary

The earlier headless Chromium attempt in this environment hung before rendering due to the container desktop/DBus setup. Engine behavior and JavaScript syntax are verified, but a real-browser visual/runtime smoke test remains a separate gate and is not silently claimed complete.

## Known limitations

- geography remains a compact grid rather than a full lived city/world
- schedules, roles, workplace production, credits, inventories, repeated meetings, and multi-day projects now exist, but the economy is deliberately tiny: no prices beyond one food resource, no trade network, no firms, no families, and no inheritance yet
- social topology is persistent but still simple; institutions have explicit fixed frames/thresholds rather than evolved governance or internal factions
- Modal reset behavior currently targets position/discrepancy/memory-fragment mechanics, not a full nested subworld snapshot
- repair programs act only on anomaly objects, not every possible inconsistent state
- causal links cover major transitions but are not yet a complete provenance edge for every numeric state change
- abandoned futures are preserved, but there is not yet a dedicated browser for opening and comparing archived branches side-by-side
- JSON saves are complete current-state archives, not compressed long-term storage
- UI has not yet received the real-browser visual smoke test described above

## Next useful deepening

1. Deepen the new productive-life layer into multiple task types, richer resource chains, leisure choices, trade, ownership transfer, and projects that can alter the shared world.
2. Deepen inhabitant-authored experiments so investigators can repeat tests, compare results, share methods, and design stronger tests from prior evidence.
3. Deepen institutions into internal factions, membership change, evidence challenge, dissent, and cross-institution debate while preserving bounded knowledge.
4. Add nested Modal state snapshots with per-zone clocks and richer reset semantics.
5. Add a branch-tree browser so archived futures can be reopened, compared, and forked without replacing canonical state.
6. Add resource budgets and Smith-style replication experiments with locally valid but globally harmful transitions.
7. Add richer repair-program strategies and compare suppression, tolerance, quarantine, explanation, and coexistence.
8. Add spatial causal overlays and relationship-line visualization in Worldglass.
9. Add preset batch runners and side-by-side scenario comparison so browser experiments can be repeated rather than merely planted.
10. Continue the scaling work: hot/cold history, checkpoint compaction, causal paging, archived-branch compression, and multi-population benchmarks.

## Lane discipline

This chat continues to use exactly this branch and PR. No side PRs or replacement lanes were created.
