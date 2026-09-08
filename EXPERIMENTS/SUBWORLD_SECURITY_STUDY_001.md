# Experiment 010 — Living Nested Subworld + Bounded Security Ecology

Status: **measured on GitHub Actions for Anomaly Garden v0.12.0**.

This is a simulation experiment. Terms such as resident belief, investigation, Agent/security program, anomaly, and quarantine refer to implemented state/rules only.

## Question

Can a nested Modal host a small living local world with its own residents, anomalies, and programs, while security programs remain bounded by explicit jurisdiction, capabilities, sensing, and action range?

## v0.12 model

A living nested subworld is attached only to an already-existing nested Modal. It owns a bounded grid, deterministic local residents, local anomalies/programs, locally-valid replication, local security programs, reset-to-baseline semantics, and causal receipts that survive resets.

Security roles:

- `observer`: observe only
- `warden`: observe + quarantine programs
- `repairer`: observe + repair anomalies
- `custodian`: both action capabilities

A security program may act only when:

1. the target is in the same Modal-subworld jurisdiction,
2. the required capability is present,
3. the target was actually observed,
4. the target is inside action range.

Blocked attempts receive `security.action-blocked` receipts. Quarantine preserves the target program object/lineage and records `deletionCount: 0`.

## GitHub Actions comparison fixture

```bash
node tools/subworld-security-study.js 12 35
```

Each of 12 seeds creates the same nested living subworld with 4 local residents, one strong `local-distortion`, and one denied local replicator. The only condition change is whether a bounded warden + repairer are deployed.

| Average at tick 35 | No security | Bounded security |
| --- | ---: | ---: |
| active programs | 3.00 | 2.00 |
| quarantined programs | 0.00 | 1.00 |
| active anomalies | 1.00 | 0.00 |
| local program copies | 32.00 | 1.00 |
| local resident observations | 12.00 | 9.33 |
| local investigations | 0.00 | 0.00 |
| local model breaks | 0.00 | 0.00 |
| security observations | 0.00 | 12.42 |
| security actions | 0.00 | 10.00 |
| security blocked | 0.00 | 0.00 |
| evidence leaks outward | 3.42 | 2.67 |

Sample modeled-world digests for seed 001:

- no security: `49fc8c00`
- bounded security: `ac5835fa`

## Interpretation inside this model

The bounded security condition sharply reduced locally-valid denied replication and repaired the seeded local anomaly. It did so through explicit local observations/actions rather than omniscient access.

The resident-observation and evidence-leak counts also changed, but that direction is downstream of the explicitly designed repair/quarantine actions. It is not evidence of a general social law.

Importantly, **both conditions produced zero local investigations and zero local model breaks in this fixture**. Therefore this experiment does not support a claim that the security programs prevented those transitions.

## Truth boundary

This does not establish that security is universally good, that autonomous programs are dangerous, or that real social responses follow these rules. Roles, ranges, anomaly effects, replication period, reset behavior, and resident thresholds are explicit simulation choices.

The architectural result is narrower: a target can exist in machine truth while a security process still cannot act until jurisdiction, capability, knowledge, and range gates permit it.