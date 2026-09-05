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


## v0.6 → v0.6.1 index optimization receipt

The institution layer increased retained history and exposed repeated linear scans as a measurable bottleneck. A same-seed comparison was then run with seed `long-run-v06` and the same 2,000-tick intervention pattern.

| Same run | v0.6 before runtime indexes | v0.6.1 after runtime indexes |
| --- | ---: | ---: |
| final fingerprint | `150d2391` | `150d2391` |
| receipts | 14,809 | 14,809 |
| production | 288.5448 | 288.5448 |
| social meetings | 209 | 209 |
| projects completed | 147 | 147 |
| institution reports | 1,361 | 1,361 |
| institution narrative changes | 6 | 6 |
| institution broadcasts | 498 | 498 |
| elapsed wall clock in this container | 28.20 s | 10.87 s |
| peak process RSS | 166,132 KB | 143,956 KB |

The exact same fingerprint and high-level state metrics matter more than the speedup: this was an implementation-path optimization, not a rules change. Runtime-only maps now index receipts, inhabitants, places, institutions, and anomaly/Modal creation receipts. Full history is still retained.

The timing/memory values remain environment-specific engineering measurements, not portable performance claims.
