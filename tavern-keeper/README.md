# Tavern Keeper — Slice 10: Concurrent Expeditions & Hero Assignment

Heroes can now be assigned to independent contracts simultaneously while the tavern continues operating.

## Slice 10

- Deploy multiple different living heroes at once.
- One hero cannot occupy more than one unsettled expedition.
- Every expedition has its own persistent contract, RNG state, condition, gold, progress, speed and outcome.
- Pause/1×/4×/12× is per expedition rather than global.
- Expedition tabs let you inspect and control one run while all other unpaused runs continue.
- Non-deployed heroes remain available for tavern preparation, equipment, maintenance and new assignments.
- Tavern patrons, merchants and applicants continue operating independently.
- Each completed expedition settles into the correct hero career/Fallen state and shared tavern economy.
- Persistent expedition IDs prevent payout collisions when a hero later repeats an identical deterministic contract and seed.
- Completed reports can be closed individually without disturbing other expeditions.
- Existing Slice 9 single-expedition saves migrate into the new manager.

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
```

## Next Operation (Slice 11)

Build **Objective Mechanics & Partial Contract Scoring** so Hunt, Extermination, Escort, Delve and Boss Hunt contracts differ mechanically instead of only through route/enemy data, with explicit sub-objectives and granular paid-failure results.
