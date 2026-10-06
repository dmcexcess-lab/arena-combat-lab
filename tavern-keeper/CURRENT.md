# CURRENT — Tavern Keeper

## Current slice
Slice 15 — Balance, UX & Release Acceptance

## Status
Release candidate. Architecture is frozen. The full planned feature-slice sequence is complete.

## Release acceptance
- Broad seeded balance batch: 250 seeds per founder build per contract, plus deliberately unprepared controls.
- Founding-roster aggregate success by board threat is approximately 100% / 99% / 27% / 25% / 15% for Threat 1 / 2 / 3 / 4 / 6.
- Threat 6 is now the hardest aggregate contract. Blackroot Mine no longer exceeds it because of encounter-density accident.
- Wren Bridge troll release stats: 142 HP, 14–23 damage, 0.80 accuracy, 4 defense, 0.94 danger.
- Blackroot release adjustment reduces excess lower-tunnel/brood/miner encounter density without changing its objective graph or contract identity.
- Deliberately unprepared heroes remain at or below 2% success on every contract.
- Cautious Edrin/Mara usually retreat from lethal upper-tier contracts; reckless Borin retains roughly 65–74% death rates on Threat 3–6.
- Upper-tier non-success runs retain positive partial performance/objective gold.
- Seeded 5-minute tavern economy remains bounded: baseline about 76.8g; fully developed about 232.65g.
- Starting functional tavern upgrades remain in the 20–34g range, allowing immediate choices from the 30g starting bankroll.
- Offline progression remains capped at 8 hours and uses authoritative 0.25-second ticks.

## Release UX
- Added a visible four-step onboarding path: Earn → Prepare → Choose Risk → Send Them.
- Onboarding explicitly states that heroes act autonomously, partial success pays and death is permanent while the tavern survives.
- Mobile header stacks cleanly and top stats become a 2×2 compact grid.
- Coarse-pointer controls have at least 44px touch height.
- Numeric inputs use 16px text on touch devices to avoid unwanted iOS focus zoom.
- Existing portrait contract-board, crafting, merchant, recruitment, expedition and Chronicle responsive layouts remain authoritative.

## Tests
CI release gate:

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
node tests/test_release.js
```

## Architecture freeze
- Do not add another numbered feature slice by default.
- Current systems are the release architecture: tavern economy, recruitment, preparation/facilities, crafting/merchants, persistent autonomous heroes, contracts/objectives, concurrency, durability/death, offline progression and Chronicle.
- Future changes should be driven by observed playtest defects, balance evidence, accessibility problems or release-quality polish.
- Do not expand into parties, procedural contract generation, haggling/reputation, deeper crafting progression or other new subsystems unless the product direction is deliberately reopened.

## Known release limitations
- Offline progression is intentionally capped at 8 hours per absence.
- The contract board contains five authored contracts.
- Expeditions are solo-hero assignments.
- Escort caravan and miner rescue use abstract objective state rather than independently simulated NPC actors.
- Merchant and applicant systems are deliberately lightweight.
- Chronicle retains the newest 1,000 individual events while aggregate records/milestones persist.
- Browser UI acceptance is automated structurally; physical-device Safari/Firefox feel still requires human playtesting.

## NEXT OPERATION
Release maintenance only — playtest the deployed build, fix reproducible defects or demonstrated balance/UX problems, and preserve the frozen architecture unless product scope is intentionally reopened.
