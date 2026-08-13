# Arena Combat Lab — Changelog

Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md`

## 2026-08-13 — Razor Refactor + Regression Gate
- Audited the entire GDScript runtime stack and separated proven-dead prototype code from active Arena behavior.
- Removed obsolete `MainDungeon.gd`; current Arena procgen is authoritative and Boundless now inherits directly from the mobile-web shell.
- Cut `MainBoundless.gd` down from the old class/map/prototype implementation to the live setup/run shell and shared Arena helpers.
- Cut `MainPerception.gd` down to its live responsibilities: intent reads, last-seen memory and fuzzy sound rendering.
- Net razor commit: **1,329 lines removed / 263 added** while preserving the current gameplay chain.
- Added `TEST_MATRIX.md` and a headless Godot smoke test before Web export; it verifies scene startup, four fixed starters, mixed 8/3/1 creature roster, connected Arena objective, four chests, and enabled gear schema/rarities.
- Updated the AI SOP with code ownership, inheritance, dictionary-contract, refactor safety, testing, rollback and GitHub transport best practices.
- Active AI/dual-wield/bow layers were deliberately retained because they still own live behavior; cleanup stopped rather than turn into an unrequested combat rewrite.
- SOP + Context are now read once before the first code edit of each coding prompt; Context is refreshed after a batch when current truth changes.

## 2026-08-13 — Arena Tiles + Creature Roster
- Added code-drawn stone Arena tiles, gates, pillars, casks, stairs, cache and chests.
- Added distinct **Walker, Ripper and Brute** icons with HP bars; player stays a circle until paper-doll work.
- Ripper is the fast, perceptive, higher-intelligence hunter; Brute is the slow, durable, low-intelligence physical threat.
- Launch menu controls each creature count independently, combined cap 40, default 8/3/1.
- Procgen creates a large central space, four satellite rooms, wide lanes, loops and sparse cover.

## 2026-08-13 — Docs + Long-Term Shape
- Added Prison RPG + Arena contract roadmap, Developer Portal vision and cross-game combat-test role.
- Split README / Roadmap / Changelog / SOP / Context by audience and purpose.

## 2026-08-13 — Weapon + Awareness Pass
- Short Bow owns Quick Shot; Long Bow owns reach/power and no Quick Shot.
- Added Stealth/Ravager dual wield and Dual Strike.
- Added hit-reveals-attacker, AI-driven awareness sharing, memory, FOLLOW/INVESTIGATE and persistent `!! SPOTTED !!`.

## 2026-08-13 — Combat HUD + Equipment
- Added Boundless desktop/mobile combat HUD and tick-based feat cooldowns.
- Fixed baseline human; gear became the build system with Offhand, compatibility and Common → Enchanted generation; Epic disabled.
- Added four procedural gear chests.

## 2026-08-13 — Run + Dungeon Foundation
- Added pre-run setup, procedural stair/cache floor and return-to-stair objective.
- Established Stealth/Ranged/Guard/Ravager and fixed Walker benchmark.
- Fixed Safari wrapper touch routing.

## Earlier Arena Foundation
- Variable-tick combat, facing/FOV/fog, remembered enemies, physical sound, stealth, Fear, doors/hazards and `!! SPOTTED !!`.
- Noise changes existing enemy behavior; it never spawns enemies.
