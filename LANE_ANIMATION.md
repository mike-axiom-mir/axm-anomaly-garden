# Matrix animation lane

- Session: 2026-09-08, user-requested Matrix testing, repair and animation.
- Branch: `codex/matrix-animation-2026-09-08` (one branch / one PR).
- Base: `e9af55a1d1494f3d4f639e16b3bb06279ae8c4ea`.
- Open PR collision check: none at start.
- Scope: preserve v0.16 simulation; test it, repair browser behavior, add state-driven animation.
- Baseline: all 15 regression entrypoints pass.

## Result

- Persistent outer-world projection, smooth consecutive position changes, state badges, paused decorative motion, reduced-motion control and OS preference.
- Separate nested-world maps retain local coordinates/clocks and inspectable resident state.
- Repair: completion actions immediately update the main map and fingerprint.
- Removed duplicate replication/quarantine marker writers; one renderer owns map entities.
- No engine source or canonical rules changed. Projection purity checked against full serialization.
- `npm test`: all 16 regression entrypoints PASS.
- `npm run study:completion`: 12 seeds × 60 ticks, 12 audit passes, 0 failures, 0 round-trip mismatches; 2,145 resident experiments and 12 transits.
- Optional jsdom integration: PASS for startup, stable markers, passive observation, nested views, immediate refresh, checkpoint/rewind, integrity audit and reset.
- Limitation: cloud browser returned `ERR_BLOCKED_BY_CLIENT` for the local preview; no claim of rendered visual, animation-timing, or mobile-device verification.
- Next useful check: open `index.html`, plant Full Scenario, Run, inspect nested views and Reduced Motion on a real browser.
- Git shell lacked credentials; publication uses the connected GitHub app on the same named branch.
