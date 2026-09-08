# From animated diagram to a visible Matrix world

## Assessment

The earlier animation pass moved markers but left the experience as a large laboratory dashboard. It lacked recognizable inhabitants, architecture, spatial depth, a camera, world entry and visual consequences. Animating that layout could not by itself create the requested world experience.

## Implemented in this same lane

- A world-first isometric Canvas scene with streets, lit locations, residential architecture and a distant skyline.
- Articulated inhabitants: walking arms/legs, shadows, role/activity readout, investigation and model-break cues.
- Continuous interpolation between consecutive recorded positions; multi-tick jumps and rewinds snap rather than inventing intermediate histories.
- Visible anomaly fields, local distortions, layered Modal portals, repair drones, replicators and quarantine cages.
- City/code expressions, code rain, selected-resident follow, pan, bounded zoom and fit controls.
- View entry into existing living subworlds with their own clocks, residents and actual gate endpoints. A view change never transits a resident.
- Primary run/pause/step, seed-world, glitch and reduced-motion controls beside the scene.
- Original exact map, simulation settings, import/export, evidence, gate actions and timelines retained in the expandable laboratory.
- Canvas-unavailable fallback retains the original working interface.

## Truth and asset boundaries

`city-projection.js` copies source state into a detached rendering model. It consumes no simulation RNG and invokes no mutating methods. Buildings at home/baseline locations, skyline, window lights and rain are authored presentation, not additional inhabitants, weather rules or simulated physics. Routes use existing coordinates. Gates use existing endpoints. No neural AI, runtime network, account or paid asset dependency was added.

All new visual geometry and animation are original procedural drawing code authored in this lane. No downloaded or image-generated assets were used. Vite remains a development-only preview dependency; index.html still opens offline.

## Verification

- All 17 `npm test` entrypoints pass, including detached projection, source-coordinate/gate fidelity, renderer purity, restore and expiry.
- Optional jsdom regression passes the full original UI and Canvas-unavailable fallback.
- Chrome desktop: city and code expressions render, Run advances simulation, nested-world selection follows local clocks, Follow/Reduced Motion work, a glitch action creates a visible anomaly, and view/selection changes leave fingerprint `63ff7e11` unchanged at tick 0.
- Desktop and 390 × 844 iframe viewport were inspected visually. Phone body width and scroll width both measured 375 CSS pixels (scrollbar included in the 390px viewport); no horizontal page overflow. World selection entered modal-003 on the phone layout.
- Visual QA repaired resident occlusion, portal/label crowding, wheel scrolling capture and narrow-screen instruction overlap.
- No application-script errors observed in the filtered browser log. Browser-extension metadata errors are separate.
- Sample canvas drawing work was about 1–2 ms in the test browser. Frame callbacks were irregular in the cloud surface, including roughly one-second gaps; this does not establish sustained animation FPS on a user's device.

## Scope

This is a stylized 2.5D simulation world, not a movie-quality 3D city. Street-level free-roaming cameras, detailed character assets, interiors and sound are not implemented. The new renderer is a real world realization of the existing model, while the deterministic simulation body remains v0.16.

## Landmark/readability follow-up

Distinct procedural landmarks now include an observatory dome and telescope, striped market/cafe awnings, a cafe table, an open station canopy, industrial roof sections and park trees. These remain presentation geometry, not new simulation facilities or actions. The selected resident has a screen-space locator drawn above architecture, with their actual current activity, so foreground buildings cannot hide the tracking cue.

Validation: renderer syntax check, all 17 regression entrypoints and optional DOM integration passed. Live rendered verification was attempted through the managed preview but rejected by the browser URL security policy; no alternate route was attempted. Appearance and motion of this follow-up therefore remain unverified in a live browser. Prior screenshots apply to the preceding revision only. Next useful check: review landmark label collisions and the tracking cue at phone width and maximum zoom.
