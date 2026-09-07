# Lane 001 — First Garden Heartbeat → Bounded Causal Civilization

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
- narrative-derived action proposals that carry no machine-truth fields, remain probabilistic/voluntary, can be disabled, and redirect only phase-appropriate time
- institution sessions use the inhabitant's own retained evidence rather than privileged anomaly access
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
- command-line repair-policy, productive-life, long-run, institution, replication, containment, and future-comparison experiments
- runtime receipt/agent/place/anomaly indexes that preserve the exact state result while reducing long-run lookup cost
- exact cold-history chunks that remove old receipt objects from the hot graph while preserving ids, payloads, parents, causal lookup, export/import, and canonical fingerprint
- optional v0.8 machine replicator with off/bounded/open admission, local-validity receipts, shared system load, budget refusal, and globally visible strain anomalies when open replication exceeds capacity
- optional v0.9 lineage-preserving quarantine that disables contained copies without deleting their parent-linked replication history, retains their occupied cells, and emits explicit containment-cycle receipts with residual strain still visible
- v0.10 Future Explorer that lists retained futures, compares two trajectories, separates world digest from full administrative fingerprint, reports the first differing non-administrative intervention/receipt, and can safely fork an archived future while preserving both the source archive and the previous current future
- Worldglass exposes replication/quarantine controls plus a branch-tree Future Explorer surface

## Deliberate non-claims

No sentience, consciousness, genuine belief, genuine curiosity, literal awakening, real-world social law, or literal future prediction is claimed. These are implemented simulation variables, transition rules, and conditional trajectories only.

## Verification performed

```bash
npm test
node --check src/sim.js
node --check src/v07.js
node --check src/v08.js
node --check src/v09.js
node --check src/v10.js
node --check src/app.js
node tools/compare-repair-policies.js
node tools/batch-policy-study.js 24
node tools/institution-action-study.js 24
node tools/history-compaction-study.js
node tools/replication-study.js 24 120
node tools/containment-study.js 24 120
node tools/future-explorer-study.js
```

Current deterministic test suite: **PASS on GitHub Actions across eight suites**.

### Current GitHub-measured containment study

- no containment: 45 active, load 1.35, viability 0.32, 17.00 strain events
- quarantine: 21 active + 35.38 quarantined, load 0.63, viability 0.93, 3.29 strain events
- investigations: 3.63 → 0.42
- model breaks: 3.42 → 0.25

The stale pre-reconstruction local figures were intentionally replaced by these repository-measured values.

### Future Explorer regression fixture

The deterministic two-future fixture produced:

- archived Future A world digest: `b2f8df94`
- current Future B world digest: `0727b8fc`
- first differing interventions were identified from their actual intervention receipts
- forking Future A preserved Future B as `branch-002`
- restored Future A matched its source modeled-world digest exactly before new fork/archive receipts were appended
- Future A remained archived after the fork rather than being consumed

The full source fingerprint can differ after restoration because archive/control history changes. v0.10 therefore exposes a separate **world digest** that excludes branch/receipt administration and uses that for modeled-world equivalence.

## Browser truth boundary

The earlier headless Chromium attempt in this environment hung before rendering due to the container desktop/DBus setup. Engine behavior, browser-script syntax, and Future Explorer logic are verified, but a real-browser visual/runtime smoke test remains a separate gate and is not silently claimed complete.

## Known limitations

- geography remains a compact grid rather than a full lived city/world
- schedules, roles, workplace production, credits, inventories, repeated meetings, and multi-day projects now exist, but the economy is deliberately tiny: no prices beyond one food resource, no trade network, no firms, no families, and no inheritance yet
- social topology is persistent but still simple; institutions have explicit fixed frames/thresholds rather than evolved governance or internal factions
- Modal reset behavior currently targets position/discrepancy/memory-fragment mechanics, not a full nested subworld snapshot
- repair programs act only on anomaly objects, not every possible inconsistent state
- causal links cover major transitions but are not yet a complete provenance edge for every numeric state change
- Future Explorer identifies tracked intervention divergence and world-state divergence, but it deliberately refuses to invent a cause when identical tracked interventions lead to different world digests
- JSON saves support exact tuple-encoded cold causal history, but the cold format is still JSON text rather than a final binary/page-indexed archive
- quarantine is reactive and deliberately imperfect; early strain remains in the causal record
- the Future Explorer UI has not yet received a real-browser visual smoke test

## Next useful deepening

1. Build the **Baseline Lab / Future Envelope**: admit an external starting state with per-field provenance and confidence (`observed`, `estimated`, `contested`, `unknown`), then branch conditional futures without turning uncertain inputs into facts.
2. Add backtesting: start from an older known baseline, run the model forward, and compare its envelope with the historical outcome before trusting it for real scenario work.
3. Add sensitivity analysis so Future Explorer can show which assumptions/interventions actually control an outcome and which conclusions survive across many plausible baselines.
4. Deepen the productive-life layer into richer resource chains, leisure choices, trade, ownership transfer, and projects that can alter the shared world.
5. Deepen inhabitant-authored experiments so investigators can repeat tests, compare results, share methods, and design stronger tests from prior evidence.
6. Deepen institutions into internal factions, membership change, evidence challenge, dissent, cross-institution debate, and proposal outcomes while preserving bounded knowledge and voluntary participation.
7. Add nested Modal state snapshots with per-zone clocks and richer reset semantics.
8. Deepen the replication lab beyond quarantine with competing programs, resource recovery, containment timing strategies, and Future Explorer branch comparison.
9. Add spatial causal overlays and relationship-line visualization in Worldglass.
10. Continue scaling work: checkpoint compaction, causal paging, archived-branch compression, and multi-population benchmarks.

## Lane discipline

This chat continues to use exactly this branch and PR. No side PRs or replacement lanes were created.
