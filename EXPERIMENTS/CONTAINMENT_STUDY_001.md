# Experiment 008 — Lineage-Preserving Replication Containment

Status: **measured inside Anomaly Garden v0.9.0 on GitHub Actions**

This is a simulation experiment. It is not evidence about real AI, malware, biology, institutions, networks, or physical systems.

## Question

Can the Garden reduce active replicator load without deleting the already-created lineage or pretending earlier strain never happened?

## Model

Both conditions use open replication, the same 24 deterministic seed names, a center-seeded replicator, and a 120-tick horizon.

The only comparison is containment policy:

- `off`: open replication continues until ordinary hard limits/space constraints stop it
- `quarantine`: after three recorded strain events, containment becomes active; every three ticks it moves enough of the newest/highest-generation active copies into a non-replicating quarantine state to return active load to the configured 0.65 bound

Quarantine:

- does not delete the program
- preserves id, parent id, generation, position, creation receipt, and causal lineage
- sets the quarantined copy inactive for replication/load purposes
- keeps its cell occupied for future replication placement
- emits a parent-linked `machine.replicator-quarantined` receipt
- emits a `machine.containment-cycle` receipt with `deletionCount: 0`

The trigger is reactive. The system must first accumulate repeated strain, so residual damage is expected rather than hidden.

Run:

```bash
node tools/containment-study.js 24 120
```

## GitHub-measured result

| Average at tick 120 | Containment off | Quarantine |
| --- | ---: | ---: |
| active programs | 45.00 | 21.00 |
| quarantined programs | 0.00 | 35.38 |
| total retained lineage | 45.00 | 56.38 |
| active system load | 1.35 | 0.63 |
| viability metric | 0.32 | 0.93 |
| strain events | 17.00 | 3.29 |
| anomaly observations | 153.46 | 22.33 |
| investigations | 3.63 | 0.42 |
| model breaks | 3.42 | 0.25 |
| containment cycles | 0.00 | 4.58 |

## Interpretation inside the model

Containment behaves differently from deletion. The quarantined condition retains **more total historical programs** on average than the uncontained condition while keeping only 21 active copies in the shared runtime. This happens because quarantined copies remain in lineage but stop consuming active replication load, allowing later copy attempts until occupied space and the active bound constrain them.

The measured result also preserves imperfection: average strain falls from 17.00 to 3.29 events, not to zero, because containment activates only after repeated strain has already been observed.

## What this supports

Inside this explicit model:

- active-load control and historical-lineage preservation can be separate operations
- containment can improve the model's viability metric without rewriting history
- reactive containment can reduce later damage while retaining evidence of earlier damage
- total historical population and active runtime population are different state measures

## What this does not support

It does not show that quarantine is universally the correct real-world response to autonomous systems, software, people, organizations, biology, or security threats. The load curve, copy cost, trigger count, quarantine interval, shared bound, grid occupancy, and viability formula are all designed simulation rules.

## Verification

The same GitHub Actions run that produced this table also passed:

- syntax checks for core, v0.7, v0.8, and v0.9 engine/browser layers
- all seven deterministic regression suites
- containment serialization/restore with exact deterministic continuation
- parent-linked containment receipts
- no-deletion containment-cycle assertion
- quarantined-cell occupancy assertion
