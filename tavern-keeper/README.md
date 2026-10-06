# Tavern Keeper — Slice 2: Preparation & Condition

A standalone browser prototype implementing the real Tavern Keeper contract simulation plus the tavern-side preparation loop.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

For a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
```

## Slice 1 foundation retained

- Data-driven hero stats, traits, needs/moodlets, equipment and supplies.
- Branching Threat 2 contract (`Rats Below Greymill`).
- Advisory hero-relative risk assessment; deployment is never blocked.
- Seeded deterministic RNG.
- Utility-scored autonomous decisions with readable reasons and debug scores.
- Simulated combat with melee/ranged behavior, mitigation, autonomous healing, retreat and death.
- Dynamic performance gold/sec that ramps from accomplishments and stops at resolution.
- Partial-progress tracking, recovered materials and success/retreat/death summaries.

## Slice 2

- A persistent tavern-side `PreparationState` owns the current hero, funds, recovered materials and preparation time.
- Health, hunger, fatigue, morale, potions and injuries survive a successful/retreated expedition and come home with the hero.
- Preparation actions: Simple Meal, Hearty Meal, Nap, Unwind, Full Rest, First Aid, Physician and Buy Potion.
- Preparation costs gold and time; spending time can create tradeoffs such as becoming hungrier while resting.
- Hearty Meal, Good Sleep and Patched Up are real one-contract effects that modify need decay/readiness/behavior.
- Combat can cause Sprain, Bruised Ribs and Deep Bite injuries with persistent severity.
- Injuries reduce readiness and combat effectiveness; first aid reduces severity and a physician can remove the worst injury.
- Expedition earnings and materials are banked into the tavern once when the run resolves.
- A dead hero cannot be prepared or redeployed. The Fresh Test Hero button is a temporary developer reset until the real roster/recruitment slice.

## Architecture

`core.js` remains the authoritative domain simulation. `PreparationState` was added there rather than building a second fake preparation model. `app.js` is a presentation adapter and does not own gameplay rules.

## Known limitations

- One hero / one active contract at a time.
- No persistent roster, experience/skill progression or save-file layer yet.
- No patron economy, crafting, merchants, offline progression or parties yet.
- Current tavern funds exist only to exercise preparation tradeoffs.
- Visuals are functional UI, not final art direction.
- Contract presentation remains event/path based.

## Next Operation (Slice 3)

Build **Persistent Heroes**: multiple surviving heroes, progression/history, permanent death records and actual persistence, while reusing the existing preparation and autonomous-contract systems.
