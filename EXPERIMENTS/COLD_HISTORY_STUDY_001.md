# Experiment 006 — Exact Cold Causal History

Status: **measured engineering result in Anomaly Garden v0.7.0**

This is a storage/runtime experiment, not a claim about cognition or society.

## Question

Can old causal receipts leave the hot JavaScript object graph without deleting the exact events or breaking causal ancestry?

## Mechanism

`compactHistory()` moves an old contiguous prefix of receipts into an exact tuple-encoded cold chunk. The chunk retains:

- receipt id
- tick
- event type
- complete payload
- parent receipt ids
- chunk hash and range metadata

Hot receipts stay as normal objects. Cold receipts are decoded only when an old receipt is actually requested. Storage compaction does not consume simulation RNG and does not create a world-causal receipt because it changes representation, not simulated reality. It is recorded separately in `storageLog`.

## 1,200-tick measurement

```bash
node tools/history-compaction-study.js
```

Result:

- canonical fingerprint before: `d85e1196`
- canonical fingerprint after: `d85e1196`
- total exact receipts: **15,536 → 15,536**
- hot receipt objects: **15,536 → 2,657**
- cold exact receipts: **0 → 12,879**
- serialized state size: **7,462,835 → 5,122,519 bytes**
- serialized reduction in this run: **31.36%**
- a recent Modal reset still traced through cold storage to its original creation receipt: **PASS**

## Truth boundary

The important receipt is the preserved fingerprint and preserved exact receipt graph. The serialized-size improvement is implementation- and dataset-specific. It is not a universal compression ratio.

This first cold-history format still stores JSON text rather than a binary/indexed archival format. It reduces hot object pressure and repeated field names but is not the final scaling architecture.
