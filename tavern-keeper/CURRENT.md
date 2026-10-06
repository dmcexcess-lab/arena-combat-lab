# CURRENT — Tavern Keeper

## Current slice
Slice 7 — Contract Board & Threat Ladder

## Status
Implemented as a standalone browser vertical slice on top of autonomous contracts, preparation/condition, persistent heroes, tavern economy, crafting, and merchants.

## Core rules implemented
- `CONTRACTS` is now the authoritative contract catalog; `CONTRACT_ORDER` is the board order.
- Five contracts are live: Wolves at Briar Farm (Threat 1), Rats Below Greymill (Threat 2), Ashroad Caravan (Threat 3), Blackroot Mine (Threat 4), The Wren Bridge Troll (Threat 6).
- Contracts are data-driven graph mini-RPGs with their own route, optional-risk branches, encounters, objective text, loot profile and performance-income multiplier.
- New enemies support the ladder: Wolf, Bandit, Road Raider, Cave Crawler, Cave Stalker and Bridge Troll, alongside Giant Rat and Dire Rat.
- Threat remains advisory only. Any living hero may deploy to any contract regardless of readiness/risk assessment.
- Contract cards show the selected hero's relative risk, contract kind, threat, income multiplier and material emphasis.
- Higher-threat contracts increase potential gold/sec by scaling the existing performance-pay gains; there is no separate guaranteed high-threat payout.
- Failed/retreated/death outcomes retain gold earned while active and any materials already recovered.
- TavernRoster persists `selectedContractId`; old Slice 6 saves default to Greymill.
- Active Expedition snapshots persist `contractId`; old expedition snapshots without it restore as Greymill.
- Settlement identity includes contract ID, hero ID, seed, elapsed time and outcome so different contracts cannot collide.
- Slice 1 autonomous AI/combat, Slice 2 preparation, Slice 3 persistent heroes, Slice 4 tavern economy, Slice 5 crafting and Slice 6 merchants remain authoritative.

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
```

CI also syntax-checks `core.js` and `app.js`.

## Known limitations
- Only one hero expedition may be active at a time.
- Contract content is now a real ladder but remains five authored contracts rather than procedural contract generation.
- Contract objective types are expressed through route/encounter structure; escort/rescue-specific NPC simulation is not yet separate.
- Recruitment is still the fixed three-hero starter roster.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Equipment has no durability/repair loop.
- Assigned gear remains with a dead hero rather than automatically returning to the tavern.
- Preparation minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.

## NEXT OPERATION
Slice 8 — Recruitment & Applicants: replace the fixed-only roster with tavern visitors/applicants who can be recruited for gold, generate varied stats/traits/starting condition and equipment, and scale applicant quality with tavern development while preserving permanent death and unrestricted contract deployment.
