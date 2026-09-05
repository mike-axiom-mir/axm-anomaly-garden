# Experiment 007 — Locally Valid Replication vs Global Viability

Status: **measured inside Anomaly Garden v0.8.0**

This is a simulation experiment. It is not evidence about real AI, malware, biology, organizations, or physical systems.

## Question

Can every accepted copy transition be locally valid while the accumulated result still damages a shared global system state?

## Model

A single machine-layer replicator is seeded at the center of the world. A copy is locally admissible only when:

- its parent is active
- the target is inside the grid
- the target cell has no active replicator
- the hard instance limit is not exceeded

Three admission policies are compared:

- `off`: the seed exists but does not copy
- `bounded`: locally possible copies are refused if the next copy would exceed the shared load bound
- `open`: locally valid copies may continue beyond the shared load bound up to the hard instance limit

Open replication creates deterministic machine-layer strain anomalies when shared load exceeds the configured strain threshold. Those anomalies then enter the same ordinary observation/investigation mechanics as other local anomalies.

```bash
node tools/replication-study.js 24 120
```

## 24-seed result at tick 120

| Average | Off | Bounded | Open |
| --- | ---: | ---: | ---: |
| programs | 1.00 | 21.00 | 45.00 |
| accepted copies | 0.00 | 20.00 | 44.00 |
| budget refusals | 0.00 | 423.83 | 0.00 |
| final system load | 0.03 | 0.63 | 1.35 |
| viability metric | 1.00 | 0.93 | 0.32 |
| strain events | 0.00 | 0.00 | 17.00 |
| strain anomalies | 0.00 | 0.00 | 17.00 |
| anomaly observations | 0.00 | 0.00 | 280.63 |
| investigations | 0.00 | 0.00 | 5.96 |
| model breaks | 0.00 | 0.00 | 5.88 |

Every `machine.replicator-copied` receipt records `locallyValid: true` and links the child copy to its parent creation receipt. The bounded policy therefore demonstrates refusal based on a shared invariant rather than local impossibility.

## What this supports inside the model

Local transition validity and global viability are different checks. A system that validates only the immediate copy transition can still admit a sequence whose aggregate resource load produces globally harmful state.

## What this does not support

It does not establish a universal rule, prove anything about real autonomous systems, or imply that replication is inherently harmful. The capacity, cost, load threshold, viability curve, hard limit, and strain-anomaly rule are all explicit model choices. The experiment is useful because those choices are visible and rerunnable.
