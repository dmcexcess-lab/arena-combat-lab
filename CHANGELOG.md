# Arena Combat Lab — Changelog

Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md`

## 2026-10-05 — Tavern Keeper: Animated Tavern Shell & Diegetic Navigation
- Reopened the post-release presentation architecture while leaving the Slice 15 simulation unchanged.
- Replaced the dashboard-first default with a full-screen animated tavern interior.
- Added eight diegetic destinations: bar/tavern management, contract board, heroes' table, workshop, merchant corner, front door/applicants, Chronicle ledger and expedition road map.
- Split the former long scrolling dashboard into eight focused management screens, each with a single Back to Tavern path; Escape and the title also return home.
- Deploying a hero now naturally transitions to the expedition/road-map screen.
- The tavern scene mirrors authoritative state: seated and queued patrons, served food/drink states, non-deployed heroes, active merchant, active applicant, facility/service status, selected contract, Chronicle total and active expeditions.
- Added animated fireplace, lamps, rain, patron bob/queue behavior, mug lifting and a working server, with `prefers-reduced-motion` support.
- Added touch-oriented scene hit areas and retained 44px coarse-pointer controls.
- Optimized mobile rendering so hidden menu screens stop repainting every 250 ms while the underlying simulation continues globally.
- Added `test_scene_ui.js` and updated release UX acceptance to require the tavern scene/navigation architecture.

## 2026-10-05 — Tavern Keeper Slice 15: Balance, UX & Release Acceptance
- Froze Tavern Keeper architecture for release acceptance; no new major gameplay system was introduced.
- Ran broad seeded batches across every contract and the prepared/ranged/reckless/unprepared hero profiles.
- Fixed the major threat inversion: reduced excess Blackroot Mine encounter density and strengthened the Wren Bridge troll to make Threat 6 the hardest aggregate contract.
- Release batch now measures founding-roster aggregate success at roughly 100% / 99% / 27% / 25% / 15% across Threat 1 / 2 / 3 / 4 / 6.
- Preserved personality risk: cautious heroes typically retreat from lethal contracts while reckless Borin retains high permanent-death exposure on upper-tier work.
- Verified deliberately unprepared heroes cannot brute-force the board and upper-tier failures retain positive performance/objective pay.
- Verified seeded five-minute tavern income remains bounded: baseline about 76.8g, fully developed about 232.65g.
- Added a four-step onboarding panel explaining earn → prepare → choose risk → autonomous deployment.
- Improved phone layout: compact two-column header stats, 44px coarse-pointer controls and 16px numeric inputs to avoid iOS zoom/readability problems.
- Added `test_release.js`, covering seeded threat bands, preparation separation, death behavior, paid failure, economy bands, offline constants and static phone/desktop UX requirements.
- Slice 15 closes the planned feature-slice sequence; subsequent work is evidence-driven maintenance, tuning and polish.

## 2026-10-05 — Tavern Keeper Slice 14: Chronicle & Tavern Legacy
- Added a persistent Chronicle owned by TavernRoster, with up to 1,000 event entries, one-time milestones and record-holders.
- Fresh taverns record the opening and founding roster; recruited heroes retain explicit applicant origin/quality/cost history.
- Every settled contract adds a readable Chronicle result with outcome, objective score, payout and kills.
- Major objective feats create dedicated entries for designated boss kills, full miner rescues and strong caravan escorts.
- Rank/title advancement, first-time legend status and permanent deaths create career/legend/memorial entries.
- Tavern upgrades create history; Level 3/6 facilities plus patron, service-revenue and resolved-contract thresholds create one-time milestones.
- Added persistent records for most contracts, successes, kills, career gold, highest rank, best objective score and largest single-contract payout.
- Fallen heroes remain eligible for records and legends.
- Slice 13/older saves reconstruct founders, recruitment origins, contract history, death memorials and records from existing saved ledgers.
- Added TavernRoster snapshot v11, Chronicle UI, and test_chronicle.js.

## 2026-10-05 — Tavern Keeper Slice 13: Offline Progression & Return Summary
- Added wall-clock save checkpoints and browser save version 4.
- Added authoritative offline catch-up capped at 8 hours using the exact same 0.25-second tavern and expedition tick order as live play.
- Preserved per-expedition Pause/1×/4×/12× speed offline; manually paused heroes do not advance.
- Centralized resolved-expedition settlement in core so online and offline gold/material/career/death/durability outcomes share one path.
- Tavern patrons, merchants and applicants continue advancing while the browser is closed or suspended.
- Added mobile/browser visibility handling: hidden pages checkpoint and stop live ticking; visible resume performs one catch-up, preventing double-counted background timer time.
- Added a While You Were Away report for tavern income, expedition payouts/results, patron/visitor activity, active progress, paused runs and 8-hour cap truncation.
- Legacy saves without a checkpoint do not receive speculative retroactive progress.
- Added test_offline.js; staged regression proves offline state is identical to the equivalent sequence of live 0.25-second ticks.

## 2026-10-05 — Tavern Keeper Slice 12: Tavern Facilities & Preparation Depth
- Added permanent Lodging, Infirmary and Workshop levels to the tavern alongside existing Kitchen and Bar/Commons progression.
- Kitchen levels strengthen meal hunger/morale recovery, shorten meal preparation and increase Hearty Meal buff duration/potency.
- Bar/Commons levels strengthen Unwind morale/fatigue recovery; developed commons grant a persistent Good Company readiness/combat/retreat benefit.
- Lodging levels strengthen Nap/Full Rest recovery, shorten rest actions and increase Good Sleep duration/potency.
- Infirmary levels strengthen healing, shorten treatment and remove more injury severity/additional injuries at high quality.
- Workshop levels reduce repair gold/time costs, can reduce Scrap Iron consumption on major repairs, and shorten crafting time.
- Added authoritative preparation/crafting quote APIs so UI estimates and execution use the same facility formulas.
- Prep action UI now shows responsible facility level and exact facility-adjusted time; repair/crafting UI shows Workshop effects.
- Added TavernEconomy snapshot v2 and TavernRoster snapshot v10 migration; old saves default new facilities to level 1.
- Added test_facilities.js and wired all twelve Tavern Keeper suites into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 11: Objective Mechanics & Partial Contract Scoring
- Added explicit contract sub-objective metadata and persistent objective scorecards.
- Hunt now tracks the pack trail, wolf culls and den clearance.
- Extermination tracks infestation reach, vermin kills and main-nest destruction.
- Escort tracks checkpoint protection and caravan integrity; the contract can fail with the hero alive if the caravan is destroyed.
- Delve tracks deep-area discoveries, finding the missing miners and the number rescued.
- Boss Hunt tracks only the designated bridge boss for cumulative damage milestones and kill credit.
- Sub-objectives immediately award banked gold and performance gold/sec growth, preserving useful progress on retreat, failure or death.
- Successful contracts close the objective score at 100; partial failures retain their actual score, objective events and bonus gold.
- Career XP now recognizes objective score when it exceeds simple route progress.
- Expedition snapshot version 4 persists objective state/events/awards; Slice 10 snapshots migrate safely.
- Added objective score/state UI, detailed final scorecards and test_objectives.js.

## 2026-10-05 — Tavern Keeper Slice 10: Concurrent Expeditions & Hero Assignment
- Added persistent `ExpeditionManager` support for multiple simultaneous hero contracts.
- Each expedition now has an independent ID, hero assignment, simulation state, speed, RNG, income, condition, settlement state and report.
- A hero cannot be deployed twice and remains assigned until the current expedition is settled.
- Added per-expedition pause/1×/4×/12× speed while other expeditions continue at their own speeds.
- Reworked the browser expedition panel into selectable expedition tabs; the focused run can be inspected without pausing others.
- Tavern service, merchants, applicants, crafting and preparation/equipment work for non-deployed heroes continue while expeditions run.
- Settlement now accepts persistent expedition IDs so identical repeat runs by the same hero/contract/seed cannot collide with prior payout keys.
- Added migration from the Slice 9 single-expedition browser save shape into the multi-expedition manager.
- Added test_concurrency.js and wired it into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 9: Equipment Durability & Maintenance
- Added persistent per-copy durability for equipped and stored weapons/armor.
- Serviceable gear retains full stats; Worn, Damaged and Broken tiers apply progressively stronger combat/readiness penalties.
- Weapons wear when used in combat; armor wears when hostile hits land.
- Added tavern repairs for equipped or stored gear using gold, preparation time and Scrap Iron for substantial wear.
- Crafting and merchant procurement create pristine durable copies; equipment swaps preserve each physical copy's condition.
- Added deterministic death gear resolution: at 50%+ objective progress, equipped durable gear is recovered into shared stock at at most 35% durability; earlier deaths lose equipped gear.
- Added save-version-9 migration from Slice 8 durability-less gear.
- Added test_durability.js and wired it into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 8: Recruitment & Applicants
- Added persistent timed applicant visits driven by the live tavern clock; applicants remain for a finite window and move on if not hired.
- Added deterministic generated applicant identities with varied stats, AI-relevant traits, health/hunger/fatigue/morale, personal starting gear and supplies.
- Applicant Quality 1–3 is derived from tavern Seating, Service, Kitchen and Bar development; higher quality raises stat floors, condition quality, trait count and starting-gear ceiling.
- Added explicit gold recruitment costs derived from applicant quality, stats and starting equipment.
- Hiring transfers the exact inspected applicant into the persistent roster at career rank 1; applicants are not rerolled/recreated on acceptance.
- Recruited heroes use the existing preparation, shared inventory transfer, unrestricted contract board, career progression and permanent-death/Fallen systems.
- Total living-roster wipe is now recoverable through tavern income plus future applicants instead of requiring New Tavern.
- Steel Sword / Chain Mail are now treated as premium ordinary gear rather than merchant-exclusive because Quality 3 applicants may arrive owning them; crafted-only gear remains crafting-exclusive.
- Recruitment state/history now persists and Slice 7 saves migrate to a scheduled applicant visit.
- Added test_recruitment.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 7: Contract Board & Threat Ladder
- Replaced the single hard-coded Greymill contract with an authoritative data-driven five-contract catalog spanning Threat 1, 2, 3, 4 and 6.
- Added Wolves at Briar Farm (Hunt), Ashroad Caravan (Escort), Blackroot Mine (Delve) and The Wren Bridge Troll (Boss Hunt) while retaining Rats Below Greymill (Extermination).
- Added Wolf, Bandit, Road Raider, Cave Crawler, Cave Stalker and Bridge Troll enemy definitions used by the new contracts.
- Contracts now define their own route graph, optional-risk branches, enemy composition, material profile and performance-income multiplier.
- Higher-threat contracts raise potential performance gold/sec through the existing performance-pay mechanic rather than a separate payout system.
- Added a persistent Contract Board selection and hero-relative risk display; every living hero remains deployable to every contract.
- Active expedition saves now persist contract ID so refresh/resume cannot silently fall back to Greymill; old expedition saves still migrate to Greymill.
- Settlement keys now include contract ID to prevent cross-contract payout collisions.
- Added test_contracts.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 6: Merchants & Procurement
- Added persistent timed merchant visits driven by the live tavern clock, with deterministic arrival/departure, finite rotating offers and visit history.
- Added merchant quality derived from tavern Seating, Service, Kitchen and Bar development; better taverns unlock higher-quality stock pools.
- Merchants sell ordinary recovered materials, baseline equipment and limited premium Healing Potions into the same shared material/item inventories used by crafting and hero loadouts.
- Added merchant-only Quality 3 Steel Sword and Chain Mail so tavern development materially improves procurement.
- Preserved crafting identity: Scrap Spear, Plated Vest and Field Bandages never appear in merchant stock.
- Purchases spend exact shared gold, decrement finite visit stock and persist in purchase history; sold-out/insufficient-fund purchases are atomic failures.
- Merchant state, RNG, active visit, timers, offers and purchase history now persist; Slice 5 saves migrate to a scheduled merchant visit.
- Merchant UI updates on the live tavern clock and contract settlement now immediately refreshes crafting inventory.
- Added test_merchants.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 5: Loot & Crafting
- Added an authoritative compact crafting catalog using the materials already recovered by contracts.
- Added Scrap Spear, Plated Vest, Healing Potion and Field Bandages recipes with exact material costs and preparation-time costs.
- Added persistent shared tavern item stock separate from raw material stash.
- Equipping stored gear now transfers a real item from tavern stock to the selected hero and returns replaced gear to stock; the UI no longer provides free weapon/armor dropdown swapping.
- Crafted consumables must be transferred from tavern stock into hero supplies with carrying caps.
- Added autonomous Field Bandage use in combat; bandages heal moderate wounds and reduce a lingering injury.
- Retired the direct invisible Buy Potion preparation shortcut so potions now come from crafting until merchant procurement is implemented.
- Craft inventory/history now persists and old Slice 4 saves migrate with empty crafting stock.
- Added test_crafting.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 4: Tavern Economy
- Added a real patron-service economy to the persistent tavern state instead of a synthetic flat gold timer.
- Patrons deterministically arrive, take limited seats or queue, order food/drink, consume service capacity, pay, linger and leave; overflow patrons can walk away.
- Added projected and rolling tavern gold/sec plus live seated/queued patron and recent-service presentation.
- Added bounded Seating, Service, Kitchen and Bar upgrades. Seating/service change throughput bottlenecks; kitchen/bar increase patron spend.
- Tavern patron income deposits continuously into the same shared funds used by hero preparation and upgrades, while expedition performance income remains a separate volatile stream.
- Tavern service continues in real time while a hero expedition is running or hero simulation is paused.
- Tavern state, patron queue, active patrons, RNG state, revenue history and upgrades now persist through the existing browser save.
- Added test_tavern.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 3: Persistent Heroes
- Added a real multi-hero tavern roster with Edrin Vale, Mara Fen and Borin Hale as distinct persistent starter heroes.
- Added per-hero career XP/rank, Melee/Ranged/Survival skill growth, contract history, evolving traits and earned titles.
- Career skills now feed back into readiness and combat rather than existing as display-only progression.
- Added shared tavern settlement around hero-specific preparation: funds/materials are shared while condition/equipment/progression remain per hero.
- Permanent deaths now remove heroes from the living roster and preserve their final career in a Fallen archive.
- Added full roster serialization plus active-expedition snapshot/restore including RNG/combat/progress state for deterministic refresh/resume.
- Browser localStorage now auto-saves roster selection, preparation, loadouts, expedition progress and settlement.
- Added test_roster.js plus JavaScript syntax checks to the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 2: Preparation & Condition
- Replaced the Slice 1 developer sliders with a real tavern-side preparation loop while preserving the autonomous contract core.
- Added persistent post-contract health, hunger, fatigue, morale, supplies and combat injuries for surviving heroes.
- Added preparation actions for meals, rest, morale recovery, first aid, physician treatment and potion purchase; actions cost prototype gold and preparation time.
- Added one-contract preparation effects (Hearty Meal, Good Sleep, Patched Up) that modify actual readiness/need decay/combat behavior.
- Added persistent injury generation/severity and treatment; injuries alter readiness, combat effectiveness and retreat pressure.
- Expedition gold and materials now settle into tavern state exactly once; dead heroes cannot be prepared or redeployed.
- Added a dedicated Slice 2 Node regression suite and wired it into Pages CI.

## 2026-10-05 — Tavern Keeper Slice 1 Hosted
- Added `tavern-keeper/` as a sibling browser prototype without changing the Arena Godot runtime.
- Published the autonomous contract Slice 1 through the existing Pages artifact at `/tavern-keeper/`.
- Added CI coverage for the Tavern Keeper deterministic simulation/regression suite before Pages export.

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
