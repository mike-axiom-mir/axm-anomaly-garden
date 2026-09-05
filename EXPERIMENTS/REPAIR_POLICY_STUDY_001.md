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
| anomaly observations | 367.00 | 144.58 | 22.04 |
| investigations | 9.71 | 4.83 | 0.17 |
| model breaks | 9.50 | 4.71 | 0.08 |
| social signals | 64.46 | 25.17 | 0.42 |
| repair actions | 0.00 | 10.00 | 8.00 |
| modal memory leaks | 14.17 | 15.88 | 14.21 |
| inhabitant-authored tests | 53.46 | 30.13 | 1.50 |
| causal receipts | 526.29 | 241.00 | 57.96 |

Additional counts across 24 runs:

- repair off: 0/24 runs without model breaks; 0/24 without investigations
- tolerant repair: 0/24 runs without model breaks; 0/24 without investigations
- aggressive repair: 22/24 runs without model breaks; 20/24 without investigations

## What this result does support

Inside **this exact implemented model**, aggressive repair usually removes anomaly evidence before enough of it accumulates to produce investigation and social cascades. Tolerant repair reduces discovery pressure but does not normally erase it. With repair disabled, anomaly evidence persists long enough to create substantially more observations, investigations, model breaks, and social propagation.

The Modal memory-leak mechanic remains active under every policy. Inhabitants that enter investigation can also run their own tests, which adds a third route for evidence to strengthen or weaken discrepancy. Repair programs currently repair anomaly objects, not Modal memory fragments or test results, so these mechanisms remain intentionally distinct.

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


## Revision note

The table above was rerun after v0.3 added inhabitant-authored tests. The earlier v0.2 measurements were intentionally replaced rather than preserved as if the engine had not changed. Git history retains the earlier result if comparison is needed.
