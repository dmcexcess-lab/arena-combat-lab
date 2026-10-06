# Tavern Keeper — Slice 6: Merchants & Procurement

A standalone browser prototype combining autonomous hero contracts, tavern management, crafting, and now timed visiting merchants that provide a second explicit acquisition path.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

Local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The browser build auto-saves roster, active expedition, tavern economy, crafting state, merchant visit state and purchase history to localStorage.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
```

## Slice 6

- Merchants visit on a real timer tied to live tavern operation rather than existing as a permanent shop.
- Every visit has finite rotating stock, finite quantities and a departure timer.
- Tavern Seating, Service, Kitchen and Bar development determines merchant Quality 1–3.
- Merchants can sell ordinary contract materials, baseline gear and limited Healing Potions.
- Quality 3 unlocks merchant-only Steel Sword and Chain Mail procurement.
- Crafted-only Scrap Spear, Plated Vest and Field Bandages remain exclusive to crafting.
- Purchases spend the same shared tavern gold used everywhere else and deposit into the authoritative material/item stash.
- Purchased equipment and consumables still must be assigned from shared stock to heroes; merchants do not directly equip characters.
- Merchant visits, offer quantities, RNG state and purchase history persist through refresh.
- Slice 5 saves migrate automatically with no active merchant and a scheduled first visit.

## Retained foundations

- Slice 1: autonomous contracts, readable AI, combat, failure rewards and performance gold/sec.
- Slice 2: needs/moodlets, injuries, preparation and treatment.
- Slice 3: persistent multi-hero careers, progression and permanent-death archive.
- Slice 4: patron service and stable tavern gold/sec.
- Slice 5: recovered-material crafting and real shared inventory ownership.

## Architecture

`core.js` remains the single gameplay authority.

- `MerchantSystem` owns visit timing, merchant quality, finite stock generation and visit persistence.
- `MERCHANT_GOODS` is the procurement catalog and explicitly excludes crafted-only items.
- `TavernRoster.purchaseMerchantOffer()` is the authoritative purchase transaction into shared stash/inventory.
- Existing `equipInventoryItem()` / `giveConsumable()` remain the only player-facing transfer path from stock to heroes.
- `app.js` only renders merchant state and invokes authoritative transactions.

## Known limitations

- One contract testbed remains; the core multi-threat contract board is next.
- No merchant haggling, reputation or special requests.
- No durability/repair loop.
- Fixed starter roster.
- No offline progression.

## Next Operation (Slice 7)

Build **Contract Board & Threat Ladder**: multiple autonomous mini-RPG contracts with explicit threat levels, different route/objective structures and material profiles. Any living hero must remain deployable to any contract, and partial rewards must remain available on failure.
