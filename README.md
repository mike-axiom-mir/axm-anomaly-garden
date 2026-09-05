# Anomaly Garden

> Build a world. Disturb one thing. See what notices.

Anomaly Garden is a playful, inspectable simulation lab. It separates **machine truth** from **inhabitant perception**, lets the player alter conditions without scripting the final outcome, and records causal receipts so surprising events can be traced backward.

The current build is deliberately offline and dependency-free in the browser: open `index.html`. No account, server, package manager, AI service, or internet connection is required.

## Current executable systems

### Deterministic world

- seeded pseudo-random world generation
- 16 inhabitants with measurable curiosity, skepticism, social tendency, confidence, discrepancy, and investigation thresholds
- state fingerprint for quick trajectory comparison
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
- workplaces now hold real resource stock and accumulate production from inhabitants who reach scheduled work
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
- bounded admission refuses a locally possible copy when the projected shared system load would exceed the configured budget
- open admission accepts locally valid copies beyond that budget; sustained excess load can generate receipted `silent-zone` strain anomalies
- copy receipts link each child to its parent creation receipt, making the replication tree inspectable
- the machine layer exposes shared load and a simple viability metric; those are explicit simulation mechanics, not claims about real computation or biology

The fixed 24-seed / 120-tick study is recorded in `EXPERIMENTS/REPLICATION_STUDY_001.md`. In that exact model, bounded runs stabilized at 21 programs / 0.63 load with zero strain events, while open runs reached 45 programs / 1.35 load and generated 17 strain anomalies per run.

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
- the restored branch records both the archive event and the rewind intervention
- complete JSON state export/import including topology, hot/cold receipts, Modals, repair nodes, institutions, checkpoints, counters, branch archive, and RNG state
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
- archived abandoned futures
- deterministic state fingerprint

The inhabitants do not automatically receive information merely because Worldglass shows it to the human player.

## Measured experiment already included

`EXPERIMENTS/REPAIR_POLICY_STUDY_001.md` records a 24-seed comparison using the same intervention script under three repair policies.

Inside the retained v0.7.0 repair-policy ruleset, average model breaks across those runs were:

- repair off: **13.38**
- tolerant repair: **5.58**
- aggressive repair: **0.04**

That is a property of this simulation, not a general real-world claim. The experiment is retained so later engine changes can be compared against it rather than relying on memory or vibes.

Run it with:

```bash
node tools/batch-policy-study.js 24
```

The same batch also tracks institutional reporting/narrative changes. `EXPERIMENTS/INSTITUTION_NARRATIVE_STUDY_001.md` records final narrative distributions and the hard boundary that institutions never receive machine truth. `EXPERIMENTS/INSTITUTION_ACTION_STUDY_001.md` separately toggles the proposal layer on/off so institutional influence is testable rather than assumed.

The same batch also exposes a built-in time-allocation tradeoff: investigation can override ordinary routine and accepted institution commitments can redirect only phase-appropriate time. `EXPERIMENTS/LIVED_WORLD_TRADEOFF_001.md` records that result and explicitly separates designed direction from seed-dependent magnitude. `EXPERIMENTS/COLD_HISTORY_STUDY_001.md` records exact causal-history compaction with fingerprint preservation.

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

## Truth boundary

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware, or experiencing anything.

Words such as *curiosity*, *belief*, *memory*, *choice*, and *awakening* are shorthand for implemented variables and transition rules. The UI prefers **model break** for the strongest current transition because that describes what the code actually does.

The project is fiction-inspired, but fiction is not evidence. Claims about real machines, humans, cognition, emergence, society, or physical reality require independent evidence.

## Direction, not destination

The Garden is meant to become a deeper causal playground rather than a scripted story recreation. The browser now includes reproducible starting presets for quiet, open-glitch, tolerant-loop, and aggressive-control conditions; the preset chooses starting conditions, not outcomes. Useful future layers include richer geography, institution dissent/factions, competing machine programs, nested Modals, reopenable branch trees, resource economies, replication experiments, local rule mutation, multiple kinds of memory, richer inhabitant-designed experiments, and stronger causal graph analysis.

The guiding question remains:

> Can we make a world where small understandable rules and interventions create outcomes we did not explicitly script, while still being able to inspect what actually happened?

## Agent workflow

Read [`AGENTS.md`](AGENTS.md) before contributing. The repository uses **one chat = one PR lane** so parallel AI work does not silently spread across branches or overwrite another lane.
