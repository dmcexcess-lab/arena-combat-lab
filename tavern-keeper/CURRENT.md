# CURRENT — Tavern Keeper

## Current slice
Slice 10 — Concurrent Expeditions & Hero Assignment

## Status
Implemented as a standalone browser vertical slice on top of the persistent tavern, contract ladder, durability/maintenance, crafting, merchants, recruitment and permanent hero careers.

## Core rules implemented
- `ExpeditionManager` is the authoritative multi-expedition field layer.
- Multiple different living heroes may be deployed at the same time, including to different contracts and threat levels.
- Every expedition has a persistent unique ID, assigned hero, independent RNG/simulation state, speed, income, hero condition, contract progress, outcome and settlement/report state.
- A hero cannot be deployed twice and remains assigned until their current expedition is settled.
- Each expedition independently supports Pause, 1×, 4× and 12× simulation speed.
- Selecting one expedition only changes the detailed viewer/control focus; all other unpaused expeditions continue simulating.
- The tavern economy, merchants and applicants continue on the live tavern clock while expeditions run.
- Non-deployed heroes remain selectable and can be fed, rested, treated, repaired, equipped, supplied and assigned to additional contracts.
- Contract-board selection remains available while other expeditions are active.
- Completed expeditions settle independently into shared gold/materials and the correct hero's career, injuries, durability or Fallen record.
- Persistent expedition IDs are used for settlement identity, so deterministic repeat runs by the same hero/contract/seed can pay correctly while the same expedition cannot pay twice.
- Resolved settled reports may remain visible until individually closed; closing one report never affects other active/completed expeditions.
- Browser save version 3 persists the full ExpeditionManager state.
- Slice 9 single-expedition browser saves migrate into one managed expedition entry without changing the expedition snapshot.
- All Slice 1–9 systems remain authoritative.

## Tests
Run:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
node tests/test_contracts.js
node tests/test_recruitment.js
node tests/test_durability.js
node tests/test_concurrency.js
```

## Known limitations
- Contract types still share the same generic route/encounter engine; Escort/Delve/Boss Hunt labels are not yet distinct objective simulations.
- Concurrent expeditions are solo-hero assignments; party contracts are not implemented.
- Applicants arrive one at a time with no negotiation/reputation layer.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Repairs use generic Scrap Iron rather than item-specific maintenance recipes.
- Preparation minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.

## NEXT OPERATION
Slice 11 — Objective Mechanics & Partial Contract Scoring: make Hunt, Extermination, Escort, Delve and Boss Hunt contracts mechanically distinct with explicit sub-objectives and granular partial-success rewards while preserving autonomous hero decision-making and paid failure.
