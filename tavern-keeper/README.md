# Tavern Keeper — Slice 13: Offline Progression & Return Summary

Tavern Keeper now behaves like an idle game when the browser is closed or suspended.

## Slice 13

- Saves persist a wall-clock checkpoint.
- On reload/resume, up to 8 hours of elapsed time are simulated.
- Catch-up uses the exact same 0.25-second simulation order as live play.
- Tavern patrons continue being served and earning gold.
- Merchants and applicants continue arriving/departing.
- Every expedition keeps its own saved Pause/1×/4×/12× speed.
- Paused expeditions stay paused offline.
- Active expeditions continue normal autonomous AI, objectives, combat, durability, injury and death simulation.
- Offline resolutions use the same settlement path as live resolutions.
- Permanent death, gear loss/recovery, career progress, materials and performance payouts all remain real.
- Mobile/browser hidden state stops the live timer and uses one catch-up on resume, preventing duplicate progress.
- A `While You Were Away` report explains income, visitors, expedition outcomes and ongoing progress.
- Old saves without a timestamp start checkpointing from their first Slice 13 load; unknown historical time is not invented.

## Offline cap

Catch-up is capped at **8 hours per absence**. The return report tells you when the cap was reached and how much additional wall-clock time was intentionally ignored.

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
node tests/test_facilities.js
node tests/test_offline.js
```

## Next Operation (Slice 14)

Build **Chronicle & Tavern Legacy**: preserve and surface the stories created by hero careers, objective feats, deaths, recruitment origins, records and tavern milestones.
