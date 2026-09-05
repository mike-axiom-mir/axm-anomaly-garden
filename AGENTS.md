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
