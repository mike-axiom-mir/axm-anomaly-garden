# Experiment 002 — Investigation vs Routine Throughput

Status: **measured inside the current Anomaly Garden v0.5 ruleset**

This note is intentionally narrow. It describes a property of the simulation, not a claim about humans, organizations, AI systems, economics, or society.

## Why measure this

v0.5 gives inhabitants ordinary scheduled life: work, social time, resource use, repeated meetings, and multi-day projects. Investigation can override that routine movement. That creates a direct question:

> When anomaly evidence persists long enough to pull more inhabitants into investigation, what happens to ordinary simulated life throughput?

## Source run

This uses the exact same 24-seed, three-policy batch recorded in `REPAIR_POLICY_STUDY_001.md`. No second intervention script was introduced.

```bash
node tools/batch-policy-study.js 24
```

| Metric average at tick 80 | Repair off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| investigations | 13.00 | 6.00 | 0.21 |
| model breaks | 12.79 | 5.67 | 0.08 |
| workplace production | 13.17 | 16.29 | 18.62 |
| social meetings | 6.92 | 11.38 | 19.21 |
| projects completed | 0.50 | 1.25 | 1.46 |
| resources acquired | 13.04 | 14.63 | 15.13 |
| resources used | 23.92 | 25.38 | 25.50 |

## Interpretation inside the model

The current rules create a clear inverse pattern: worlds with more persistent anomaly investigation show less scheduled production, fewer ordinary social meetings, and fewer project completions over the same 80 ticks.

This direction is **partly built into the mechanics**. An investigating inhabitant is allowed to leave the scheduled routine and move toward anomaly evidence or a remembered Modal. Time spent doing that is time not spent reaching the workplace or ordinary social destination. Therefore it would be misleading to call the direction of the tradeoff a surprising emergent discovery.

What is not directly scripted is the exact magnitude for each policy and seed. That magnitude arises from encounter location, social topology, repair timing, Modal leakage, test outcomes, work routes, and the deterministic random stream.

## Why this is useful

It gives future versions a falsifiable regression question. If later systems let inhabitants coordinate investigations, delegate work, automate production, change schedules, or build institutions, this tradeoff may weaken, disappear, or reverse. The experiment gives us a baseline rather than a story we can unconsciously preserve.

## Non-claims

This does not establish that:

- curiosity reduces productivity in real people
- investigation is socially costly in general
- control or suppression improves real economies
- anomaly tolerance is good or bad policy
- human institutions behave like this simulation

Those claims are outside the evidence produced here.
