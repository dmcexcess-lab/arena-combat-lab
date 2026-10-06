# CURRENT — Tavern Keeper

## Current slice
Slice 9 — Equipment Durability & Maintenance

## Status
Implemented as a standalone browser vertical slice on top of the persistent tavern, autonomous contract ladder, crafting, merchants, recruitment and permanent hero careers.

## Core rules implemented
- Durable weapons/armor now carry persistent per-copy condition in equipped hero state and shared tavern stock.
- Condition tiers: Serviceable 60–100% = full stats; Worn 30–59% = 80%; Damaged 1–29% = 60%; Broken 0% = 25%.
- Weapon durability drops when the hero attacks; armor durability drops when hostile hits land.
- Readiness and real combat damage/defense use durability-adjusted gear effectiveness.
- Crafting and merchant purchases create pristine durable copies.
- Equipping takes the best-condition stored copy and returns replaced gear to stock with its existing condition.
- Equipped and stored gear can be repaired to 100% using tavern gold, preparation time and Scrap Iron for substantial damage.
- Repair history persists.
- On hero death before 50% objective progress, equipped durable gear is lost.
- On hero death at/after 50% objective progress, equipped durable gear is recovered into shared stock at no more than 35% condition.
- Expedition summaries persist death gear recovery/loss results.
- Save version 9 persists equipped durability, per-copy stock durability and repair history.
- Slice 8 saves without durability fields migrate equipped and stored gear to pristine condition.
- All Slice 1–8 systems remain authoritative.

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
```

## Known limitations
- Only one hero expedition may be active at a time.
- Repairs use one generic repair material (Scrap Iron); material-specific repair recipes are not implemented.
- Durability is combat-use driven; environmental wear is not yet modeled.
- Applicants arrive one at a time with no negotiation/reputation layer.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Preparation minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.

## NEXT OPERATION
Slice 10 — Concurrent Expeditions & Hero Assignment: allow multiple living heroes to be deployed on separate contracts at the same time while the tavern continues operating, with independent simulation state, settlement, death, income and persistence per expedition.
