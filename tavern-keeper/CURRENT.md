# CURRENT — Tavern Keeper

## Current slice
Slice 1 — Autonomous Contract Core

## Status
Implemented as a standalone browser vertical slice with deterministic simulation core and tests.

## Core rules implemented
- Hero has Might, Finesse, Endurance, Wits, Resolve.
- Needs: health, hunger, fatigue, morale.
- Moodlets are derived from state and alter decisions/combat.
- Traits alter utility scoring.
- Equipment alters damage, defense, range behavior, and survival.
- Threat Level is advisory only.
- Contracts are data-driven location graphs.
- Hero AI selects actions using utility scores plus small seeded uncertainty.
- Combat is autonomous.
- Gold/sec begins low, rises via accomplishments, and becomes zero on resolution.
- Progress and rewards are preserved on failure.
- Physical rewards are materials separate from continuous gold income.

## Tests
Run `node tests/test_core.js`.

## Known limitations
See README.md.

## NEXT OPERATION
Slice 2 — Preparation & Condition: make tavern-side preparation a proper gameplay loop around the proven contract simulation, without replacing the core architecture.
