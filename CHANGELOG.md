# Arena Combat Lab — Changelog

Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md`

## 2026-08-13 — Developer Screen Final Pre-Test Pass
- Reframed the standalone pre-run setup as the four-page **Developer Screen** intended to be opened from the future prison game through `open_dev_screen()`.
- Replaced the hand-rolled creator name input with a real Godot `LineEdit`, keeping native virtual-keyboard behavior available for mobile Safari; random names now come from a dedicated fantasy-name pool.
- Character preview now deliberately removes equipped headgear while editing appearance so hair style/color can always be inspected.
- Added exact-rarity random gear spawning and a custom item builder. Custom items reuse live gear rules for base items, rarity stat/property/feat budgets, legal properties and legal extra feats; generated items enter starting inventory.
- Expanded the live creature test catalog from 3 to 9: Walker, Ripper, Brute, Ghoul, Hound, Stalker, Marauder, Warden and Juggernaut.
- Replaced the fixed three-counter spawn boundary with a catalog-driven roster dictionary and generic spawn loop; the Developer Screen paginates automatically across the full catalog with a combined cap of 40.
- Added a Summary review gate for character, starter kit, dev gear queue and creature roster; Arena generation now happens from that final page.
- Extended CI smoke coverage for Safari-ready name input structure, fantasy names, helm-hidden creator preview, exact-rarity/custom dev gear, expanded creature catalog, arbitrary scenario rosters and dev-gear handoff into starting inventory.

## 2026-08-13 — Character Creator / Paper Doll Finish
- Fixed head/crown orientation so hair stays on the crown instead of reading as chin hair.
- Equipped headgear now replaces/hides hair, matching the creator note.
- Replaced hash-derived weapon marks with named silhouettes for knives, swords, bows, crossbows, maces, hammers and axes; Guard shields and headgear also gained distinct shapes.
- Added a geometry smoke assertion for crown direction and expanded manual paper-doll checks.

## 2026-08-13 — Character Creator + Equipped Paper Doll
- Wired `PlayerProfile` into the live setup/session boundary; the created name and appearance now reach the runtime player.
- Added a mobile-first creator with editable name, body build, skin tone, hair style/color, random name/look, and a live selected-starter preview.
- Replaced the blue player circle with a layered code-drawn paper doll that rotates with facing and visibly renders equipped armor, cloak, headgear, gloves, belt, boots, weapon and offhand.
- Character/inventory and combat HUD now show the created identity; the character overlay includes a larger equipped-look preview.
- Appearance is cosmetic only: the fixed baseline human and equipment-driven build rules are unchanged.
- Strengthened smoke coverage for appearance normalization, setup→runtime profile wiring and the live paper-doll renderer.

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
- Added distinct **Walker, Ripper and Brute** icons with HP bars.
- Ripper is the fast, perceptive, higher-intelligence hunter; Brute is the slow, durable, low-intelligence physical threat.
- Launch menu originally controlled each of the three creature counts independently, combined cap 40, default 8/3/1.
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
