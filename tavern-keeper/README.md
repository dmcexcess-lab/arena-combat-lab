# Tavern Keeper — Slice 11: Objective Mechanics & Partial Contract Scoring

Contracts are now mechanically different mini-RPGs with visible sub-objectives and paid partial success.

## Slice 11

- **Hunt:** track the wolf pack, cull quarry, clear the den.
- **Extermination:** reach the infestation, kill vermin, destroy the main nest.
- **Escort:** protect checkpoints and preserve caravan integrity; the caravan can be destroyed while the hero survives.
- **Delve:** discover deep chambers, find missing miners and rescue as many as possible.
- **Boss Hunt:** reach the bridge, earn credit at boss-damage milestones and kill the designated bridge troll.
- Every sub-objective immediately pays a small gold bonus and raises performance gold/sec.
- Retreat, failure or death keeps all objective rewards already earned.
- Successful contracts finish at 100 objective score.
- Objective state, score, events and bonus gold persist across saves and concurrent expeditions.
- The expedition UI shows live objective state and the final report itemizes exactly what paid.

## Run

Open `index.html` directly or serve the folder locally with `python3 -m http.server 8000`.

## Tests

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

## Next Operation (Slice 12)

Build **Tavern Facilities & Preparation Depth** so home upgrades directly improve meals, rest, morale, treatment and maintenance outcomes and therefore materially change contract readiness.
