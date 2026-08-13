# Arena Combat Lab — Changelog

## 2026-08-13 — Wrapper Touch Fix
- Fixed Safari/mobile start-screen buttons being completely unresponsive.
- Root cause: the new setup wrapper returned from `_unhandled_input()` before `MainMobileWeb` could dispatch touch events.
- Setup touch and mouse events now pass through the existing one-touch/one-action mobile web input layer.

## 2026-08-13 — Boundless Run Wrapper v1
- Game now opens in a pre-run setup wrapper instead of immediately generating a dungeon.
- Roll and select starting gear before entering the dungeon.
- Choose the exact Walker population for the generated floor.
- Dungeon and stairs generate only after pressing **Generate Dungeon**; the player spawns on the generated stair.
- Removed Wizard/Mage gear and logic.
- Replaced the old families with **Stealth, Ranged, Guard, Ravager**.
- Stealth focuses on quiet rear attacks.
- Ranged uses bows/crossbows with limited ammunition and real distance attacks.
- Guard is low-damage/high-defense melee.
- Ravager is high-damage/low-defense melee.
- Torso armor acts as a soft class anchor: Stealth/Ranged physical gear forms one compatibility group, Guard/Ravager another.
- Incompatible physical pieces are greyed/blocked; changing armor ejects incompatible equipped physical gear.
- Weapons, rings, and amulets remain cross-family to preserve hybrid builds.

## 2026-08-13 — Boundless Systems Lab v1
- Added random connected dungeon generation.
- Added configurable Walker count.
- Standardized Walker benchmark stats.
- Added gear-driven attributes and character/inventory screen.
- Added random starter and loot generation for class-system experimentation.

## 2026-08-13 — Dungeon Conversion
- Converted the original convenience-store combat map into a dungeon layer.
- Added stone rooms, corridors, doors, tomb-like blockers, volatile casks, cache objective, stairs, and authored Walker placement.

## Earlier Arena Work
- Portrait mobile/Safari control layer with one-touch/one-action input handling.
- Facing, directional FOV, fog of war, remembered last-known enemies, physical sound propagation, stealth/rear attacks, crowd pressure, doors/glass, firearms, hazards, global **SPOTTED** warning, and variable action-time combat.
