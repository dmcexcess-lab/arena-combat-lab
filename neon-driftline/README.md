# Neon Driftline

A phone-first Godot arcade roguelite built around one-thumb movement, automatic weapons, risk/reward lanes, and short escalating stages.

## Run loop

Each run starts on **Level 1** with 3 HP and the Single Auto weapon.

1. Survive a **30-second level** while steering, auto-firing, dashing, collecting energy, and navigating station splits.
2. Clearing the timer freezes gameplay and opens the **shop**.
3. Your score is also your currency. Spend it on restoring hits or changing weapons.
4. Start the next level with your remaining HP, equipped weapon, and unspent score.
5. Every level increases hazard speed and density. The run continues until you die.

Level 1 deliberately starts lighter: slower hazards, wider spawn cadence, a longer opening gap, and no early yellow-diamond pressure.

## Shop

Every cleared level awards a small clear bonus before the shop opens.

- **Repair +1 hit:** 500 score, up to the 3-HP cap.
- **Single Auto:** 350 score.
- **Dual Auto:** 650 score.
- **Cone Cannon:** 900 score.
- **Heat Seeker:** 1150 score.
- **Thin Laser:** 850 score.

Buying a weapon swaps the currently equipped weapon. Buying the weapon already equipped does nothing and costs nothing. You can always continue without buying.

## Weapons

All weapons fire automatically so phone input stays focused on movement and dash.

- **Single Auto:** one accurate forward bolt, **2 damage**, every **0.24 s**.
- **Dual Auto:** two forward bolts, **1 damage each**, every **0.32 s**.
- **Cone Cannon:** three-way spread, **3 damage per shot**, every **0.72 s**.
- **Heat Seeker:** one homing missile, **7 damage**, every **1.05 s**.
- **Thin Laser:** narrow continuous beam, **3 DPS**, damaging only the first obstacle in the beam.

Weapons cannot damage station structure.

## Obstacles and survival

- Red circles: **3 HP**.
- Red squares: **6 HP**.
- Yellow diamonds: **12 HP** and are the toughest standard obstacle.
- Damaged obstacles show a compact HP bar.
- Ordinary obstacle collisions cost one of your three hits.
- Repair cores can still appear during gameplay, but field healing is intentionally **rare**; the shop is the reliable recovery path.
- Station outer walls and center bulkheads are indestructible and **instant-kill** on contact, including while dash invulnerability is active.

## Station splits and scoring

Periodic station segments create two physical corridors. One side is randomly harder and carries denser/faster hazard pressure plus a **+35% score bonus** while you are inside it. The center bulkhead makes changing sides lethal once committed.

Forward dash now surges the ship almost to the top of the screen. After the burst, the ship largely holds that advanced position while the level continues scrolling, then only slowly settles back toward its normal flight line. There is no fast visual reverse-thrust snap. Dash still activates a short **x2 score window** for passive scoring, kills, pickups, and near misses.

## Technical target

- Godot 4.7.2 stable
- Web export using Compatibility renderer
- 390x844 portrait reference viewport with canvas scaling
- Touch-first input; mouse emulation retained for desktop testing
- Procedural vector visuals and runtime-generated SFX; no external art/audio dependencies

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
