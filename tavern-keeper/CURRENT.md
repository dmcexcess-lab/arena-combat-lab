# CURRENT — Tavern Keeper

## Current slice
Slice 4 — Tavern Economy

## Status
Implemented as a standalone browser vertical slice on top of the autonomous contract, preparation and persistent-roster systems.

## Core rules implemented
- Persistent TavernEconomy is now part of TavernRoster and shares the same save state.
- Patrons arrive over real time using deterministic seeded simulation.
- Patrons occupy limited seats, queue when full, place food/drink orders, consume service capacity, pay, linger and leave.
- Queue overflow can lose patrons, making seating and service throughput meaningful.
- Tavern gold/sec is derived from patron arrival, seating capacity, service throughput and average order value rather than a flat additive timer.
- UI exposes projected gold/sec and rolling realized gold/sec separately.
- Seating upgrades add physical capacity.
- Service upgrades reduce service time and eventually add concurrent service slots.
- Kitchen upgrades increase food revenue per order.
- Bar upgrades increase drink revenue per order.
- Tavern patron revenue deposits directly into shared tavern funds.
- Expedition performance income remains separate and volatile; both sources feed the same spendable fund pool.
- Tavern service continues at real-time speed while an expedition runs and while hero simulation is paused.
- Tavern economy persists seats, upgrade levels, patrons, queue, RNG state, revenue counters and recent service state through browser refresh.
- Slice 1 autonomous contracts, Slice 2 preparation/condition, and Slice 3 hero careers/death/persistence remain authoritative.

## Tests
Run:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
```

CI also syntax-checks core.js and app.js.

## Known limitations
- Only one hero expedition may be active at a time.
- Patron economy currently has one compact set of patron archetypes and food/drink abstractions; inventory/recipes are not implemented yet.
- Tavern upgrade set is intentionally small; deeper facility progression belongs to a later slice.
- Preparation-time minutes and live tavern seconds are not yet unified into one world clock.
- Offline earnings are not implemented yet; tavern income advances only while the page is active.
- Recruitment remains the fixed Slice 3 starter roster.
- Contract content remains one test contract.

## NEXT OPERATION
Slice 5 — Loot & Crafting: turn recovered contract materials into an authoritative crafting inventory and recipes for weapons, armor, potions and useful expedition items, while preserving merchant procurement for a later slice.
