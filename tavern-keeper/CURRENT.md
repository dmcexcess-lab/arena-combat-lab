# CURRENT — Tavern Keeper

## Current slice
Slice 12 — Tavern Facilities & Preparation Depth

## Status
Implemented as a standalone browser vertical slice on top of concurrent autonomous expeditions, objective scoring, persistent hero careers, tavern economy, crafting, merchants, recruitment and equipment durability.

## Core rules implemented
- Tavern development now directly improves hero preparation instead of only patron revenue and visitor quality.
- Existing Kitchen and Bar are hero-facing facilities; new permanent facilities are Lodging, Infirmary and Workshop.
- All hero-facing facilities start at Level 1, upgrade through shared tavern gold and cap at Level 6.
- Kitchen scales Simple/Hearty Meal hunger and morale recovery, shortens meal actions and strengthens/extends the Hearty Meal expedition buff.
- Bar/Commons scales Unwind morale/fatigue recovery; developed Commons grant Good Company, a persistent readiness/combat/retreat benefit whose potency/duration scales with facility level.
- Lodging scales Nap and Full Rest fatigue/health/morale recovery, shortens rest time and strengthens/extends Good Sleep.
- Infirmary scales First Aid/Physician healing, shortens treatment and removes more injury severity/additional injuries at higher levels; Patched Up potency/duration also scales.
- Workshop reduces repair gold/time costs, reduces Scrap Iron cost on major repairs at Level 4+, and shortens crafting time without changing recipes/material/output.
- `TavernRoster.preparationQuote()` and `craftQuote()` are authoritative UI/execution quotes; repair UI uses the same `repairQuote(..., workshopLevel)` path as execution.
- Level 1 preparation/repair/crafting remains backward-compatible with previous slices.
- Prep UI displays the responsible facility level and exact adjusted action time; crafting/repair UI displays Workshop-adjusted values.
- `TavernEconomy` snapshot version 2 persists Lodging/Infirmary/Workshop levels.
- `TavernRoster` snapshot version 10 persists the nested facility state.
- Older saves without the new facility fields migrate Lodging/Infirmary/Workshop to Level 1 while preserving existing Kitchen/Bar values.
- All Slice 1–11 systems remain authoritative.

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
node tests/test_facilities.js
```

## Known limitations
- Offline progression is not implemented; closing the browser freezes the simulation.
- The contract catalog remains five authored contracts rather than a rotating/generated board.
- Concurrent expeditions remain solo-hero assignments; party contracts are not implemented.
- Escort caravan/miner rescue use abstract objective state rather than independent NPC actors.
- Applicants arrive one at a time with no negotiation/reputation layer.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Preparation minutes and live tavern seconds remain separate clocks.

## NEXT OPERATION
Slice 13 — Offline Progression & Return Summary: persist a wall-clock checkpoint and safely advance tavern service plus active autonomous expeditions across a bounded offline interval, preserving deterministic settlement/death/objective/durability rules and presenting a clear return summary of what happened while the tavern was closed.
