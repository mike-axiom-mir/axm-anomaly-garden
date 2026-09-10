# Living Matrix adaptive realization

## Purpose

The Living Matrix already separates canonical simulation truth from its Canvas expression. This lane makes that split executable for rendering cost: when expression becomes expensive, Worldglass may render fewer decorative details while continuing to expose the same copied canonical state and causal signals.

This is a realization policy, not a simulation mode.

## Human controls

The live city dock exposes one **Detail** control:

- **Auto** — begin at Full, observe recent Canvas draw cost, and move between Full and Lean with hysteresis;
- **Full** — keep the complete existing skyline/façade detail;
- **Lean** — keep the city body and every state-driven cue while reducing decorative skyline/façade work.

The adjacent status always names the chosen policy, resolved realization, recent measured draw mean when available, and the boundary **EXPRESSION ONLY**.

## Auto policy

Auto observes only the renderer's existing bounded draw-duration samples. It does not inspect, edit, slow, skip, or simplify simulation state.

- window: 24 recent draw samples;
- degrade Full → Lean after 3 consecutive windows above an 8 ms mean;
- recover Lean → Full after 5 consecutive windows below a 4 ms mean;
- reset evidence windows when the realization changes.

The asymmetric thresholds avoid rapid visual oscillation around one boundary. They are a local browser heuristic, not a universal hardware benchmark or FPS guarantee.

## What Lean may reduce

Lean currently reduces only presentation detail that the Living Matrix contract already classifies as atmosphere/architecture:

- procedural skyline density and skyline window rows;
- repeated decorative façade window geometry on generic building boxes.

It keeps the same projected world and continues to render residents, recorded movement, selected-route truth, destinations, building identity/stock, anomalies, repair/program state, portals, institutions, causal-change signals, tracking, navigator, labels, world/layer choice, and intervention controls. It does not alter the simulation clock, RNG, rules, receipts, save state, integrity report, history, or machine-truth/perception boundary.

## Evidence boundary

The focused contract proves that Lean performs materially less decorative drawing work than Full in the exercised renderer seam, that auto degradation/recovery has bounded hysteresis, and that changing realization policy leaves the source scene unchanged.

The Chromium journey must additionally prove on the real repository surface that Full ↔ Lean and desktop ↔ phone changes leave the rendered canonical fingerprint unchanged, while an explicit simulation intervention still changes that fingerprint and remains legible in Lean. Browser draw means are observations for the tested runner only. Sustained FPS, GPU cost, physical weak-device behavior, and cross-browser equivalence are not claimed without separate evidence.

## Authority

Canonical simulation state remains authoritative. Detail policy is local presentation state with `EXPRESSION_ONLY` authority. It cannot merge, promote, rewrite, or establish CANON.
