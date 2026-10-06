# CURRENT — Tavern Keeper

## Current slice
Slice 5 — Loot & Crafting

## Status
Implemented as a standalone browser vertical slice on top of autonomous contracts, preparation/condition, persistent heroes, and the live tavern economy.

## Core rules implemented
- Contract materials settle into one persistent shared tavern material stash.
- `CRAFT_RECIPES` is the authoritative compact recipe catalog.
- Current recipes: Scrap Spear, Plated Vest, Healing Potion, Field Bandages.
- Crafting consumes exact raw materials atomically and advances preparation time.
- Crafted outputs enter persistent shared tavern item stock.
- Weapons/armor must exist in shared stock before a hero can equip them through the player UI.
- Equipping a stored weapon/armor consumes that stock item and returns the hero's replaced gear to shared stock.
- Healing Potions and Field Bandages must be transferred from shared stock into a hero's capped supplies.
- Field Bandages are real autonomous expedition consumables: heroes can use them during combat to heal moderate damage and reduce lingering injury.
- Crafted equipment uses the same live EQUIPMENT catalog as combat/readiness; Scrap Spear and Plated Vest therefore alter actual outcomes rather than UI-only stats.
- The old direct `buy_potion` preparation action is retired. Potions come from crafting until merchant procurement is implemented.
- Craft history and item inventory persist alongside roster, tavern, economy, death archive and active expedition state.
- Slice 4 saves without crafting fields migrate to empty item stock/craft history.
- Slice 1 autonomous contracts, Slice 2 preparation/condition, Slice 3 persistent careers/death, and Slice 4 tavern economy remain authoritative.

## Tests
Run:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
```

CI also syntax-checks `core.js` and `app.js`.

## Known limitations
- Only one hero expedition may be active at a time.
- Crafting is intentionally compact: four recipes and no recipe discovery tiers yet.
- No merchants/procurement exist yet; direct potion buying was removed rather than faking that system.
- Equipment has no durability/repair loop yet.
- Equipped gear on a dead hero is not automatically returned to tavern stock; death therefore currently risks assigned gear.
- Materials currently come from the single Greymill test contract.
- Preparation-time minutes and live tavern seconds are still separate clocks.
- Offline progression is not implemented yet.
- Recruitment remains the fixed starter roster.

## NEXT OPERATION
Slice 6 — Merchants & Procurement: add visiting merchants with persistent/rotating stock, gold-based purchasing of ordinary gear/materials/consumables, merchant quality tied to tavern development, and clean interaction with the same shared item/material inventories without replacing crafting.
