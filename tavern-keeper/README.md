# Tavern Keeper — Slice 5: Loot & Crafting

A standalone browser prototype where autonomous heroes bring materials back to a persistent tavern, and those materials now become real equipment and supplies through crafting.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

Local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The browser build auto-saves the roster, active expedition, tavern economy, raw-material stash, crafted/stored item inventory and craft history to localStorage.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
```

## Slice 5

- Recovered contract loot feeds a visible shared raw-material stash.
- Four compact recipes are authoritative in `CRAFT_RECIPES`: Scrap Spear, Plated Vest, Healing Potion and Field Bandages.
- Recipes consume exact materials and preparation time; insufficient materials fail without partial consumption.
- Crafted outputs enter shared tavern item stock.
- Stored weapons/armor must be transferred to a hero to equip them; the replaced item returns to stock.
- The old free weapon/armor dropdown is gone from the player flow.
- Crafted consumables must be handed from stock to a hero and obey carrying caps.
- Field Bandages are autonomously used by wounded heroes and can reduce lingering injury.
- Scrap Spear / Plated Vest use the live combat equipment catalog, so crafting changes actual readiness and combat.
- Direct invisible potion purchasing is retired. Merchant purchasing arrives in Slice 6 instead of being faked now.
- Craft stock/history migrate and persist with the existing Slice 3/4 browser save.

## Retained foundations

- Slice 1: autonomous contracts, readable AI, combat, partial rewards and performance gold/sec.
- Slice 2: needs/moodlets, injuries, tavern preparation and treatment.
- Slice 3: persistent multi-hero careers, progression, death archive and deterministic resume.
- Slice 4: live patron service economy and stable tavern income.

## Architecture

`core.js` remains the single gameplay authority.

- `EQUIPMENT` defines live gear/consumable mechanics.
- `CRAFT_RECIPES` defines crafting inputs/outputs.
- `Expedition` owns autonomous field behavior.
- `PreparationState` owns hero preparation.
- `TavernEconomy` owns patron service/income.
- `TavernRoster` owns heroes, shared funds/materials, crafted item stock, crafting, settlement and persistence.
- `app.js` renders those systems and localStorage state without duplicating crafting rules.

## Known limitations

- Four recipes only; no recipe discovery or craft skill progression yet.
- No merchant/shop system yet.
- No durability/repair loop.
- Assigned equipment currently remains with a dead hero rather than being automatically recovered.
- One active expedition and one contract testbed.
- No offline progression yet.

## Next Operation (Slice 6)

Build **Merchants & Procurement**: visiting merchants with rotating stock, gold-based purchases of ordinary gear/materials/consumables, and merchant quality that improves with tavern development while remaining complementary to crafting.
