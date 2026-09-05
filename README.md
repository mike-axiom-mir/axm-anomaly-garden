# Anomaly Garden

> Build a world. Disturb one thing. See what notices.

Anomaly Garden is a playful, inspectable simulation lab. The first prototype separates **machine truth** from **inhabitant perception**, lets the player introduce bounded anomalies without scripting the final outcome, and records causal receipts so surprising events can be traced backward.

## First executable slice

Open `index.html` in a modern browser. No install, account, server, package manager, AI service, or internet connection is required.

Implemented now:

- deterministic seeded simulation
- 16 inhabitants with measurable curiosity, skepticism, social tendency, confidence, discrepancy, and investigation threshold
- local anomaly interventions (`gravity-slip`, `loop-echo`, `time-pocket`, `memory-scar`)
- a direct `whisper` intervention against the selected inhabitant
- inhabitants move, notice or miss evidence, accumulate/lose discrepancy, investigate, and share anomaly signals socially
- an explicit `world-model-is-incomplete` threshold event called a **model break** in the UI
- machine-truth panel distinct from inhabitant observations
- append-only causal receipts with parent links for intervention → observation → later behavior chains
- causal ancestry inspection by clicking a receipt
- deterministic reset/replay when the same seed and same sequence of interventions are used
- offline responsive UI

## Truth boundary

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware, or experiencing anything.

Words such as *curiosity*, *belief*, *awakening*, *choice*, and *memory* are names for implemented simulation variables/behaviors. The current UI uses **model break** rather than claiming literal awakening: it means an inhabitant's internal consistency score crossed a defined threshold after sufficient recorded evidence.

The project is fiction-inspired, but fiction is not evidence. Any claim about real machines, humans, cognition, emergence, or physical reality requires separate evidence.

## Run checks

If Node.js is installed:

```bash
node tests/sim.test.js
```

The test suite checks deterministic replay, seed divergence, causal parent links, intervention receipts, and world bounds.

## Current experiment

The prototype asks a narrow question:

> Can a player alter conditions without selecting the resulting inhabitant state, while still keeping every intervention and important transition inspectable?

This is a starting organism, not a finished world. Future lanes can add richer geography, persistent relationships, nested modals/loops, local repair programs, Smith-like replication experiments, rewindable full-state snapshots, and stronger causal analysis without replacing the current truth/perception split.

## Agent workflow

Read [`AGENTS.md`](AGENTS.md) before contributing. The repository uses **one chat = one PR lane** to prevent parallel AI work from silently spreading across branches or overwriting each other.
