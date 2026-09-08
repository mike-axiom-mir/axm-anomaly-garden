# Experiment 009 — Nested Modal / Subworld Clock Study

Status: **implementation fixture for Anomaly Garden v0.11.0**. Final measured values must come from the GitHub Actions run for the pushed v0.11 head.

This remains a simulation experiment. A nested Modal is an explicit deterministic subworld mechanism, not evidence that physical reality is simulated.

## Question

Can a Modal contain another repeating layer with its own local clock/reset state while keeping parent/child causality, deterministic replay, memory leakage, serialization, and Future Explorer compatibility inspectable?

## v0.11 model

- root Modals retain the existing v0.6+ behavior
- a nested Modal must fit completely inside an active parent Modal
- nesting depth is bounded to 3 by default
- nested layers have their own `localTick`, `iteration`, retained local entity state, and lifetime reset counters
- nested-local motion/leak decisions use hash-derived deterministic entropy and do not directly consume the parent simulation RNG
- a local nested period reset restores that layer's local entity state
- when a parent layer resets, child layers reset back to their own captured baseline and record `cause: parent-reset`
- child reset receipts link to parent/reset creation receipts
- memory leakage crosses back into the outer inhabitant memory path using the existing `inhabitant.modal-memory-leak` receipt type with explicit `nested`, `depth`, and `parentModalId` fields
- descendant layers remain ordinary modal state for world-digest/Future Explorer comparison

## Fixture

```bash
node tools/nested-modal-study.js
```

The fixture builds:

```text
root Modal (period 12)
  └─ child Modal (period 7)
      └─ grandchild Modal (period 5)
```

and runs the world for 96 ticks.

## Truth boundary

This v0.11 pass is a bounded nested-state foundation, not a full autonomous duplicate civilization inside every Modal. It proves independent local clocks/reset ancestry and cross-layer memory evidence first. Richer nested inhabitants, institutions, economies, and rule overrides can be layered later without pretending they already exist.
