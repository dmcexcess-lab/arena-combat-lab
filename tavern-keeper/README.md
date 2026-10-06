# Tavern Keeper — Spatial Tavern Sim

Tavern Keeper now opens inside the tavern itself.

Instead of one long management dashboard, the live tavern room is the home screen. Tap physical objects in the room to manage the corresponding system while patrons, heroes and visitors continue moving through the tavern.

## Room navigation

- **Bar counter** — patrons, income, facilities and tavern upgrades
- **Contract board** — choose contracts and threat
- **Heroes' table** — roster, preparation, equipment and deployment
- **Workbench** — stash, crafting and repairs
- **Merchant corner** — buy current visiting stock
- **Front door** — inspect/recruit applicants
- **Chronicle ledger** — records, legends, deaths and milestones
- **Wall map** — follow concurrent expeditions and reports

Every management system is now a focused screen with **Back to Tavern** rather than part of one giant scrolling page.

## Live room

The room now has persistent spatial actors. Patrons arrive from the exterior road, wait in a real line outside when the tavern is full, walk through the door to stable seats, get attended by moving staff, linger, then walk back outside before disappearing. Heroes who are deployed remain absent from the room; merchant/applicant presence still follows live simulation state.

Fireplace, lamps and rain remain ambient. Patron/staff translation is driven by stateful routes rather than looping position animation; walk cycles, serving arms and mugs are local animations with reduced-motion support.

## Contract pacing

Contracts now unfold on a long-form real-time clock at normal speed. Threat is also a commitment tier: Threat 1 targets about 5–10 minutes, Threat 2 about 10–20 minutes, Threat 3 about 25–45 minutes, Threat 4 about 1–2 hours, and Threat 6 about 2–4 hours. Branching, combat, retreat and death can move an individual run outside its target band.

Expedition reports, combat rounds and route decisions are paced simulation events rather than events fired every browser repaint. Offline progress uses the same 0.25-second simulation quantum, and the existing ×1/×4/×12 expedition speeds remain authoritative.

## Core game

The Slice 15 simulation is unchanged: persistent autonomous heroes, permanent death, preparation, five contract types, concurrent expeditions, crafting, merchants, recruitment, facilities, equipment durability, 8-hour offline progress and the persistent Chronicle.

## Tests

Run all existing simulation suites plus:

```bash
node tests/test_release.js
node tests/test_scene_ui.js
```

`test_scene_ui.js` locks the tavern-first shell, physical navigation, separate management screens, live-state bindings, animation contract and mobile interaction structure.
