# Lane 001 — First Garden Heartbeat

Branch: `build/first-garden-2026-09-05`

## Goal

Turn the empty repository into a truthful playable simulation skeleton rather than a lore-only concept.

## Executable behavior

- deterministic seeded world
- independent inhabitant state variables
- local anomaly injection
- evidence observation and missed observations
- discrepancy accumulation/decay
- investigation threshold
- social anomaly sharing
- model-break threshold after multiple memories
- causal receipts and ancestor traversal
- dual Worldglass view: inhabitant layer vs machine truth

## Deliberate non-claims

No sentience, consciousness, genuine belief, genuine curiosity, or real awakening is claimed. These are simulated variables and transitions only.

## Checks

`node tests/sim.test.js`

## Known limitations

- movement is a simple grid walk
- social interaction has no durable relationship graph yet
- full world snapshots are not persisted to disk
- replay is deterministic only when the same seed and same ordered interventions are repeated
- anomaly placement is simulation-seeded and intervention parameters are fixed/recorded; exact replay still requires repeating the same ordered player actions at the same ticks
- causal links are intentionally sparse in v0; not every state change has a parent edge yet

## Next useful experiments

1. Add export/import of a run receipt ledger.
2. Add full-state checkpoints and rewind.
3. Add a loop/modal zone with configurable memory persistence.
4. Add local repair nodes and compare suppression vs tolerance of anomalies.
5. Add replication capability experiments with resource/invariant budgets.
6. Add relationship persistence so ideas can propagate through actual social topology.
