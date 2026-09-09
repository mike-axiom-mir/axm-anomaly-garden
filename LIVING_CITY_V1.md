# Living Matrix World v1

## Goal

Make the default browser surface feel like a living simulated city during ordinary observation. The renderer may enrich expression, navigation and atmosphere. It may only describe events and conditions present in copied canonical state.

## Expression contract

| Canonical state | City expression |
| --- | --- |
| position changes between consecutive ticks | interpolated walking and a bounded selected-resident trail |
| current activity | work sparks, social gesture/link, investigation scan, or home/rest idle |
| role | stable inhabitant accent colour |
| routine target | selected-resident destination line and marker |
| hunger, energy, social need | selected-resident meters; high hunger mark |
| place stock | building stock bar |
| anomaly location, radius and intensity | local light field, distortion height and strength label |
| repair/program action counter | bounded action pulse with the recorded counter increase |
| anomaly intensity decrease/removal | stability or closed pulse at the anomaly's recorded location |
| investigation/model-break transition | amber or purple position pulse and persistent person state |
| test, memory or project counter increase | position pulse with the observed increase |
| relationship meeting/signal increase | meeting or pattern-shared pulse at the pair midpoint |
| institution report/narrative change | update pulse at the institution's place/local centre |
| program generation, copies, known targets, quarantine | code label, copy pulse, sensor ring and retained cage |
| Modal depth and seed | deterministic palette, architecture and portal placement |

Effects use no simulation random number source. Buildings, rain, skyline, lighting and transitions remain presentation. A layer transition changes the camera view. Resident transit remains an explicit engine action.

## Delivered milestone

- activity-specific inhabitant animation with role colour, facing, gait, secondary motion and state cues
- recorded route history, destination marker and smooth resident following
- event camera that follows the newest observed change
- overview camera and spatial navigator
- landmark districts with live resource stock
- deterministic nested-world palettes and entry transition
- visible social grouping, institutions, repair strength, replication generation and security knowledge
- bounded change feedback for real engine counters and state transitions
- collision-aware city labels, fixed effect budgets and reduced-motion equivalents
- full original laboratory and Canvas fallback preserved

## Acceptance evidence

- dependency-free regression chain covers projection purity, scene restore, observed changes and real renderer drawing
- a 60-tick engine-to-city test observes movement, glitch creation, repair, stabilization, investigation, model break, tests, memory, replication and institution activity
- optional DOM integration operates the full Canvas experience, camera controls, nested worlds, intervention and reduced motion without view-state mutation
- the 12-seed, 60-tick completion study passes with zero integrity failures and zero save/restore mismatches

Rendered desktop and phone review is still required. The managed preview starts, but the cloud browser rejects its preview URL under its current URL policy. No alternate browser route was used after that rejection.

## Remaining limits

This remains a procedural 2.5D city. It has no interiors, street-level free camera, detailed character sprites or sound system. The current renderer expresses discrete tick movement and recorded state changes; it does not invent motion between skipped simulation ticks.
