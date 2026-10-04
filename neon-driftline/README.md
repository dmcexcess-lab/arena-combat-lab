# Neon Driftline

A phone-first Godot arcade roguelite built around one-thumb movement, automatic weapons, risk/reward station corridors, and a deliberately slow escalation curve.

## Run progression

A new run starts with **3 HP and no weapon**. Level 1 is intentionally a survival/tutorial stage: dodge first, earn score, then buy your first gun in the shop.

- **Level 1:** 18 seconds, circles and squares only, exactly **one short station split**, no yellow diamonds, no starting weapon.
- Each following level adds about **3 seconds**, up to a 45-second cap.
- Enemy pressure rises gradually through slightly faster and denser spawns.
- Station splits get **longer every level**.
- Extra splits are introduced slowly: Levels 1–2 have one, 3–4 have two, 5–6 have three, and Level 7+ can have four.
- HP, equipped weapon, and unspent score persist between levels.
- Field repair drops remain rare; the between-level shop is the reliable recovery source.

## Shop

Score is both run score and spendable currency. Clearing a level awards a small bonus before opening the shop.

- **Repair +1 hit:** 500 score, up to 3 HP.
- **Single Auto D1:** 350 score.
- **Dual Auto D1x2:** 650 score.
- **Cone Cannon D3x3:** 900 score.
- **Heat Seeker D7:** 1150 score.
- **Thin Laser 3 DPS:** 850 score.

The run begins unarmed, so the Single Auto is normally the first weapon purchase. You can always skip purchases and start the next level.

## Weapons

All equipped weapons fire automatically.

- **Single Auto:** one accurate forward bolt, **1 damage**, every **0.24 s**. This is intentionally the weakest gun.
- **Dual Auto:** two forward bolts, **1 damage each**, every **0.32 s**.
- **Cone Cannon:** three-way spread, **3 damage per shot**, every **0.72 s**.
- **Heat Seeker:** one homing missile, **7 damage**, every **1.05 s**.
- **Thin Laser:** narrow continuous beam, **3 DPS**, damaging only the first obstacle in the beam.

Weapons cannot damage station structure.

## Obstacles and survival

- Red circles: **3 HP**.
- Red squares: **6 HP**.
- Yellow diamonds: **12 HP**, introduced only after Level 1.
- Ordinary obstacle collisions cost one hit.
- Station outer walls and center bulkheads are indestructible and **instant-kill** on contact.
- Damaged obstacles show compact HP bars.

## Dash

Forward dash surges the ship almost to the top of the screen. The ship then hangs forward while the level scrolls and slowly settles back toward its normal flight line. Dash also creates a short **x2 score window**.

## Technical target

- Godot 4.7.2 stable
- Web export using Compatibility renderer
- 390x844 portrait reference viewport
- Touch-first input with mouse fallback
- Procedural vector visuals and runtime-generated SFX

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
