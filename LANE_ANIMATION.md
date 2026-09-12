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

## Browser follow-up — 2026-09-08

The initial localhost rejection was a preview routing/setup failure, not evidence that browser QA was unavailable. Added a locked Vite development dependency, dev script and allowed preview host. No runtime dependency or hosting registration was added.

BROWSER_PRIMARY, Chrome desktop viewport approximately 1348 × 926:
- PASS: full scenario creates two rendered nested maps with residents and program markers.
- PASS: Run advances tick and visible inhabitant positions (captured ticks 44, 65 and 68).
- PASS: Pause holds tick 74 across subsequent checks.
- PASS: checkpoint, +10 and rewind return to tick 74 with archived-future status.
- PASS: Reduced Motion selection is retained in the control.
- PASS: live explicit integrity audit reports zero errors and zero warnings.
- UNKNOWN: frame-rate smoothness and mobile layout; screenshot cadence does not prove either.
- Browser log errors observed belonged to the browser extension metadata bridge, not application scripts.
- Screenshots were inspected in memory; no raw capture files retained.

This follow-up supersedes the earlier blanket rendered-browser limitation; the original failed-attempt receipt is preserved above.

## User-directed city realization expansion

Mike identified that the animated diagram still did not look like a Matrix world and requested analysis followed by building. The same branch/PR now contains an isometric world-first realization, articulated inhabitants, architecture, atmospheric/code expressions, visible programs/glitches/portals, camera controls, living-subworld navigation and a preserved expandable lab. See CITY_REALIZATION.md for assessment, implementation boundaries and browser evidence.

Tests: 17 regression entrypoints PASS; optional DOM/fallback check PASS. Desktop and phone-width browser checks completed. Projection-only state changes preserved the visible fingerprint. No engine source was modified.

Follow-up in the same PR lane: distinct landmark geometry and resident activity/position locator above architecture. All 17 suites and DOM integration pass. Browser preview verification blocked by URL security policy; no bypass attempted. Only renderer/presentation documentation changed; no engine changes or other PR lane overlap.

Observed-change follow-up: city-signals.js compares detached render snapshots; bounded renderer cues expose investigation/model breaks, quarantine, glitches and actual action-counter increments. Added pure-delta and real-renderer lifecycle tests. All 18 entrypoints and DOM integration pass. Visual browser gate remains outstanding under the recorded policy restriction. Same branch/PR, no competing open PR found.

Living Matrix World v1 completes the larger realization run in this lane. It adds activity-specific inhabitants, recorded trails and destinations, live needs/stock, social and institution expression, nested-world visual identities, overview/resident/change cameras, a spatial navigator, transition treatment, collision-aware labels and bounded effects. The source engine remains v0.16. All 20 tests, the 12-seed completion study, fallback DOM integration and full mocked-Canvas DOM integration pass. The managed browser again rejected the preview URL, so final rendered desktop/phone review is explicitly unverified. Only PR #4 was open when this run began; no other lane was modified.

Final visual recovery: the saved tab was on Chrome's internal error page, while the managed preview was healthy. A fresh tab at the documented preview address restored supported browser access. Desktop, active motion, code view, nested world, reduced motion and 390 × 844 phone checks passed. Review exposed two presentation faults and repaired both: co-located Modal labels now fan into compact depth markers, and the phone legend wraps without a scrollbar. No application errors were logged. Canvas draw mean was 1.32ms/120 samples; cloud callback cadence was irregular, so no sustained FPS claim is made.
