# Experiment 003 — 2,000-Tick Long-Run Smoke

Status: **single-run engineering smoke test, not a performance benchmark**

This experiment asks whether the current v0.5 state model can run long enough for many days of routine life, repeated interventions, social meetings, and project completions without violating its basic deterministic/state invariants.

## Setup

- seed: `long-run-v05`
- repair policy: `tolerant`
- one Modal centered at `(5,4)`
- one anomaly injected every 120 ticks, alternating `loop-echo` and `gravity-slip`
- total simulation length: 2,000 ticks
- Node.js process measured with `/usr/bin/time`

## Observed result

- completed tick: **2,000**
- final state fingerprint: **`bc74695a`**
- causal receipts retained: **6,836**
- cumulative workplace production: **285.349**
- repeated social meetings: **221**
- personal projects completed: **146**
- archived rewind branches: **0**
- elapsed wall-clock time in this container: **11.82 seconds**
- peak process RSS reported by `/usr/bin/time`: **129,800 KB**

## What this supports

The current small-world implementation can survive a 2,000-tick deterministic run with thousands of retained causal receipts and persistent productive/social/project state.

## What this does not support

The timing and memory numbers are **not** portable performance claims. They include Node.js/runtime overhead and depend on the execution environment. The RSS value is process peak memory, not a direct measurement of receipt storage alone.

## Scaling signal

The important engineering signal is that the current implementation keeps full receipts and rich state in ordinary in-memory JavaScript objects. That is intentionally simple for inspectability, but it will become expensive as population, timeline length, archived futures, and causal detail grow.

Before attempting very large worlds, useful next work includes:

- bounded hot-state vs cold-history storage
- checkpoint compaction
- receipt indexing instead of repeated linear scans
- causal-history paging
- archived-branch compression
- performance tests at multiple population sizes

The goal is to preserve truth/replay while avoiding a giant memory snowball.
