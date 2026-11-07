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
`tavern-keeper/` contains **Tavern Keeper — Spatial Tavern Simulation & Diegetic Navigation**, a post-release presentation simulation layered over the unchanged Slice 15 gameplay/economy model. The default screen remains the tavern room with eight physical navigation objects, but patrons are no longer placed by looping CSS animation. A persistent spatial actor layer keyed by authoritative patron IDs now gives patrons coordinates, routes, seat assignments and lifecycle movement. New patrons originate on the exterior road; queued patrons wait entirely outside; when a seat opens they walk to the exterior door, cross the inside threshold and walk to their assigned seat. When their authoritative tavern state ends, they walk back through the door and off the road before their visual actor is removed. Staff count is derived from `TavernEconomy.serviceSlots()` and staff actors walk from bar home positions to the actual unserved seated patrons selected by the economy service order, then return home. The scene now has a real exterior strip/road/porch; the front door and applicant position are outside the interior boundary. CSS loops are limited to ambient/micro motion (fire, lamps, rain, mugs, walking limbs), while actor translation comes from `requestAnimationFrame` over stateful routes. Core economy/combat/contracts/persistence/offline/balance rules remain unchanged. `test_scene_ui.js` now gates stateful motion, outside queue geometry, staff routing, nine screens and eight diegetic hotspots.

## Hosted Route Lab prototype
`route-lab/index.html` is a self-contained football X/O play editor and deterministic simulation prototype, published to GitHub Pages at `/route-lab/`. The existing Pages workflow copies it alongside Arena and Tavern Keeper; this does not alter Godot runtime behavior. It includes 11 offensive and 8 defensive presets, 22-player presentation, editable routes/assignments, formation validation, and replay controls. Added six-lesson Offense and Defense campaigns with small-sided training scrimmages (explicit relaxed training formation legality) progressing to full 11v11. The offense finale runs a touchdown drive with first downs; the defense finale runs a four-down defensive stand. Player changes are checked against lesson baselines and deterministic simulation outcomes, with progress in `route-lab-campaign-v1` localStorage. Source modules `engine.js`, `plays.js`, `campaign.js`, and `app.js` are retained for maintenance, while `index.html` embeds them for standalone Pages deployment; update both when changing the application. CI executes `route-lab/tests/campaign.test.cjs`. Added `encyclopedia.js`: categorized, searchable glossary with cross-links from every campaign clinic, available in all modes. Each of the twelve stages now has a three-section coaching explanation, a three-task workshop, replay question, and knowledge quiz; both live-play objective and quiz are required. QB pass logic evaluates predicted catch locations, defender separation, throwing lanes, read priorities, pressure and situational depth, uses seeded viable-read selection and writes `decisions[]` for the Film Room. The seed input increments each new Run; entering an old seed reproduces a matchup. `route-lab/tests/knowledge.test.cjs` verifies content and read variation. This is an alpha approximation, not yet fully NFL-calibrated.

## Route Lab scouting/rotation update
The authoritative `GridironCore.statsOf(player)` produces editable 1–99 skill ratings with role-based defaults; movement, throwing, blocking, coverage, catches and tackling consume ratings. The player inspector edits `player.stats` and the coach-layer selector renders links/areas for responsibilities, protection, coverage, blitz, run-fit, schematic open grass and player matchups. `RouteCampaign.scrimmageSetup(lesson,side,wave)` generates deterministic SCOUT/MAN/ZONE/BLITZ sub-scrimmages for each of the first five lessons; `SCRIMMAGE_ROSTERS` advances 3v1, virtual-snap 3v3, 5v5, 7v7 and legal 11v11. The final campaign stages stay drive challenges. Virtual snap is tagged `trainingVirtualSnap` and only relaxes the center requirement in explicitly reduced-player training; never in 11v11. Updating standalone `route-lab/index.html` requires embedding updated engine/campaign/app modules exactly. CI runs scouting tests.


## Route Lab Mission One update
Mission One now presents a live per-player assignment scout for its opening 3v1 run. The unchanged play is an observation rep; the outcome gate then requires an RB route edit plus the yardage objective through all four defensive looks, keeping the roster constant for comparison. The standalone HTML embeds the current maintained modules.

## Route Lab player and contact model
The same `GridironCore.simulate` drives free play and campaign drills. Its 1–99 player model now includes stamina, pass rush, pursuit, route running and runner vision alongside the original ratings. Sprinting and blocking accumulate within-play fatigue; acceleration, agility and route running affect cuts; runner speed and vision affect path execution; defenders use rated reaction and pursuit to track assignments. Block strength now contests pass rush, a tackler has a recovery period after a missed attempt, and defenders contest the projected catch point. QB passes lead moving receivers through an iterative flight estimate. Replay frames include remaining player energy. These are deterministic educational approximations; fatigue resets at each snap and is not yet a persistent drive condition.

## Route Lab live-ball and 2026 rules pass
After a catch, the carrier chooses an open-field lane and keeps running, nearby offensive players offer support blocks, and all defenders enter pursuit. An interception remains live for a return. Campaign downs count negative yards and defensive possession changes; basic end-zone sacks/tackles can produce safeties. Full-squad backfield players wearing ineligible numbers must report eligible. `route-lab/RULES_AUDIT.md` maps implemented 2026 rulebook slices to the remaining gaps. This remains a scrimmage teaching simulation, not a fully NFL-compliant game engine.

## Route Lab position and decision audit
`route-lab/POSITION_AUDIT.md` records actual role behavior, counterfactual checks, and gaps. The carry branch now executes for RBs with routes (it was previously shadowed by the generic route branch), samples live hole geometry, and continues beyond the last run waypoint. Defenders pursue established runs instead of returning to a zone landmark. QB awareness affects pressure recognition and escape; safeties keep top leverage during pursuit. Slot WR, X/Z, nickel, TE, and linebacker role defaults/speeds were corrected. Juke, spin, and stiff arm attempts have spatial outcomes and are listed in the play result; each simulation also returns per-player distance and contact records. RPO, play action, screen timing, and NFL-calibrated gains remain incomplete.

