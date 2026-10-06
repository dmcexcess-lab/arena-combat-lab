# CURRENT — Tavern Keeper

## Current slice
Slice 8 — Recruitment & Applicants

## Status
Implemented as a standalone browser vertical slice on top of the persistent tavern, autonomous contract ladder, crafting, merchants and permanent hero careers.

## Core rules implemented
- `RecruitmentSystem` is persistent and advances on the same live tavern clock as patrons and merchants.
- Applicants arrive after a timed interval, remain for a finite hiring window, then move on if not recruited.
- Every applicant is generated once as a complete persistent hero record: stable ID/name, five stats, AI-relevant traits, health, hunger, fatigue, morale, personal equipment, supplies and career-rank-1 state.
- Applicant generation is deterministic from recruitment RNG/save state; accepting an applicant never rerolls them.
- Applicant Quality 1–3 is derived from tavern Seating, Service, Kitchen and Bar development.
- Higher applicant quality raises stat floors, improves likely condition, adds a second trait at Quality 3 and raises the ceiling on personal starting gear.
- Quality 3 applicants can arrive with premium Steel Sword / Chain Mail; Scrap Spear, Plated Vest and Field Bandages remain crafting-exclusive.
- Recruitment cost is explicit and derived from applicant quality, stats and equipment.
- Recruiting spends exact shared tavern gold and transfers the exact inspected applicant into the living roster.
- Recruited heroes use the same preparation, shared-stock equipment/consumable transfer, contract board, career XP/skills/traits/titles and permanent-death/Fallen archive as founding heroes.
- Any recruited hero may be deployed to any Threat 1/2/3/4/6 contract; threat remains advisory.
- A tavern with zero living heroes continues patron/merchant/applicant simulation and can rebuild its roster through recruitment instead of requiring a reset.
- Recruitment visit/RNG/log/counters plus recruitment history persist in save version 8.
- Slice 7 saves without recruitment state migrate to a valid scheduled first applicant.
- All Slice 1–7 systems remain authoritative.

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
```

CI also syntax-checks `core.js` and `app.js`.

## Known limitations
- Only one hero expedition may be active at a time.
- Applicants arrive one at a time and have no manual dismiss/negotiation/reputation layer yet.
- The original three heroes remain the founding roster, but they are no longer the only source of heroes.
- Applicant quality is tavern-development driven but there are no dedicated recruitment-room upgrades yet.
- Equipment has no durability/repair loop.
- Assigned gear remains with a dead hero rather than being recovered or explicitly lost through a gear-recovery rule.
- Crafting remains four recipes with no craft skill progression.
- Merchants have no haggling/reputation.
- Preparation minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.

## NEXT OPERATION
Slice 9 — Equipment Durability & Maintenance: add persistent wear from contracts, repair/maintenance at the tavern using gold/materials, meaningful broken/damaged gear effects, and an explicit death gear-recovery/loss rule so crafted and purchased equipment becomes a long-term management asset.
