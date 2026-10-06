# CURRENT — Tavern Keeper

## Current slice
Slice 2 — Preparation & Condition

## Status
Implemented as a standalone browser vertical slice on top of the Slice 1 autonomous contract core.

## Core rules implemented
- Hero has Might, Finesse, Endurance, Wits, Resolve.
- Persistent condition between contracts: health, hunger, fatigue, morale, supplies and injuries.
- Moodlets are derived from condition and active one-contract preparation effects.
- Tavern preparation actions consume prototype funds and preparation time.
- Preparation includes meals, rest, morale recovery, first aid, physician treatment and potion purchase.
- Rest is a tradeoff: long recovery consumes time and increases hunger.
- Hearty meals / good sleep / fresh treatment alter readiness and expedition behavior rather than existing as labels only.
- Combat can produce persistent Sprain / Bruised Ribs / Deep Bite injuries with severity.
- Injuries reduce readiness/combat effectiveness and increase retreat pressure; treatment can reduce/remove them.
- Surviving heroes return in their actual post-contract condition.
- Expedition gold and recovered materials are banked at the tavern exactly once.
- Pre-expedition buffs are consumed by the expedition and do not become permanent bonuses.
- Death remains permanent for the current hero.
- Threat Level remains advisory only; no condition or injury blocks deployment.
- Contract AI/combat/performance gold from Slice 1 remains authoritative.

## Tests
Run:

```bash
node tests/test_core.js
node tests/test_preparation.js
```

## Known limitations
- One hero and one contract at a time.
- The current tavern fund pool is a prototype preparation economy; patron gold/sec arrives in a later slice.
- Fresh Test Hero is a developer reset, not the future recruitment/roster system.
- No save/refresh persistence yet.

## NEXT OPERATION
Slice 3 — Persistent Heroes: add the real roster and survivor progression layer (multiple heroes, experience/skill growth, traits/history, permanent deaths and persistence) without replacing the Slice 1 contract simulation or Slice 2 preparation state.
