# Experiment 004 — Bounded Institution Narratives

Status: **measured inside Anomaly Garden v0.6.1**

This experiment measures only the simulated institutions implemented here. It is not evidence about real governments, science, media, organizations, communities, or human belief formation.

## Hard architecture boundary

The three institutions are deliberately denied Worldglass access:

- **Inquiry Circle** frames evidence as something to test
- **Maintenance Guild** frames evidence as faults to diagnose/repair
- **Commons Assembly** frames evidence as shared community reports

Institution objects do not receive raw anomaly arrays or a machine-truth field. They can only accumulate rate-limited member reports that retain source receipt provenance. Different thresholds and narrative labels are explicit model design, not emergent institutional psychology.

## Source run

The same 24 seeds and perturbation script used in Experiment 001 were run under repair `off`, `tolerant`, and `aggressive`.

```bash
node tools/institution-study.js 24
```

### Average report activity by tick 80

| Policy | member reports | narrative changes |
| --- | ---: | ---: |
| repair off | 86.71 | 5.50 |
| tolerant | 86.29 | 5.42 |
| aggressive | 33.00 | 3.63 |

### Final narrative distribution across 24 seeds

**Inquiry Circle**

| Narrative | Off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| `persistent-inconsistency` | 23 | 23 | 15 |
| `testable-anomaly-reports` | 1 | 1 | 4 |
| `insufficient-evidence` | 0 | 0 | 5 |

**Maintenance Guild**

| Narrative | Off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| `systemic-fault-pattern` | 22 | 20 | 2 |
| `repairable-faults` | 2 | 4 | 11 |
| `local-faults-expected` | 0 | 0 | 11 |

**Commons Assembly**

| Narrative | Off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| `community-pattern` | 14 | 11 | 1 |
| `shared-unusual-reports` | 7 | 8 | 6 |
| `ordinary-world` | 3 | 5 | 17 |

## What is interesting inside the model

Aggressive repair strongly reduces direct anomaly observation, but it does **not** guarantee institutional return to the prior narrative. The Inquiry Circle still reaches `persistent-inconsistency` in 15/24 aggressive-repair worlds. In this implementation, Modal memory fragments, inhabitant tests, and social testimony remain evidence routes even when repair programs rapidly suppress anomaly objects.

That does not mean "truth always escapes control" in reality. It means the current simulation has intentionally separate evidence channels, and the measured distribution confirms those channels actually matter.

The three institutions also interpret similar report pressure differently because their frames and thresholds are explicitly different. The simulation is therefore useful for studying how bounded perspectives interact, but it would be false to present those frames as spontaneously evolved ideologies.

## Future falsifiable questions

- What happens if reports can be challenged or retracted?
- What if institutions exchange evidence but not interpretations?
- What if membership changes after repeated disagreement?
- Can internal factions form from evidence histories rather than being predeclared?
- How does an institution behave when its prior narrative predicts observations better than a newer one?
- Can investigators build tests that institutions independently reproduce?

Those are future mechanics, not current capabilities.
