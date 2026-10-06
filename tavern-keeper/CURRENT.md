# CURRENT — Tavern Keeper

## Current slice
Slice 11 — Objective Mechanics & Partial Contract Scoring

## Status
Implemented as a standalone browser vertical slice on top of concurrent autonomous expeditions, persistent hero careers, tavern economy, crafting, merchants, recruitment and equipment durability.

## Core rules implemented
- Every contract exposes explicit `subObjectives` and `objectiveRules` in the authoritative contract catalog.
- Every expedition owns a persistent objective scorecard: objective score/max, objective state, completed objective events, objective awards and objective bonus gold.
- Sub-objectives immediately add banked gold and increase the existing performance gold/sec rate. Their value survives retreat, ordinary failure and hero death.
- Successful contracts close the objective scorecard at 100 without erasing granular objective history.
- Hunt: finding the pack trail, culling wolves up to the target and clearing the den are separately scored.
- Extermination: reaching the infestation, culling vermin up to the target and destroying the main nest are separately scored.
- Escort: checkpoint protection is scored and caravan integrity is a live objective resource. Enemy pressure can destroy the caravan and produce a contract `failure` while the hero remains alive.
- Delve: deep-location discoveries, finding missing miners and the number of miners rescued are separately scored. Rescue count uses the hero's Wits + Survival capability.
- Boss Hunt: only the designated Wren Bridge boss counts for boss-damage scoring; 25/50/75% damage milestones and the boss kill pay independently. The optional lair troll does not falsely complete the boss objective.
- Career XP uses the better of route progress or objective score so meaningful partial objective performance is recognized.
- Expedition summary/report UI shows objective score, objective-specific live state, objective bonus gold and each paid sub-objective event.
- Expedition snapshot version 4 persists objective state/events/awards/bonus gold.
- Slice 10 expedition snapshots without objective fields migrate safely using existing route progress as initial score.
- Concurrent expeditions independently maintain and settle their own scorecards.
- All Slice 1–10 systems remain authoritative.

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
node tests/test_objectives.js
```

## Known limitations
- The contract catalog remains five authored contracts rather than a rotating/generated board.
- Escort cargo/caravan is modeled as integrity rather than individual escorted NPC actors.
- Delve rescue resolves rescued-miner count at the rescue encounter rather than simulating each miner as an actor.
- Concurrent expeditions remain solo-hero assignments; party contracts are not implemented.
- Tavern upgrades mostly affect revenue and visitor quality; preparation actions do not yet scale deeply with facilities.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Preparation minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.

## NEXT OPERATION
Slice 12 — Tavern Facilities & Preparation Depth: make Kitchen, Bar/Commons, lodging/rest and treatment/maintenance quality materially change hero preparation outcomes and readiness, so the stable tavern progression loop directly improves contract performance rather than only income and visitor quality.
