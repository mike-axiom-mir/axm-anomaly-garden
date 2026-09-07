# Anomaly Garden

> Build a world. Disturb one thing. See what notices.

Anomaly Garden is a playful, inspectable simulation lab. It separates **machine truth** from **inhabitant perception**, lets the player alter conditions without scripting the final outcome, and records causal receipts so surprising events can be traced backward.

The current build is deliberately offline and dependency-free in the browser: open `index.html`. No account, server, package manager, AI service, or internet connection is required.

## Current executable systems

### Deterministic world

- seeded pseudo-random world generation
- 16 inhabitants with measurable curiosity, skepticism, social tendency, confidence, discrepancy, and investigation thresholds
- state fingerprint for exact branch/control-state comparison
- separate v0.10 **world digest** for modeled-world comparison without branch/receipt administration
- exact RNG state is serializable, so an imported world can continue deterministically from the saved point
- abandoned futures created by rewind are retained in a branch archive instead of silently disappearing
- a 48-tick day cycle gives inhabitants persistent homes, roles, workplaces, social destinations, energy, social need, and planned activities

### Lived routine layer

- each inhabitant has a persistent home and role
- roles map to shared workplaces such as the Workshop, Observatory, Market, Repair Depot, Station, and Park
- every day cycles through rest, work, social, and home phases
- inhabitants move toward their current routine destination instead of random-walking by default
- investigation can pull an inhabitant away from the planned routine, and that deviation is counted in state
- energy and social need change with current activity and remain bounded state variables
- workplaces hold real resource stock and accumulate production from inhabitants who reach scheduled work
- inhabitants earn/spend credits, own/consume food, and carry inspectable inventory state
- every inhabitant carries a role-shaped multi-day project; completion creates a persistent owned artifact
- repeated social encounters become persistent meeting events that strengthen familiarity/trust

### Perception and model change

- local anomaly interventions: `gravity-slip`, `loop-echo`, `time-pocket`, `memory-scar`
- targeted `whisper` intervention against the selected inhabitant
- inhabitants can encounter, notice, or miss anomaly evidence
- discrepancy can accumulate or decay
- inhabitants can enter an investigation state
- investigators can run their own anomaly/Modal tests, producing receipted confirmatory or inconclusive evidence
- a defined threshold can produce a **model break**: `world-model-is-incomplete`
- this is a simulation state transition, not a claim of literal awakening or self-awareness

### Persistent social fabric

- every inhabitant is connected to a durable relationship topology
- relationship edges carry trust, familiarity, signal counts, and repeated-meeting history
- anomaly information propagates only through existing relationships and local encounter distance
- successful exchanges alter the persistent relationship state

### Bounded institutions + voluntary proposals

- three institutions exist: Inquiry Circle, Maintenance Guild, and Commons Assembly
- each inhabitant belongs to one institution with a persistent trust value
- institutions **do not receive raw anomaly objects or Worldglass machine truth**
- they receive rate-limited, source-linked member reports derived from observations, Modal memory, tests, or social testimony
- each institution accumulates evidence and changes its own narrative using different explicit thresholds/frames
- institutions periodically broadcast their current interpretation to members, which can modestly affect confidence/discrepancy
- a non-prior narrative can generate a temporary action proposal without receiving machine truth
- members accept proposals probabilistically from their own trust/needs/traits; acceptance is never guaranteed and the whole action layer has an explicit off switch
- accepted participation is phase-bounded, and personal investigation can still override it
- every report, narrative change, proposal, acceptance, session, and commitment end is causally inspectable

### Locally valid replication vs global viability

- v0.8 adds an optional machine-layer replicator experiment; it is **off by default**
- a player can seed one replicator and choose `off`, `bounded`, or `open` copy admission
- every accepted copy must pass the local transition rules: active parent, in-bounds empty target cell, hard instance limit
- bounded admission refuses a locally possible copy when projected shared system load would exceed the configured budget
- open admission accepts locally valid copies beyond that budget; sustained excess load can generate receipted `silent-zone` strain anomalies
- copy receipts link each child to its parent creation receipt, making the replication tree inspectable
- the machine layer exposes shared load and a simple viability metric; those are explicit simulation mechanics, not claims about real computation or biology

The fixed 24-seed / 120-tick study is recorded in `EXPERIMENTS/REPLICATION_STUDY_001.md`. In that exact model, bounded runs stabilized at 21 programs / 0.63 load with zero strain events, while open runs reached 45 programs / 1.35 load and generated 17 strain anomalies per run.

### Lineage-preserving quarantine

- v0.9 adds an optional `quarantine` containment policy; it is **off by default**
- containment reacts only after repeated machine-layer strain has already occurred
- contained replicators keep their id, parent, generation, position, and creation receipt
- quarantined copies become inactive for replication/load but remain retained in lineage and keep their occupied cells
- containment-cycle receipts explicitly record `deletionCount: 0`
- early strain remains in the causal history rather than being retroactively erased

The GitHub-measured 24-seed / 120-tick study is recorded in `EXPERIMENTS/CONTAINMENT_STUDY_001.md`. In that exact model, open replication without containment ended at 45 active programs / 1.35 load / 0.32 viability / 17.00 strain events, while quarantine averaged 21 active + 35.38 quarantined / 0.63 active load / 0.93 viability / 3.29 strain events.

### Future Explorer

v0.10 turns the preserved branch archive into an executable causal comparison layer.

- lists the current future plus every retained archived future
- gives each future a full state fingerprint and a separate modeled-world digest
- compares two futures' ordered **non-administrative intervention logs**
- identifies the first differing intervention and its actual receipt id
- reports metric differences across investigations, model breaks, production, meetings, projects, strain, and containment
- if tracked interventions are identical but world digests differ, reports `state-divergence-with-same-interventions` instead of inventing a cause
- if world digests match but full fingerprints differ, reports `administrative-divergence`
- can fork an archived future back into canonical play
- before a fork, the previous current future is archived as another retained branch
- the source archived future is not consumed or deleted by forking
- fork/archive receipts record `deletionCount: 0`
- forked states survive export/import and continue deterministically

The deterministic fixture is documented in `EXPERIMENTS/FUTURE_EXPLORER_001.md`.

### Modal zones

- player can plant repeating local zones
- a Modal captures inhabitants currently inside its radius as anchored participants
- the zone resets those participants on a deterministic period
- each reset can leak a configurable memory fragment
- retained fragments become causal evidence and can contribute to later discrepancy

### Machine repair programs

- two local repair programs exist in machine truth
- repair policy can be `off`, `tolerant`, or `aggressive`
- repair nodes move toward eligible anomalies and reduce anomaly intensity / lifespan
- every actual repair action receives a causal receipt
- repair programs do not currently erase Modal memory fragments, making those two anomaly routes intentionally distinct

### Causal branch tools

- append-only receipts for interventions and major state transitions on the current branch
- parent links for causal ancestry inspection
- manual checkpoints
- rewind to the latest retained checkpoint
- rewind archives the abandoned future with its fingerprint and full state before restoring the checkpoint
- Future Explorer can compare/fork those retained branches without consuming them
- complete JSON state export/import including topology, hot/cold receipts, Modals, repair nodes, institutions, checkpoints, counters, branch archive, RNG state, replication, containment, and Future Explorer-compatible branch state
- exact cold-history compaction can move old receipt objects out of the hot graph without changing the canonical fingerprint or breaking ancestry lookup

### Worldglass

The interface deliberately shows two different layers:

**Inhabitant layer**
- what simulated inhabitants observe
- their current hypothesis, discrepancy, confidence, memory count, and social context

**Machine truth layer**
- active anomalies
- repair programs and policy
- Modal zones
- relationship edge count
- causal receipts, including exact cold-history chunks
- institution narratives/proposals and voluntary commitments
- replication load and containment state
- archived abandoned futures
- deterministic state fingerprint
- Future Explorer branch comparison and safe forking

The inhabitants do not automatically receive information merely because Worldglass shows it to the human player.

## Measured experiments already included

`EXPERIMENTS/REPAIR_POLICY_STUDY_001.md` records a 24-seed comparison using the same intervention script under three repair policies.

Inside the retained v0.7.0 repair-policy ruleset, average model breaks across those runs were:

- repair off: **13.38**
- tolerant repair: **5.58**
- aggressive repair: **0.04**

That is a property of this simulation, not a general real-world claim. The experiment is retained so later engine changes can be compared against it rather than relying on memory or vibes.

The repository also retains:

- `EXPERIMENTS/INSTITUTION_NARRATIVE_STUDY_001.md`
- `EXPERIMENTS/INSTITUTION_ACTION_STUDY_001.md`
- `EXPERIMENTS/LIVED_WORLD_TRADEOFF_001.md`
- `EXPERIMENTS/COLD_HISTORY_STUDY_001.md`
- `EXPERIMENTS/REPLICATION_STUDY_001.md`
- `EXPERIMENTS/CONTAINMENT_STUDY_001.md`
- `EXPERIMENTS/FUTURE_EXPLORER_001.md`

## Checks

With Node.js installed:

```bash
npm test
```

The current suite checks:

- deterministic replay under same seed/actions
- divergence under different seeds
- causal parent links
- intervention receipts
- world bounds
- daily-life roles, shared places, routine destinations, activity states, and bounded needs
- workplace production, credits, owned/consumed resources, repeated social meetings, and multi-day project completion
- connected persistent relationship topology
- Modal resets and deterministic memory leaks
- repair-node behavior
- checkpoint/rewind
- full serialization round-trip
- exact deterministic continuation after restoring RNG state
- inhabitant-authored investigation tests
- abandoned-future archive preservation across rewind and export/import
- institutional bounded-knowledge rules, report provenance, narrative change, voluntary proposals/commitments, sessions, opt-out configuration, and deterministic round-trip
- exact cold-history compaction, hot→cold causal ancestry, fingerprint preservation, and deterministic continuation after import
- locally valid replication, bounded shared-budget refusal, open-load strain, parent-linked copy receipts, and deterministic replication save/restore
- lineage-preserving quarantine, retained occupied cells, parent-linked quarantine receipts, explicit no-deletion cycles, and deterministic continuation
- Future Explorer intervention divergence, same-intervention state-drift alarms, no-loss future forking, world-digest restoration, and deterministic fork round-trip

GitHub Actions currently runs the full eight-suite regression set plus the containment and Future Explorer study fixtures.

## Truth boundary

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware, or experiencing anything.

Words such as *curiosity*, *belief*, *memory*, *choice*, and *awakening* are shorthand for implemented variables and transition rules. The UI prefers **model break** for the strongest current transition because that describes what the code actually does.

The project is fiction-inspired, but fiction is not evidence. Claims about real machines, humans, cognition, emergence, society, physical reality, or the actual future require independent evidence.

Future Explorer does not turn the Garden into a crystal ball. A simulated future is conditional on its starting state, rules, uncertainty treatment, interventions, and model validity.

## Direction, not destination

The next major direction is a **Baseline Lab / Future Envelope**:

- admit an external starting state with provenance on each field
- distinguish `observed`, `estimated`, `contested`, and `unknown`
- branch multiple plausible baseline variants instead of manufacturing one perfect starting state
- explore conditional futures from those baselines
- add backtesting against known historical outcomes
- add sensitivity analysis so the system can show which assumptions actually control a conclusion

The guiding question remains:

> Can we make a world where small understandable rules and interventions create outcomes we did not explicitly script, while still being able to inspect what actually happened and what assumptions made that future possible?

## Agent workflow

Read [`AGENTS.md`](AGENTS.md) before contributing. The repository uses **one chat = one PR lane** so parallel AI work does not silently spread across branches or overwrite another lane.
