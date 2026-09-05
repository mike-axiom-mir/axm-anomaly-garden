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
| anomaly observations | 476.71 | 186.29 | 23.79 |
| investigations | 13.00 | 6.00 | 0.21 |
| model breaks | 12.79 | 5.67 | 0.08 |
| social signals | 116.71 | 37.04 | 1.79 |
| repair actions | 0.00 | 10.00 | 8.00 |
| modal memory leaks | 13.92 | 13.21 | 13.63 |
| inhabitant-authored tests | 70.42 | 35.17 | 1.42 |
| workplace production | 13.17 | 16.29 | 18.62 |
| social meetings | 6.92 | 11.38 | 19.21 |
| projects completed | 0.50 | 1.25 | 1.46 |
| resources acquired | 13.04 | 14.63 | 15.13 |
| resources used | 23.92 | 25.38 | 25.50 |
| causal receipts | 753.83 | 353.79 | 122.17 |

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

The table above was rerun again after v0.5 added productive work, hunger, credits, owned/consumed resources, repeated social meetings, and long-running personal projects. Those additions changed random-consumption order and routine state, so the measured cascade changed again. The v0.4, v0.3, and v0.2 measurements remain in Git history; the current document always reports the current engine rather than freezing a prettier past result.
