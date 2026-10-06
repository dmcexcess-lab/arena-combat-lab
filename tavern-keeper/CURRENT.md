# CURRENT — Tavern Keeper

## Current slice
Slice 13 — Offline Progression & Return Summary

## Status
Implemented as a standalone browser vertical slice on top of concurrent autonomous expeditions, objective scoring, facility-scaled preparation, persistent hero careers, crafting, merchants, recruitment and equipment durability.

## Core rules implemented
- Browser saves now include a wall-clock checkpoint (`savedAtMs`) in save version 4.
- Closing/reloading the browser or resuming from a hidden/suspended page advances the simulation for the elapsed wall-clock interval.
- Offline catch-up is capped at 8 hours. Time beyond the cap is reported but not simulated.
- Catch-up uses the exact same authoritative 0.25-second live order: tavern tick → all expedition ticks at their saved personal speeds → core settlement.
- Pause/1×/4×/12× remains per expedition offline. A manually paused hero stays paused.
- Offline autonomous expeditions preserve the same RNG, objective, combat, injury, consumable, durability, retreat, success, failure and death rules as live play.
- `settleResolvedExpeditions()` is now the shared core settlement path for both online and offline resolution.
- Offline settlement preserves performance/objective gold, materials, career XP/traits/titles, permanent death/Fallen history and death gear recovery/loss.
- Tavern patron service continues offline and adds real shared tavern income.
- Merchant and applicant timers continue offline; visits may arrive and depart while away, with visit counts reported on return.
- Hidden pages checkpoint immediately and the live interval stops while `document.hidden`; visible resume performs exactly one catch-up to avoid double-counting throttled background timers.
- Legacy saves without a wall-clock checkpoint migrate safely but receive no guessed retroactive progress.
- The `While You Were Away` panel reports simulated duration, cap truncation, tavern income, expedition payouts, patrons served, visitor counts, resolved expeditions/deaths and still-active/paused field progress.
- Production cap benchmark: full 8-hour/115,200-quantum catch-up completed correctly in the staged JS runtime.
- All Slice 1–12 systems remain authoritative.

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
node tests/test_offline.js
```

## Known limitations
- Offline progression is intentionally capped at 8 hours per absence.
- Visitors that arrive and leave while offline are summarized by visit count; missed merchant stock/applicants are not retained as a historical shop queue.
- The contract catalog remains five authored contracts rather than a rotating/generated board.
- Concurrent expeditions remain solo-hero assignments; party contracts are not implemented.
- Escort caravan/miner rescue use abstract objective state rather than independent NPC actors.
- Applicants arrive one at a time with no negotiation/reputation layer.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Preparation minutes and live tavern seconds remain separate clocks.

## NEXT OPERATION
Slice 14 — Chronicle & Tavern Legacy: turn accumulated hero careers, objective accomplishments, deaths, contracts, recruitment origins and tavern milestones into a persistent readable chronicle with records/legends, so long-term idle play produces history rather than only larger numbers.
