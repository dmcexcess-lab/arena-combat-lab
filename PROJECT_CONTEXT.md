# Arena Combat Lab — AI Project Context

> Read `README_SOPS.md` + this file once before the first code edit of each coding prompt. Future: `ROADMAP.md` · History: `CHANGELOG.md` · Regression: `TEST_MATRIX.md`.

## Current alpha
Same baseline human every run; equipment creates the build. The standalone build now opens on a four-page **Developer Screen** (Character / Gear / Creatures / Summary) that is also the intended future prison→Arena testing entry point. Fixed Common Stealth/Ranged/Guard/Ravager starter kits remain available; the default creature roster is 8 Walkers / 3 Rippers / 1 Brute, with six additional catalog creatures available through paged roster controls. Cap 40. Open Arena procgen, four gear chests, cache + return-to-stair objective. No levels. Epic/magic disabled.

Core invariants: variable action-time ticks; facing/FOV/LOS/fog/physical sound; HP/Fear/Fatigue; Weapon/Offhand feats; local awareness/memory; no noise-spawn director; global `!! SPOTTED !!`.

Player identity comes from the setup-level `PlayerProfile`: editable name plus cosmetic body, skin, hair style and hair color. Random names use a dedicated fantasy-name pool. Appearance never changes stats. The Character page uses a real `LineEdit` so touch browsers can focus a native text field; the paper-doll preview deliberately hides the starter Head slot so hair remains visible while editing. Runtime paper dolls still visibly render equipped Armor/Cloak/Head/Gloves/Belt/Boots plus Weapon/Offhand.

## Developer Screen
`MainArenaSetup.gd` is now the Developer Screen owner and exposes `open_dev_screen(reset_character := true)` as the future prison integration boundary. Only the Summary page launches the Arena.

- **Character:** name/appearance creator with Safari-friendly LineEdit, fantasy random name/look and helm-hidden preview.
- **Gear:** choose a baseline starter kit; queue exact-rarity random items; build custom items from the authoritative gear catalog with rarity budgets, explicit bonus stats, legal properties and legal extra feats. Queued items enter the new character's starting inventory.
- **Creatures:** catalog-driven pagination and exact counts for every implemented creature, combined cap 40.
- **Summary:** review character, starter, queued dev gear and roster before generation.

`scripts/dev/DevGearFactory.gd` is a dev-only adapter over `AlphaGearCore.gd`; it reuses live catalog, native stats, rarity budgets, property legality and feat pools rather than duplicating gear rules.

## Creature catalog
Live order: Walker, Ripper, Brute, Ghoul, Hound, Stalker, Marauder, Warden, Juggernaut. The original three remain defined in `MainArenaCreatures.gd`; `MainArenaDevCreatures.gd` owns the expansion plus the generic `creature_spawn_counts` roster boundary and generic spawn loop. `CreatureCatalog.gd` exposes the combined live set without copying stats.

## CSD2 handoff modules
These are live and covered by the CI smoke gate:
- `scripts/player/PlayerProfile.gd` — normalized identity/appearance record, fantasy name pool and creator option catalog.
- `scripts/dev/DevGearFactory.gd` — exact-rarity/random/custom dev gear adapter over live gear rules.
- `scripts/arena/ArenaScenario.gd` — normalized arbitrary catalog roster/starter/layout/seed request.
- `scripts/catalogs/CreatureCatalog.gd` — read-only adapter over the live combined creature definitions.

Character/Dev Screen work lives in `MainArenaSetup.gd`. Player body/equipment rendering and identity HUD overlays live in `MainArenaVisuals.gd`. Combat/gear code exposes state and remains free of setup drawing logic.

## Live runtime
`main.tscn` → `MainArenaSetup -> MainArenaVisuals -> MainArenaBaseVisuals -> MainArenaMap -> MainArenaDevCreatures -> MainArenaCreatures -> MainAlphaAI -> MainAlphaDual -> MainAlphaWeapons -> MainAlphaGear -> MainAlphaWrapper -> MainAlphaCombat -> MainAlphaState -> MainBoundless -> MainMobileWeb -> MainMobile -> MainPerception -> Main`

Primary owners: Setup=Developer Screen + launch boundary; Visuals=player paper doll + identity overlays; BaseVisuals=tiles/creatures; Map=procgen; DevCreatures=expanded catalog + generic roster/spawn; Creatures=base creature behavior/stats; AlphaAI=awareness/tracking; AlphaGear/Combat/State=gear+combat state; MobileWeb=Safari touch; Perception=intent/memory/sound readability.

## Hosted sibling prototype
`tavern-keeper/` contains **Tavern Keeper — Slice 8: Recruitment & Applicants**, a dependency-free browser prototype intentionally separate from the Arena Godot runtime/inheritance chain. `core.js` now owns persistent `RecruitmentSystem` applicant visits on the same live tavern clock as patrons/merchants. Applicants are deterministic generated hero records with identity, quality-tiered stats, AI-relevant traits, current health/needs/morale, personal starting gear/supplies and an explicit gold hiring cost. Tavern Seating/Service/Kitchen/Bar development determines applicant Quality 1–3. Hiring transfers the exact inspected applicant into the persistent roster at career rank 1; recruited heroes use the same preparation, inventory, unrestricted contract deployment, career progression and permanent-death/fallen flow as founding heroes. Total party wipes are recoverable because the tavern continues earning and applicants continue arriving. Premium Steel Sword/Chain Mail can arrive on Quality 3 applicants as personal gear; crafted-only Scrap Spear, Plated Vest and Field Bandages remain crafting-exclusive. Recruitment visit/RNG/history state serializes with all prior systems and Slice 7 saves migrate to a scheduled applicant visit. `app.js` renders applicants without owning generation rules. CI syntax-checks the browser JS and runs all eight Tavern Keeper suites; Pages publishes it at `/arena-combat-lab/tavern-keeper/`.
