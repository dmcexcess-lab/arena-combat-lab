# Arena Combat Lab — Changelog

Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md`

## 2026-08-13 — Arena Tiles + Creature Roster
- Added code-drawn stone Arena tiles, gates, pillars, casks, stairs, cache and chests.
- Added distinct **Walker, Ripper and Brute** icons with HP bars; player stays a circle until paper-doll work.
- Ripper is the fast, perceptive, higher-intelligence hunter; Brute is the slow, durable, low-intelligence physical threat.
- Launch menu now controls each creature count independently, combined cap 40, default 8/3/1.
- Procgen now creates a large central space, four satellite rooms, wide lanes, loops and sparse cover.
- Creature senses, action timing, Fear pressure, awareness sharing and tracking are data-driven per type.
- Ravager target-health checks now use each creature's own max HP.
- SOP now requires rereading SOP + Context before **every** code edit/fix.

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
