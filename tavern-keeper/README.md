# Tavern Keeper — Slice 7: Contract Board & Threat Ladder

A standalone browser prototype combining a persistent tavern with autonomous heroes who can now be sent into a real ladder of mini-RPG contracts.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

Local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The browser build auto-saves roster, selected contract, active expedition/contract ID, tavern economy, crafting and merchant state to localStorage.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
node tests/test_contracts.js
```

## Slice 7

- The single Greymill test contract is now an authoritative five-contract board.
- Threat ladder: 1 Wolves at Briar Farm, 2 Rats Below Greymill, 3 Ashroad Caravan, 4 Blackroot Mine, 6 The Wren Bridge Troll.
- Contracts differ in route graphs, optional-risk decisions, enemy mixes, material profiles and performance-income multipliers.
- The board displays hero-relative risk but never gates deployment.
- Any living hero may be sent to any contract, including obviously bad matchups.
- Failure remains productive: gold earned before retreat/death and materials already recovered are retained.
- Higher threat means higher potential performance-pay growth, not a guaranteed completion payout.
- Selected contract persists with the tavern.
- Mid-expedition saves persist the exact contract and resume deterministically.
- Old saves and old expedition snapshots default safely to Greymill.
- Settlement keys now include contract ID.

## Contract types

- **Hunt:** Wolves at Briar Farm — short, low-threat rural route with herb-heavy loot.
- **Extermination:** Rats Below Greymill — branching cellar infestation and mixed crafting materials.
- **Escort:** Ashroad Caravan — repeated ambushes with a risky shortcut and scrap-heavy loot.
- **Delve:** Blackroot Mine — deep route, dangerous side chambers and rare-gland emphasis.
- **Boss Hunt:** The Wren Bridge Troll — short brutal route, optional troll lair and highest income multiplier.

## Retained foundations

- Slice 1: autonomous AI/combat, readable decisions and performance gold/sec.
- Slice 2: needs, injuries, preparation and treatment.
- Slice 3: persistent careers, progression and permanent-death archive.
- Slice 4: patron service and stable tavern income.
- Slice 5: material crafting and real inventory ownership.
- Slice 6: timed merchants and procurement.

## Architecture

`core.js` remains the single gameplay authority.

- `CONTRACTS` / `CONTRACT_ORDER` own board content and ordering.
- `Expedition` consumes a selected contract graph generically rather than containing contract-specific logic.
- `TavernRoster.selectedContractId` persists board selection.
- `Expedition.snapshot()` persists `contractId`; restore resolves it from the contract catalog.
- `app.js` renders the board and invokes the existing authoritative deployment path.

## Known limitations

- Five authored contracts; no procedural contract generation.
- Escort/rescue labels currently use the generic location/encounter simulation rather than separate escorted-NPC actors.
- One active expedition at a time.
- Fixed starter roster; recruitment is next.
- No durability, offline progression, merchant reputation or crafting skill.

## Next Operation (Slice 8)

Build **Recruitment & Applicants**: applicants generated through the tavern, explicit recruitment costs, varied stats/traits/condition/starting gear, applicant quality influenced by tavern development, and permanent-death replacement without turning heroes into interchangeable level-scaled units.
