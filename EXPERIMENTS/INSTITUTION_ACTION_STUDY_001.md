# Experiment 005 — Voluntary Institution Action Proposals

Status: **measured inside Anomaly Garden v0.7.0**

This experiment measures only the implemented simulation. It is not evidence about real institutions, politics, organizations, social movements, humans, or AI systems.

## Question

What changes when bounded institutions are allowed to do one additional thing after forming a narrative: propose a temporary action to their own members?

The proposal layer has a hard boundary:

- institutions still do not receive raw anomaly state or Worldglass truth
- proposals are derived only from the institution's current bounded narrative
- each member accepts probabilistically from their own trust, needs, energy, and traits
- proposal acceptance probability is always below 1
- investigation can still override an accepted institutional commitment
- proposal participation is phase-bounded rather than a full-day command
- the entire proposal layer can be disabled with `institutionActionEnabled: false`

## Fixed comparison

Both conditions use the same 24 deterministic seed names and the same perturbation shape. The only configuration change is whether institution action proposals are enabled.

```bash
node tools/institution-action-study.js 24
```

| Average at tick 80 | Proposals disabled | Proposals enabled |
| --- | ---: | ---: |
| investigations | 6.21 | 7.08 |
| model breaks | 5.88 | 6.58 |
| workplace production | 16.60 | 13.93 |
| ordinary social meetings | 10.25 | 6.42 |
| projects completed | 1.13 | 0.92 |
| institution reports | 118.75 | 122.42 |
| narrative changes | 5.63 | 5.63 |
| proposals | 0.00 | 16.13 |
| voluntary commitments | 0.00 | 46.92 |
| institution sessions | 0.00 | 21.25 |
| causal receipts | 502.21 | 631.46 |

## Interpretation inside the model

Enabling proposals changes where some inhabitants spend discretionary or role-appropriate time. In this implementation that produces somewhat more investigation/report activity and somewhat less ordinary work/social throughput over the first 80 ticks.

The direction is partly designed into the mechanic. Participation consumes simulated time, so it would be false to call the throughput reduction a spontaneous law of institutions. The exact size of the difference is not manually scripted and depends on seed-specific acceptance, routes, evidence, social topology, and later interactions.

The useful result is architectural rather than sociological: an institution can influence world behavior without possessing machine truth or deterministic control over members, and that influence remains measurable and switchable.
