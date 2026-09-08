# Experiment 001 — Repair Pressure vs Anomaly Discovery

Status: **measured inside Anomaly Garden v0.7.0**

This is not a claim about humans, AI cognition, society, or physical reality. It measures only the current simulation.

## Fixed intervention script

For each seed and repair policy: plant the same Modal and `loop-echo`, run 9 ticks, whisper to inhabitant 1, run 13 ticks, add the same `gravity-slip`, then run to tick 80. Only repair policy changes.

```bash
node tools/batch-policy-study.js 24
```

| Metric average | Repair off | Tolerant | Aggressive |
| --- | ---: | ---: | ---: |
| anomaly observations | 479.21 | 181.33 | 24.13 |
| investigations | 13.46 | 6.21 | 0.17 |
| model breaks | 13.38 | 5.58 | 0.04 |
| social signals | 118.33 | 36.92 | 1.54 |
| repair actions | 0.00 | 10.00 | 8.00 |
| Modal memory leaks | 14.29 | 13.67 | 13.83 |
| inhabitant-authored tests | 71.67 | 36.71 | 1.25 |
| workplace production | 11.34 | 13.81 | 16.66 |
| social meetings | 3.33 | 6.33 | 12.08 |
| projects completed | 0.33 | 1.13 | 1.13 |
| institution member reports | 162.50 | 116.33 | 34.00 |
| narrative changes | 5.75 | 5.67 | 3.96 |
| institution proposals | 16.67 | 16.46 | 11.83 |
| voluntary commitments | 46.75 | 48.75 | 38.38 |
| institution sessions | 14.75 | 22.13 | 22.38 |
| causal receipts | 1058.96 | 609.29 | 274.63 |

Across 24 runs, aggressive repair produced no model break in 23/24 and no investigation in 21/24.

## What this supports

Inside this exact model, aggressive repair usually removes anomaly-object evidence before enough accumulates to produce the same investigation cascades seen under weaker repair. Modal memory and institution/report paths remain distinct mechanisms.

## What this does not support

It does not establish real-world claims about suppression, curiosity, censorship, consciousness, AI behavior, institutional truth, or whether less repair is better.

## Revision note

v0.7 adds voluntary institution action proposals. Because those proposals can change movement and encounter patterns, the entire 24-seed table was rerun rather than carrying forward v0.6.1 values.
