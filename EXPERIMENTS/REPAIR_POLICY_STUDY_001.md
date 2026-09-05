# Experiment 001 — Repair Pressure vs Anomaly Discovery

Status: **measured inside the current Anomaly Garden ruleset**

This is not a claim about humans, AI cognition, society, or physical reality. It measures only the simulation currently implemented in this repository.

## Question

If the same perturbations occur in otherwise deterministic seeded worlds, how does local machine repair pressure change the amount of anomaly evidence that reaches inhabitants and propagates through the social fabric?

## Fixed intervention script

For each seed and each repair policy:

1. initialize the same seeded world structure for that policy
2. plant one Modal at `(5,4)` with radius `3.4`, period `11`, memory leak `0.32`
3. add one `loop-echo` anomaly at `(5,4)`
4. run 9 ticks
5. whisper to inhabitant 1
6. run 13 ticks
7. add one `gravity-slip` anomaly at `(7,3)`
8. run 58 ticks
9. collect metrics at tick 80

Only the repair policy differs: `off`, `tolerant`, or `aggressive`.

## 24-seed batch result

Command:

```bash
node tools/batch-policy-study.js 24
```

| Metric average | Repair off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| anomaly observations | 364.63 | 138.04 | 19.79 |
| investigations | 9.88 | 4.54 | 0.08 |
| model breaks | 9.75 | 4.04 | 0.00 |
| social signals | 62.33 | 16.33 | 0.13 |
| repair actions | 0.00 | 10.00 | 8.00 |
| modal memory leaks | 15.04 | 13.67 | 13.79 |
| causal receipts | 475.63 | 198.63 | 53.79 |

Additional counts across 24 runs:

- repair off: 0/24 runs without model breaks; 0/24 without investigations
- tolerant repair: 1/24 runs without model breaks; 0/24 without investigations
- aggressive repair: 24/24 runs without model breaks; 22/24 without investigations

## What this result does support

Inside **this exact implemented model**, aggressive repair usually removes anomaly evidence before enough of it accumulates to produce investigation and social cascades. Tolerant repair reduces discovery pressure but does not normally erase it. With repair disabled, anomaly evidence persists long enough to create substantially more observations, investigations, model breaks, and social propagation.

The Modal memory-leak mechanic remains active under every policy. This matters because the repair programs currently repair anomaly objects, not Modal memory fragments. The simulation therefore has two different routes by which discrepancy can enter an inhabitant state.

## What this result does not support

This experiment does not establish that:

- suppression causes curiosity in real people
- censorship or control has any particular real-world social effect
- consciousness emerges from discrepancy
- AI systems naturally behave like these inhabitants
- the Matrix franchise describes real machine architecture
- less repair is inherently better

Those would require different evidence entirely.

## Why keep this experiment

It is a useful regression target. Future changes to repair programs, perception, social topology, memory, or Modal behavior can rerun this study and show whether the causal character of the garden changed.
