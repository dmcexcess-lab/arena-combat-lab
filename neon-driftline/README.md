# Neon Driftline

A compact, phone-first Godot arcade survival game.

## Play

Drag anywhere left/right to steer.

- **Open field by default:** most of the run is unrestricted left/right survival with no permanent easy/hard split.
- **Periodic lane events:** temporary lanes materialize during the run. Each event randomly assigns one side easy and the other hard, forcing a quick read and commitment before the lanes disappear again.
- **Easy lane:** lower hazard pressure and slightly slower threats during a lane event.
- **Hard lane:** faster, denser hazards and **+35% score** during a lane event.
- **Dash:** tap DASH for a short horizontal invulnerable burst. Dashing also activates a brief **x2 score window**, rewarding aggressive timing around pickups and near misses.
- **Near misses:** skim a hazard without colliding to increase combo, trigger a brief slow-motion pulse, and shave time off dash recharge.
- **Energy:** collect green nodes for score and combo.
- **Finale:** at 50 seconds the field escalates. An extraction gate enters from either the left or right side; you must physically line up with its opening to finish the run.
- Three hits ends the run.

## Technical target

- Godot 4.7.2 stable
- Web export using Compatibility renderer
- 390x844 portrait reference viewport with canvas scaling
- Touch-first input; mouse emulation retained for desktop testing
- Procedural vector visuals and runtime-generated SFX; no external art/audio dependencies

## Run locally

Open `project.godot` in Godot 4.7.2 and run `main.tscn`.

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
