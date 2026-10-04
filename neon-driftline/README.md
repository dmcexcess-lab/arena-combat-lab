# Neon Driftline

A phone-first Godot arcade roguelite built around one-thumb movement, auto-weapons, score-risk play, escalating enemy archetypes, and station splits.

## Progression

Runs begin with **3 HP and no weapon**.

- **Level 1:** 18 seconds, sparse slow circles only, one short station split. The hard corridor contains a few small circle clusters.
- **Level 2:** moving squares enter the enemy pool.
- **Level 4:** yellow diamonds enter. Diamonds are the toughest standard enemy and actively steer toward the player's horizontal position.
- **Level 6:** purple shooting rhomboids enter. They periodically aim projectiles at the player's current position.
- Level duration increases by about 3 seconds per stage to a 45-second cap.
- Station splits gradually become longer and more numerous.
- Enemy density and speed continue rising slowly with level.

## Tight score economy

Score is intentionally compact so individual actions remain legible.

- **Circle kill:** 1 point.
- **Moving square kill:** 2 points.
- **Shooting rhomboid kill:** 4 points.
- **Smart yellow diamond kill:** 5 points.
- **Ordinary near miss:** roughly 20–50 points as combo rises.
- **Dash near miss:** roughly 120–180 points as combo rises.
- **Energy pickup:** 10 points normally; hard-lane energy starts at 20 before the lane bonus.
- Nonlethal weapon damage gives no score.
- Repairs and weapon pickups themselves give no score.
- Passive survival time no longer prints free score.

The hard station lane still applies its score bonus where relevant.

## Shop

The shop uses the same compact score scale.

- **Single Auto D1:** 45
- **Repair +1 hit:** 75
- **Dual Auto D1x2:** 90
- **Thin Laser 3 DPS:** 120
- **Cone Cannon D3x3:** 130
- **Heat Seeker D7:** 160

Clearing a level also grants a small level-scaled bonus.

## Weapons

- **Single Auto:** D1 accurate pulse.
- **Dual Auto:** D1 × 2.
- **Cone Cannon:** D3 × 3 spread.
- **Heat Seeker:** D7 homing projectile.
- **Thin Laser:** narrow 3 DPS beam.

Weapons cannot damage station structure.

## Enemy archetypes

- **Lazy circle — 3 HP:** slow and nontracking. The only Level 1 enemy.
- **Moving square — 6 HP:** lateral movement makes lanes less predictable.
- **Smart yellow diamond — 12 HP:** strongest enemy; continuously corrects its lateral motion toward the player.
- **Shooting rhomboid — 8 HP:** slower body movement but fires aimed purple shots.

Ordinary body collisions cost one hit. Enemy projectiles also cost one hit. Station walls remain indestructible and instantly lethal.

## Dash

Dash surges the ship almost to the top of the screen, then leaves it hanging forward while the world scrolls and the ship slowly settles toward its normal flight line. Dash near-misses are intentionally the highest-value repeatable scoring action.

## Technical target

- Godot 4.7.2 stable
- Web export using Compatibility renderer
- 390×844 portrait reference viewport
- Touch-first controls with mouse fallback
- Procedural vector visuals and runtime-generated SFX

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
