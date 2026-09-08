# Experiment 010 — Living Nested Subworld + Bounded Security Ecology

Status: **implementation fixture for Anomaly Garden v0.12.0**. Final measured values must come from GitHub Actions after the pushed v0.12 head runs.

This is a simulation experiment. Terms such as resident belief, investigation, Agent/security program, anomaly, and quarantine refer to implemented state/rules only.

## Question

Can a nested Modal host a small living local world with its own residents, anomalies, and programs, while security programs remain bounded by explicit jurisdiction, capabilities, sensing, and action range?

## v0.12 model

A living nested subworld is attached only to an already-existing nested Modal.

It owns:

- bounded local grid
- deterministic local residents with local perception/memory/discrepancy state
- local anomalies
- local machine programs
- locally-valid program replication
- local security programs with explicit roles/capabilities
- local state reset back to the seeded baseline when the enclosing Modal resets
- global causal receipts for important local transitions so reset does not erase history
- optional evidence leakage from local resident memories into the existing outer `inhabitant.modal-memory-leak` path

Security roles:

- `observer`: observe only
- `warden`: observe + quarantine programs
- `repairer`: observe + repair anomalies
- `custodian`: both action capabilities

A security program may act only when:

1. its target is in the same Modal subworld jurisdiction,
2. the required capability is present,
3. the target was actually observed,
4. the target is inside action range.

Blocked attempts receive `security.action-blocked` receipts. Quarantine preserves the target program object/lineage and records `deletionCount: 0`.

## Comparison fixture

```bash
node tools/subworld-security-study.js 12 35
```

Each seed creates the same nested living subworld with:

- 4 local residents
- one strong `local-distortion`
- one denied local replicator

Two conditions are compared:

- **no security**
- **bounded security**: one warden + one repairer in that same nested subworld

The study reports local replication, anomalies, resident observations/investigations/model breaks, security sensing/actions/blocks, evidence leaks, and sample modeled-world digests.

## Truth boundary

This does not establish that security is universally good, that autonomous programs are dangerous, or that social responses follow these rules. The roles, ranges, anomaly effects, replication period, reset behavior, and local resident transition thresholds are explicit design choices.

The value of the fixture is architectural: the same target can exist in machine truth while a security program still cannot act until its own jurisdiction/capability/knowledge/range gates permit the action.