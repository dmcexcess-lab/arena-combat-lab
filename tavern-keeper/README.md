# Tavern Keeper — Slice 3: Persistent Heroes

A standalone browser prototype implementing the Tavern Keeper autonomous-contract loop, tavern preparation, and persistent multi-hero careers.

## Run

Open \`index.html\` in a browser. No build step or external dependencies are required.

For a local HTTP server:

\`\`\`bash
python3 -m http.server 8000
\`\`\`

Then open \`http://localhost:8000\`.

The browser build automatically saves to localStorage, including the roster, fallen heroes, shared tavern economy, selected hero and any active expedition.

## Tests

\`\`\`bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
\`\`\`

## Slice 1 foundation retained

- Data-driven autonomous contract simulation.
- Advisory Threat Level with no deployment gate.
- Readable utility-scored AI.
- Simulated combat, retreat, success and permanent death.
- Performance-driven gold/sec with partial-failure rewards.
- Seeded deterministic simulation.

## Slice 2 retained

- Persistent health, hunger, fatigue, morale, supplies and injuries between contracts.
- Meals, rest, morale recovery, first aid, physician treatment and potion purchase.
- Preparation costs shared prototype gold and time.
- One-contract effects such as Hearty Meal, Good Sleep and Patched Up affect the real simulation.
- Persistent injuries affect readiness/combat and can be treated.

## Slice 3

- Real multi-hero roster with three distinct starter heroes.
- Hero-specific persistent career XP, career rank, Melee/Ranged/Survival skills, traits, titles and contract history.
- Skills grow from actual expedition behavior and feed back into readiness and combat.
- Repeated career milestones can evolve traits/titles.
- Surviving heroes come home with their exact condition and improved career state.
- Permanent death removes heroes from the living roster and records them under Fallen.
- Preparation affects only the chosen hero while using the tavern's shared funds/materials/time.
- Expedition proceeds settle once into shared tavern state.
- Full roster state serializes/deserializes.
- Active expedition state serializes/deserializes with RNG/combat/progress state, allowing deterministic refresh/resume.
- Browser localStorage auto-save is wired into preparation, roster selection, loadout changes, expedition ticks and settlement.

## Architecture

\`core.js\` remains the authoritative domain layer.

- \`Expedition\` owns autonomous contract state and now exposes snapshot/restore.
- \`PreparationState\` remains the single-hero preparation authority.
- \`TavernRoster\` owns living heroes, fallen heroes, shared tavern resources, selection, settlement and career persistence.
- \`app.js\` owns browser presentation and localStorage only; it does not duplicate gameplay rules.

## Known limitations

- One active expedition at a time.
- No real recruitment pipeline yet; the prototype starts with three fixed heroes.
- All heroes can permanently die; until recruitment lands, New Tavern is the reset route after a wipe.
- No patron economy, crafting, merchants, offline progression or parties yet.
- Current funds primarily come from expeditions.
- Save data is local to the browser/device.
- Contract presentation remains event/path based and there is still one test contract.

## Next Operation (Slice 4)

Build **Tavern Economy**: patrons, seating, food/drink, service throughput and dependable tavern gold/sec, integrated into the same persistent tavern state so the home economy becomes a true stable counterpart to volatile hero income.
