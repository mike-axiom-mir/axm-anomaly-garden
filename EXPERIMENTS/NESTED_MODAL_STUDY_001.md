# Experiment 009 — Nested Modal / Subworld Clock Study

Status: **measured on GitHub Actions for Anomaly Garden v0.11.0**.

This is a simulation experiment. A nested Modal is an explicit deterministic subworld mechanism, not evidence that physical reality is simulated.

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
- memory leakage crosses into the outer inhabitant memory path using `inhabitant.modal-memory-leak` with explicit `nested`, `depth`, and `parentModalId` provenance
- descendant layers remain ordinary serialized Modal state for world-digest/Future Explorer comparison

## Fixture

```bash
node tools/nested-modal-study.js
```

```text
modal-001 / root        period 12
  └─ modal-002 / child  period 7
      └─ modal-003      period 5
```

The world runs for 96 ticks.

## GitHub Actions run #24 result

- root iterations: **8**
- nested Modals created: **2**
- nested resets: **40**
- local-period nested resets: **16**
- parent-cascade nested resets: **24**
- nested memory leaks: **9**
- total Modal resets including root: **48**
- world digest: `e45c0de6`
- full state fingerprint: `51b99135`

Final tree state:

- child `modal-002`: local tick 0, local iteration 0, 16 lifetime resets, 8 parent resets
- grandchild `modal-003`: local tick 0, local iteration 0, 24 lifetime resets, 16 parent resets

Both local clocks are zero because tick 96 is itself a root reset, which cascades into both descendants.

## What this supports inside the model

Nested local clocks can coexist with root Modal behavior while parent resets deterministically rewind child local state. Reset ancestry stays receipted, deeper memory fragments can cross into the existing inhabitant evidence route, and full nested state survives save/restore and deterministic continuation.

## What this does not support

This is not yet a full autonomous civilization-inside-civilization runtime. v0.11 proves the nested state/control boundary first. Nested institutions, economies, full populations, geography, and rule overrides remain later work.
