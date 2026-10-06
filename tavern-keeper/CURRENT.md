# CURRENT — Tavern Keeper

## Current slice
Slice 6 — Merchants & Procurement

## Status
Implemented as a standalone browser vertical slice on top of autonomous contracts, preparation/condition, persistent heroes, live tavern economy, and loot/crafting.

## Core rules implemented
- `MerchantSystem` is persistent and advances on the same real-time tavern clock as patron service.
- A new tavern schedules its first merchant shortly after opening; merchants remain for a finite visit, depart, then another visit is scheduled.
- Merchant visit name, quality, offers, quantities, timers, RNG state and logs persist through browser refresh.
- Merchant quality is derived from tavern development: Seating, Service, Kitchen and Bar levels determine Quality 1–3.
- Merchant stock is finite, rotating, deterministic from merchant RNG and bounded by the merchant quality gate.
- Merchants sell ordinary raw materials and ordinary equipment into the same shared stash/item inventory already used by crafting and hero loadouts.
- Healing Potions may be bought from Quality 2+ merchants at a premium and in limited quantity.
- Quality 3 merchants can surface merchant-only Steel Sword and Chain Mail.
- Crafted-only Scrap Spear, Plated Vest and Field Bandages never appear in merchant stock.
- Purchases spend shared tavern gold, decrement the exact visit offer, and record purchase history.
- Purchased equipment/consumables use the existing shared-stock transfer rules; merchants do not bypass hero inventory ownership.
- Failed purchases from insufficient funds, sold-out offers or absent merchants are atomic and do not mutate state.
- Slice 5 saves without merchant state migrate to a valid future merchant visit.
- Slice 1 autonomous contracts, Slice 2 preparation, Slice 3 persistent careers/death, Slice 4 tavern economy and Slice 5 crafting remain authoritative.

## Tests
Run:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
```

CI also syntax-checks `core.js` and `app.js`.

## Known limitations
- Only one hero expedition may be active at a time.
- There is still only one contract testbed despite the design requiring a contract board with threat levels.
- Merchant archetypes are presentation-light; stock rotation/quality is systemic but haggling/reputation is not implemented.
- Crafting remains four recipes with no craft skill tiers.
- Equipment has no durability/repair loop yet.
- Assigned gear remains with a dead hero rather than automatically returning to tavern stock.
- Preparation-time minutes and live tavern seconds remain separate clocks.
- Offline progression is not implemented.
- Recruitment remains the fixed starter roster.

## NEXT OPERATION
Slice 7 — Contract Board & Threat Ladder: replace the single Greymill test contract with a small authoritative contract catalog spanning multiple threat levels and mini-RPG structures, preserving the rule that any living hero may be sent and failed contracts still pay partial performance rewards.
