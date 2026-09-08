# Experiment 009 — Future Explorer / Exact Branch Divergence

Status: **executable regression fixture for Anomaly Garden v0.10.0**

This experiment tests causal branch inspection. It does not predict reality and it does not infer causes that are absent from the recorded simulation history.

## Scenario

1. Create one deterministic baseline checkpoint.
2. Future A receives a `gravity-slip` intervention and runs forward.
3. Rewind to the baseline. Future A is retained in the branch archive.
4. Future B receives a different `loop-echo` intervention and runs forward.
5. Compare Future A with current Future B.
6. Fork Future A back into canonical play.

## Required properties

- the first differing **non-administrative intervention** is reported with its receipt id
- if intervention histories match but modeled world digests differ, the explorer reports `state-divergence-with-same-interventions` instead of inventing a causal story
- if modeled world digests match but full fingerprints differ, the explorer reports `administrative-divergence`
- forking an archived future preserves the current future as a new archived branch before restoring the selected source
- the source archived branch remains in the archive
- the restored modeled-world digest matches the selected source before new fork/archive receipts are appended
- fork/archive receipts explicitly record `deletionCount: 0`
- export/import after a future fork continues deterministically

Run:

```bash
node tests/future-explorer.test.js
node tools/future-explorer-study.js
```

## Truth boundary

A recorded divergence identifies where two simulated histories first differ according to tracked interventions/state. It does not prove that an intervention is the only philosophically meaningful cause, and it does not fill untracked causal gaps with narrative. A same-intervention state divergence is deliberately treated as an alarm for hidden state, model-version drift, or nondeterminism that requires investigation.
