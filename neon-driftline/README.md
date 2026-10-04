# Neon Driftline

A compact, phone-first Godot arcade survival game.

## Play

Drag anywhere left/right. Survive for 60 seconds. Collect green energy nodes. Passing close to hazards without colliding increases the score multiplier. Three hits ends the run.

## Technical target

- Godot 4.7.2 stable
- Web export using Compatibility renderer
- 390x844 portrait reference viewport with canvas scaling
- Touch-first input; mouse emulation retained for desktop testing
- No external art/audio dependencies

## Run locally

Open `project.godot` in Godot 4.7.2 and run `main.tscn`.

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
