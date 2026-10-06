# CURRENT — Tavern Keeper

## Current slice
Slice 14 — Chronicle & Tavern Legacy

## Status
Implemented as a standalone browser vertical slice on top of offline concurrent autonomous expeditions, objective scoring, facility-scaled preparation, persistent hero careers, crafting, merchants, recruitment and equipment durability.

## Core rules implemented
- `TavernRoster` owns the persistent Chronicle domain. Chronicle state is not reconstructed ad hoc by the browser UI.
- Fresh taverns record an opening milestone and the founding roster.
- Recruited heroes record applicant origin, quality and recruitment cost.
- Every settled contract records hero, contract, outcome, objective score, payout and kills.
- Major objective accomplishments produce dedicated feat entries: designated boss kill, full miner rescue and strong caravan escort.
- Rank increases and newly earned titles produce career advancement entries.
- A hero crossing the career-based legend threshold produces one permanent legend entry. Legend status derives from rank/successes/kills/titles, not random rarity.
- Permanent death produces a Chronicle memorial while the existing Fallen roster remains authoritative.
- Tavern upgrades are recorded. Facility Levels 3 and 6 create one-time milestones.
- Patron-service milestones: 25 / 100 / 500 / 1000 served.
- Tavern-revenue milestones: 100 / 500 / 2500 / 10000 gold service revenue.
- Resolved-contract milestones: 10 / 25 / 50 / 100.
- Persistent records track most contracts, most successes, most kills, most career gold, highest rank, best objective score and largest single-contract payout.
- Fallen heroes remain eligible for records and legendary status.
- Chronicle UI shows six long-term totals, record holders, living/fallen legends and the newest 80 ledger entries.
- Chronicle retains up to 1,000 persistent event entries.
- Slice 13 and older saves without Chronicle data reconstruct founders, applicant origins, prior contracts, explicit death memorials and record holders from existing persistent ledgers.
- `TavernRoster` snapshot version 11 persists Chronicle state.
- Offline settlements use the same settlement path, so contracts completed while away write identical Chronicle history.
- All Slice 1–13 systems remain authoritative.

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
node tests/test_chronicle.js
```

## Known limitations
- Chronicle event retention is capped at the newest 1,000 entries; aggregate career, Fallen, record and milestone state persists independently.
- Legacy migration can reconstruct what old saves recorded, but cannot recreate exact historical wall-clock ordering that was never previously stored.
- Offline progression remains intentionally capped at 8 hours per absence.
- The contract catalog remains five authored contracts rather than a rotating/generated board.
- Concurrent expeditions remain solo-hero assignments; party contracts are not implemented.
- Escort caravan/miner rescue use abstract objective state rather than independent NPC actors.
- Applicants arrive one at a time with no negotiation/reputation layer.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.

## NEXT OPERATION
Slice 15 — Balance, UX & Release Acceptance: treat the current systems as architecture-frozen, run broad seeded balance batches and phone/desktop interaction acceptance, fix pathological economy/readiness/contract/death/idle cases, improve onboarding/readability, and close the prototype as a coherent playable release without adding major new systems.
