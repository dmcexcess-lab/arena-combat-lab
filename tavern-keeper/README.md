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

## Job board progression

A new tavern starts over with one founding hero and two low-threat jobs on the board. The board grows to a maximum of five job choices as both tavern level and reputation rise. Tavern level comes from facilities, service and seating. Reputation comes from patrons served, tavern revenue and successful contracts.

Heroes are assigned from a dropdown on the Contract Board. The Heroes' Table is preparation, equipment and career management only.

## Contract economy and time

There is one authoritative speed. Pause, ×4, ×12 and manual-step controls are removed.

Jobs advertise a base contract income rate and listed duration:
- Threat 1: +1 g/s for 15 minutes
- Threat 2: +2 g/s for 30 minutes
- Threat 3: +3 g/s for 1h 30m
- Threat 4: +5 g/s for 4 hours
- Threat 6: +8 g/s for 8 hours

Gold accrues continuously while the hero is away. Autonomous travel, combat and objective events still occur during the job and can affect performance rewards. Death or retreat ends the job early. Once the route is complete, a surviving hero remains away on the return journey until the listed duration completes. The hardest 8-hour job matches the offline progression cap.

## Core game

The underlying simulation remains: persistent autonomous heroes, permanent death, preparation, five contract types, concurrent expeditions, crafting, merchants, recruitment, facilities, equipment durability, 8-hour offline progress and the persistent Chronicle.

## Tests

Run all existing simulation suites plus:

```bash
node tests/test_release.js
node tests/test_scene_ui.js
```

`test_scene_ui.js` locks the tavern-first shell, physical navigation, separate management screens, live-state bindings, animation contract and mobile interaction structure.
