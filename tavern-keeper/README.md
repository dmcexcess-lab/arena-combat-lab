# Tavern Keeper — Illustrated Top-Down Fantasy Tavern Sim

Tavern Keeper now opens inside the tavern itself.

Instead of one long management dashboard, the live tavern room is the home screen. Tap physical objects in the room to manage the corresponding system while patrons, heroes and visitors continue moving through the tavern.

## Room navigation

- **Bar counter** — patrons, income, facilities and tavern upgrades
- **Contract board** — choose contracts and threat
- **Heroes' table** — roster, preparation, equipment and career management (deploy from the Contract Board)
- **Workbench** — stash, crafting and repairs
- **Merchant corner** — buy current visiting stock
- **Front door** — inspect/recruit applicants
- **Chronicle ledger** — records, legends, deaths and milestones
- **Wall map** — follow concurrent expeditions and reports

Every management system is now a focused screen with **Back to Tavern** rather than part of one giant scrolling page.

## Illustrated top-down graphics
The actual browser game ships a standalone vector art pack in `art/`: overhead tavern floor and exterior yard (`room.svg`), eight physical management prop sprites (`props.svg`), and nine fantasy-character sprites (`figures.svg`). Styles and animations are in `art/scene.css`.

The sprites are separate from the simulation. Patrons walk on their real spatial paths, wait on the exterior road, enter through the threshold, take permanent seat assignments until departure, and are served by staffed actors. The same physical scene objects remain tappable navigation targets.

On phones the 900px-wide map can be swiped horizontally, with Interior/Outside shortcut buttons. The graphics have a reduced-motion mode. The eight management screens, contracts, save key and game economy are not replaced.

## Live room

The room now has persistent spatial actors. Patrons arrive from the exterior road, wait in a real line outside when the tavern is full, walk through the door to stable seats, get attended by moving staff, linger, then walk back outside before disappearing. Heroes who are deployed remain absent from the room; merchant/applicant presence still follows live simulation state.

Fireplace, lamps and rain remain ambient. Patron/staff translation is driven by stateful routes rather than looping position animation; walk cycles, serving arms and mugs are local animations with reduced-motion support.

## Job board progression

A new tavern starts over with one founding hero and two low-threat jobs on the board. The board grows to a maximum of five job choices as both tavern level and reputation rise. Tavern level comes from facilities, service and seating. Reputation comes from patrons served, tavern revenue and successful contracts.

Heroes are assigned from a dropdown on the Contract Board. The Heroes' Table is preparation, equipment and career management only.

## Permanent-investment economy (October 2026)
Short absences should not bankroll the entire tavern. Salaries are deliberately modest and heroes stay away for one to eight hours; performance-rate improvements can add at most 50% beyond the listed rate. Salaries are spendable as earned, while objective bonuses, completion gold and recovered materials are paid when the expedition returns.

Permanent upgrades now start at 700–1,300g and multiply in price by three per purchased level (seating also upgrades in pairs). Upgrade affordability is intentionally measured in completed contracts, not seconds of idle tavern trade.

While away, unattended **tavern** receipts accrue at full value for the first 15 minutes, one-quarter value through one hour, then stop. Patron and visitor simulation may still progress; expedition clocks and earnings continue up to the existing eight-hour offline limit, so a long contract remains worthwhile. The return summary identifies this policy.

Existing saves and purchased upgrades are preserved; to evaluate the new startup curve, select New Tavern.

## Two distinct income streams (October 2026)
**1. Tavern sales:** patrons pay for actual meals and drinks, with capacity, service speed and facilities influencing revenue.

**2. Adventurer salaries:** a hero away on a contract adds spendable gold to the same treasury every second. The expedition also brings **separate bonus gold and materials when it returns**, with reduced rewards for failure/retreat and partial compensation after death. These homecoming rewards are distinct from the salary already paid.

| Threat | Time away | Adventurer salary | Gold bonus on successful return |
| --- | --- | --- | --- |
| 1 | 1 hour | +0.30 g/s | ~260g |
| 2 | 2 hours | +0.50 g/s | ~420g |
| 3 | 3 hours | +0.75 g/s | ~850g |
| 4 | 5 hours | +1.00 g/s | ~1,400g |
| 6 | 8 hours | +1.50 g/s | ~2,600g |

Successful quests also guarantee at least one relevant crafting material in addition to anything found on the route. Objective quality and events alter wages and bonus payouts. Heroes stay unavailable until the journey ends or they die/retreat.

The offline cap remains eight hours. The unattended tavern-sales taper applies only to patron sales, **not** adventurer g/s. Save/reload never double-credits earned wages. Existing saves are preserved.

## Contract economy and time

There is one authoritative speed. Pause, ×4, ×12 and manual-step controls are removed.

Jobs advertise a base contract income rate and listed duration:
- Threat 1: +0.30 g/s for 1 hour
- Threat 2: +0.50 g/s for 2 hours
- Threat 3: +0.75 g/s for 3 hours
- Threat 4: +1.00 g/s for 5 hours
- Threat 6: +1.50 g/s for 8 hours

Adventurer salary enters the tavern treasury continuously while the hero is away. Extra gold and materials come back only upon expedition settlement. Autonomous travel, combat and objective events still occur during the job and can affect performance rewards. Death or retreat ends the job early. Once the route is complete, a surviving hero remains away on the return journey until the listed duration completes. The hardest 8-hour job matches the offline progression cap.

## Core game

The underlying simulation remains: persistent autonomous heroes, permanent death, preparation, five contract types, concurrent expeditions, crafting, merchants, recruitment, facilities, equipment durability, 8-hour offline progress and the persistent Chronicle.

## Verified release checkpoint

The October 8 CI recovery completed all 16 Tavern Keeper suites, the headless Arena smoke test, web export and GitHub Pages deployment. Aggregate success rates across 250 seeded runs per hero profile/contract were 100% / 99.07% / 27.07% / 24.93% / 15.20% for Threats 1 / 2 / 3 / 4 / 6 after restoring suitable mid-tier action pacing.

Physical-device Safari/Firefox and portrait touch feel remain to be playtested.

## Tests

Run all existing simulation suites plus:

```bash
node tests/test_release.js
node tests/test_income_streams.js
node tests/test_scene_ui.js
```

`test_scene_ui.js` locks the tavern-first shell, physical navigation, separate management screens, live-state bindings, animation contract and mobile interaction structure.
