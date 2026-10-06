# CURRENT — Tavern Keeper

## Current operation
Major Change 1 — Animated Tavern Shell & Diegetic Navigation

## Status
Implemented on top of the Slice 15 release simulation. Gameplay/economy/combat architecture is unchanged; presentation/navigation is intentionally reopened.

## Default experience
- The app now opens directly into a live animated tavern room instead of a long dashboard.
- The tavern itself is the navigation surface. Physical objects open focused systems:
  - Bar counter → Tavern Floor / facilities / upgrades
  - Contract notice board → Contract Board
  - Heroes' table → Roster / preparation / loadout / deployment
  - Workbench → Workshop / stash / crafting / maintenance
  - Merchant corner → Visiting Merchant
  - Front door → Applicants
  - Ledger → Tavern Chronicle
  - Wall map → Expeditions / completed reports
- Each management destination is a separate app screen with Back to Tavern.
- Escape and tapping the Tavern Keeper title return to the tavern.
- Deploying a hero opens the Expeditions road-map screen.

## Animated tavern state
- Seated patrons are rendered from `TavernEconomy.active`.
- Waiting patrons are rendered from `TavernEconomy.queue` near the door.
- Served patrons visually distinguish food/drink state and animate mug use.
- Only living, non-deployed heroes appear at the heroes' table; deployed heroes are physically absent.
- Current visiting merchant and current applicant appear in their actual room locations.
- Server animation reflects whether unserved patrons are waiting.
- Scene badges mirror selected contract, active expeditions, Chronicle entries, Workshop level, home heroes, service level, merchant/applicant presence.
- The newest tavern service event appears as an ambient room status line.
- Fireplace, lamp, rain, patron, queue, mug and server motion are CSS animated.
- `prefers-reduced-motion` disables continuous animation.

## Rendering / phone behavior
- The underlying simulation continues globally regardless of which screen is open.
- Only the currently visible management screen repaints live; hidden screens no longer rebuild every 250 ms.
- Scene actor DOM is signature-gated and only rebuilds when patron/hero/visitor membership or state changes.
- Scene objects are touch targets; existing coarse-pointer controls remain at least 44px high.
- Portrait layout repositions the physical room objects rather than reverting to a dashboard.

## Unchanged simulation contract
- All Slice 1–15 systems remain authoritative: tavern economy, preparation/facilities, persistent heroes, contracts/objectives, crafting, merchants, recruitment, durability/death, concurrent expeditions, offline progression, Chronicle and release balance.
- No save migration was required; this is a presentation/navigation change.

## Tests
CI gate now includes:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
node tests/test_contracts.js
node tests/test_recruitment.js
node tests/test_durability.js
node tests/test_concurrency.js
node tests/test_objectives.js
node tests/test_facilities.js
node tests/test_offline.js
node tests/test_chronicle.js
node tests/test_release.js
node tests/test_scene_ui.js
```

## Known limitations
- The room is CSS/DOM art rather than final illustrated sprite art.
- Patron movement is a visual projection of authoritative seated/queued/service state; patrons do not pathfind through an independently simulated tavern floor.
- Physical-device Safari/Firefox feel, object hit-box comfort and scene composition still require human playtesting.
- Offline progression remains capped at 8 hours.

## NEXT OPERATION
Playtest the animated tavern on phone/desktop and refine room art, animation timing, hotspot placement and navigation friction from observed use. Keep gameplay simulation unchanged unless a separate gameplay change is explicitly requested.
