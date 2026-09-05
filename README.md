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
- relationship edges carry trust, familiarity, and signal counts
- anomaly information propagates only through existing relationships and local encounter distance
- successful exchanges alter the persistent relationship state

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
- complete JSON state export/import including topology, receipts, Modals, repair nodes, checkpoints, counters, and RNG state

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
- causal receipts
- archived abandoned futures
- deterministic state fingerprint

The inhabitants do not automatically receive information merely because Worldglass shows it to the human player.

## Measured experiment already included

`EXPERIMENTS/REPAIR_POLICY_STUDY_001.md` records a 24-seed comparison using the same intervention script under three repair policies.

Inside the current ruleset, average model breaks across those runs were:

- repair off: **12.13**
- tolerant repair: **5.42**
- aggressive repair: **0.04**

That is a property of this simulation, not a general real-world claim. The experiment is retained so later engine changes can be compared against it rather than relying on memory or vibes.

Run it with:

```bash
node tools/batch-policy-study.js 24
```

## Checks

With Node.js installed:

```bash
node tests/sim.test.js
```

The current suite checks:

- deterministic replay under same seed/actions
- divergence under different seeds
- causal parent links
- intervention receipts
- world bounds
- daily-life roles, shared places, routine destinations, activity states, and bounded needs
- connected persistent relationship topology
- Modal resets and deterministic memory leaks
- repair-node behavior
- checkpoint/rewind
- full serialization round-trip
- exact deterministic continuation after restoring RNG state
- inhabitant-authored investigation tests
- abandoned-future archive preservation across rewind and export/import

## Truth boundary

This project does **not** claim that simulated inhabitants are conscious, sentient, alive, self-aware, or experiencing anything.

Words such as *curiosity*, *belief*, *memory*, *choice*, and *awakening* are shorthand for implemented variables and transition rules. The UI prefers **model break** for the strongest current transition because that describes what the code actually does.

The project is fiction-inspired, but fiction is not evidence. Claims about real machines, humans, cognition, emergence, society, or physical reality require independent evidence.

## Direction, not destination

The Garden is meant to become a deeper causal playground rather than a scripted story recreation. The browser now includes reproducible starting presets for quiet, open-glitch, tolerant-loop, and aggressive-control conditions; the preset chooses starting conditions, not outcomes. Useful future layers include richer geography and daily-life tasks, institutions, competing machine programs, nested Modals, replayable full timelines, resource economies, replication experiments, local rule mutation, multiple kinds of memory, richer inhabitant-designed experiments, and stronger causal graph analysis.

The guiding question remains:

> Can we make a world where small understandable rules and interventions create outcomes we did not explicitly script, while still being able to inspect what actually happened?

## Agent workflow

Read [`AGENTS.md`](AGENTS.md) before contributing. The repository uses **one chat = one PR lane** so parallel AI work does not silently spread across branches or overwrite another lane.
