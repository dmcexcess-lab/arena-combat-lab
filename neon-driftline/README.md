# Neon Driftline

A compact, phone-first Godot arcade survival game.

## Play

Drag anywhere left/right to steer.

- **Randomized lanes:** at the start of every run, either left or right becomes the hard lane. A launch banner and lane labels reveal the assignment, forcing a quick choice instead of a memorized route.
- **Easy lane:** lower hazard pressure and slightly slower threats.
- **Hard lane:** faster, denser hazards and **+35% score** while you stay there.
- **Dash:** tap the DASH button for a short horizontal invulnerable burst. It recharges automatically.
- **Near misses:** skim a hazard without colliding to increase combo, trigger a brief slow-motion pulse, and shave a little time off dash recharge.
- **Energy:** collect green nodes for score and combo.
- **Finale:** at 50 seconds the field escalates. An extraction gate enters during the final seconds; you must physically line up with its opening to finish the run.
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
