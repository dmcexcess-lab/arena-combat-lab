# Tavern Keeper — Slice 4: Tavern Economy

A standalone browser prototype combining autonomous hero contracts with a persistent tavern that now earns its own stable income by actually serving patrons.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

Local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The browser build auto-saves roster, fallen heroes, active expedition state and the live tavern economy to localStorage.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
```

## Slice 4

- Patron arrivals are simulated instead of paying a flat passive rate.
- Patrons take seats, queue when full, order food/drink, wait for service, pay and linger before leaving.
- Tavern income is constrained by arrival rate, seating and service capacity.
- Projected tavern gold/sec describes the current steady-state service configuration; rolling gold/sec shows recent realized sales.
- Seating upgrades add seats; Service upgrades increase throughput; Kitchen and Bar upgrades increase order value.
- Patron overflow can walk away when both seats and queue are saturated.
- Patron revenue deposits into the same shared funds used for hero preparation and tavern upgrades.
- Hero expedition income remains independently performance-driven, so stable home income and risky field income are visible as different systems.
- The tavern keeps serving in real time while a contract runs or the hero simulation is paused.
- Tavern RNG, active patrons, queue, upgrade levels, revenue and counters persist through browser refresh.

## Retained foundations

- Slice 1: autonomous contract AI, combat, readable decisions, threat ratings, partial rewards and performance gold/sec.
- Slice 2: persistent health/hunger/fatigue/morale, injuries, meals/rest/treatment and preparation tradeoffs.
- Slice 3: multiple persistent heroes, XP/rank/skills, traits/titles, career history, permanent-death archive and deterministic mid-expedition resume.

## Architecture

`core.js` remains the authoritative domain layer.

- `Expedition` owns autonomous contract state.
- `PreparationState` owns one-hero tavern preparation.
- `TavernRoster` owns living/fallen heroes plus shared resources and settlement.
- `TavernEconomy` owns patrons, seats, service flow, food/drink revenue and tavern upgrades.
- `app.js` owns browser rendering, timers and localStorage only.

## Known limitations

- One active expedition at a time.
- No actual food/drink inventory or crafting consumption yet.
- Tavern patron archetypes and service are intentionally compact.
- Preparation time and live tavern time are separate clocks for now.
- No offline progression yet.
- Fixed starter roster; recruitment comes later.
- One contract remains the content testbed.

## Next Operation (Slice 5)

Build **Loot & Crafting**: make recovered materials useful through a deliberately compact recipe/equipment/consumable system, integrated with the shared tavern inventory and existing hero loadouts.
