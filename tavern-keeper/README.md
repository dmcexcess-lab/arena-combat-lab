# Tavern Keeper — Slice 1: Autonomous Contract Core

A standalone browser prototype implementing the real Slice 1 contract simulation.

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
```

## Implemented

- Data-driven hero stats, traits, needs/moodlets, equipment and supplies.
- Branching Threat 2 contract (`Rats Below Greymill`).
- Advisory hero-relative risk assessment; deployment is never blocked.
- Seeded deterministic RNG.
- Utility-scored autonomous decisions with readable player-facing reasons and detailed debug scores.
- Simulated combat with melee/ranged behavior, mitigation, health, autonomous healing, retreat and death.
- Dynamic performance gold/sec that ramps from accomplishments and stops at expedition resolution.
- Independent partial-progress tracking, recovered materials, success/retreat/death summaries.
- Normal / accelerated / pause / single-step controls.
- Preparation presets and manual condition/equipment controls for repeatability.

## Architecture

The simulation is isolated in `core.js`. It does not depend on DOM/browser APIs and is exercised directly by Node tests. `app.js` is a thin presentation adapter over the core.

This preserves the intended separation between simulation/domain state and presentation while keeping Slice 1 minimal.

## Known Limitations

- One contract and one hero at a time, by Slice 1 scope.
- No persistent roster yet; persistence belongs to later slices.
- No tavern patron economy, crafting, merchants, offline progression, parties, or large inventory.
- Visuals are functional UI, not final art direction.
- Contract map presentation is event/path based rather than an animated spatial scene.

## Next Operation (Slice 2)

Build the proper Preparation & Condition loop around this simulation: persistent hunger/fatigue/morale/injuries, tavern-based meals/rest/treatment, and stronger preparation tradeoffs without changing the autonomous contract core.
