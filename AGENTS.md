# Anomaly Garden — Agent Lane Rules

## Core rule: one chat = one PR lane

Every independent AI/chat/build session works in exactly one branch and one pull request.

### Required workflow
1. Read this file before changing the repository.
2. Inspect current repository state and existing open PRs before building.
3. Create or reuse exactly one branch for the current chat/session.
4. Put every change made by that chat/session onto that branch only.
5. Open or continue exactly one pull request from that branch.
6. Do not create side branches, extra PRs, hidden merge lanes, or parallel rewrites from the same chat.
7. Do not modify another chat's branch unless Mike explicitly asks for repair/reconciliation.
8. Do not merge another lane's work merely to make the current lane easier.
9. If overlap is discovered, preserve both bodies of work, record the collision in the PR, and reconcile deliberately.
10. Never silently replace or discard existing work.

## Direction
Anomaly Garden is a playful simulation laboratory built around a simple question:

> What happens if we build a world, disturb something, and let its inhabitants and systems react without pre-writing the outcome?

The project is not a claim that simulated inhabitants are conscious, alive, sentient, or experiencing anything. Terms such as curiosity, belief, awakening, perception, choice, and memory are simulation mechanics and measurable model states unless evidence establishes otherwise.

## Build philosophy
- Preserve the active direction instead of rebuilding from scratch.
- Prefer executable experiments over lore-only descriptions.
- Keep simulation truth separate from inhabitant perception.
- Make causality inspectable and replayable where practical.
- Small deterministic rules may produce large outcomes; do not fake emergence with scripted narrative and then call it emergent.
- Randomness must be seeded or otherwise recorded when reproducibility matters.
- A visually playful interface is encouraged, but visual spectacle must not obscure what actually happened in the simulation.
- No hidden control: if the player or system intervenes, the intervention should be representable in the causal record.

## Truth boundary
Always distinguish:
- implemented behavior
- measured observation
- hypothesis
- fiction-inspired analogy
- planned behavior

Never report planned or mocked behavior as working.

## PR handoff
Each PR should state:
- goal of the lane
- what became executable
- important files changed
- tests/checks run
- known limitations
- next useful experiments
- any overlap/conflict with other lanes

This file is repository-level governance. Changes to it should be deliberate and should preserve the one-chat/one-PR isolation rule unless Mike explicitly changes that rule.

## Detail-density and composable capability principle

Quality is often the accumulated result of many small correct details, not one large generic upgrade.

- When improving a system, look for missing small, bounded capabilities, checks, parameters, passes, and repair operations that control specific details or failure modes.
- Prefer many reusable, inspectable, composable capabilities over one opaque "make it better" step when the smaller capabilities create real control or evidence.
- A machine should remain useful without AI: humans, explicit state, recipes, or deterministic logic can invoke the same capabilities directly.
- With AI, the model is primarily an interpretation and orchestration layer: it translates a higher-level goal into selections and combinations of the same underlying capabilities. The AI does not own those capabilities.
- A better reasoning model may improve goal interpretation and composition, while the underlying machine remains portable and usable without that model.
- Judge improvement by accumulated perceptual or functional detail, coherence, failure reduction, and fit to the goal—not by model size, resolution, benchmark score, or one broad upgrade alone.
- For visual, game, asset, animation, and video work, pay attention to small interacting details such as material variation, contact, timing, weight, secondary motion, lighting response, sound layering, asymmetry, wear, scale cues, camera behavior, and continuity.
- Do not fragment working systems merely for ideology. Add granularity where it creates useful control, reuse, diagnosis, repair, or quality.

**Working rule:** thousands of small good details and capabilities in the right places can improve a result more than one simple big upgrade.

## Canonical state and adaptive realization principle

When useful, separate **what exists in the simulation** from **how a particular machine expresses it**.

- Canonical simulation state, causal records, rules, histories, and intervention truth remain authoritative. Visual/audio/UI manifestations are realizations.
- Preserve expression intent where needed so world identity, readability, atmosphere, inhabitant cues, and semantic detail can survive cheaper rendering.
- Prefer one simulation body with multiple bounded realization contracts over divergent platform-specific worlds when the same canonical state can support them.
- Choose realization from canonical state + expression intent + measured machine capabilities + user policy; adaptation may happen at launch or dynamically.
- A weak device should receive cheaper expression, **not weaker simulation truth**.
- Never degrade causal rules, intervention records, history, data integrity, or truth/perception boundaries just to meet rendering cost.
- Never let a lossy render, UI state, or cache overwrite richer canonical simulation state. Projection is not authority.
- A richer realization may expose more of existing state/intent; it may not invent simulation facts merely to look more alive.
- Apply this split only where representation can honestly remain subordinate to simulation truth.

**Working rule:** degrade expression, never truth; upgrade expression, never invent truth.
