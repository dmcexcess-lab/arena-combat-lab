# Neon Driftline

A compact, phone-first Godot arcade survival game.

## Play

Drag anywhere left/right to steer.

- **Open field by default:** most of the run is unrestricted survival through free space.
- **Station split events:** periodically, a long chunk of space-station structure drifts down the screen. Its outer hull and center bulkhead create two physical corridors.
- **Choose before impact:** the approaching structure gives you a few seconds to commit left or right. Once the station reaches your ship, the center bulkhead makes changing sides physically impossible without crashing.
- **Lethal structure:** station walls are not ordinary hazards. Touching an outer hull or the center divider is an **instant kill**, and forward-dash invulnerability does not protect you.
- **Easy vs hard corridor:** each station segment randomly assigns one corridor as easier and the other as harder. The hard side carries denser/faster hazards and a **+35% score bonus** while you are physically inside the station segment.
- **Weapon cores:** the ship starts with **Single D2** and weapon pickups swap the active auto-fire weapon with no extra buttons.
  - **Single auto:** one accurate forward bolt, **2 damage**, fires every **0.24 s**.
  - **Dual auto:** two forward bolts, **1 damage each**, fires every **0.32 s**.
  - **Cone cannon:** three-way spread, **3 damage per shot**, slower **0.72 s** cadence.
  - **Heat seeker:** one homing missile, **7 damage**, slowest projectile cadence at **1.05 s**.
  - **Thin laser:** continuous narrow beam, **3 DPS**, damages only the first obstacle in the beam.
- **Obstacle durability:** red circles have **3 HP**, red squares **6 HP**, and yellow diamonds are the toughest at **12 HP**. Damaged obstacles show a compact health bar. Weapons cannot damage station structure.
- **Forward dash:** tap DASH to surge much farther up-screen, then drift back more gradually to the normal flight line. Dashing activates a brief **x2 score window**, rewarding aggressive timing around pickups, kills, and near misses.
- **Repair cores:** when you are below the three-hit cap, repair pickups periodically enter the field. Collect one to restore exactly one lost hit.
- **Near misses:** skim ordinary hazards without colliding to increase combo, trigger a brief slow-motion pulse, and shave time off dash recharge.
- **Energy:** collect green nodes for score and combo.
- **Finale:** at 50 seconds the field escalates and an extraction gate approaches from either side. Line up with it to finish the run.
- Ordinary hazards still use the three-hit health system; station-wall collisions do not.

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
