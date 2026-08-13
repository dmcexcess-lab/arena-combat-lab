# Arena Combat Lab — Changelog

## 2026-08-13 — Weapon Identity + Walker Awareness
- Short Bow now owns **Quick Shot**: only it can fire at a diagonally adjacent target, at reduced damage/accuracy and with no knockback.
- Replaced Hunting Bow with **Long Bow**: slower, 8-tile range, 8–12 base ranged damage, knockback 2, and no close-range Quick Shot.
- Stealth armor can dual-wield only small blade offhands (Stiletto/Dirk); Ravager armor can dual-wield full Ravager weapons.
- Ravager's fixed starter kit now includes an offhand Execution Sword so dual wield can be tested immediately.
- Dual-wield weapon offhands grant **Dual Strike**: two hit rolls, full main-hand damage then 60% offhand damage, with longer action time, higher fatigue, and a 240-tick cooldown.
- A successful hit now reveals the attacker even when the hit began from stealth. A lethal stealth hit can still alert nearby enemies at the impact location.
- Added per-enemy AI intelligence fields for awareness sharing, pursuit memory, follow budget, tracking distance, and search time.
- Walkers use AI Intelligence 1: awareness spreads one tile to adjacent Walkers, direct pursuit memory is short, breadcrumb following is crude, and post-loss searching is brief.
- Nearby enemies receiving shared awareness enter **FOLLOW** rather than magically gaining exact live tracking.
- **SPOTTED** now persists while an enemy still remembers the player, not only while direct line of sight is active.
- Armor weight has a smaller secondary effect on how long/easily enemies can track the player: Stealth is easiest to lose, Guard hardest, while enemy intelligence remains the dominant factor.

## 2026-08-13 — Boundless Combat HUD Revamp
- Rebuilt the in-dungeon UI around Boundless combat instead of the First Fire-style control shelf.
- Desktop keeps the existing WASD movement behavior; number keys 1–6 can now select equipped feats.
- Mobile keeps the 90-degree facing controls but moves them into a compact left-side movement pad.
- Up to six equipped weapon/offhand feats are always visible as a 2×3 button grid instead of living behind a FEATS popup.
- Targeted feats arm on button press and fire on the next valid map tap; tapping the same feat again cancels it.
- Arc and defensive feats still execute immediately when their button is pressed.
- Added timeline-based feat cooldowns. Buttons show READY, ARMED, SPENT, or remaining cooldown ticks plus a cooldown progress bar.
- Feat cooldowns use the same combat tick clock as movement and attacks, so taking other actions naturally burns cooldown time.
- Regular attacks remain direct enemy taps; ranged attacks remain direct target taps.
- Adjacent doors are now explicitly tap-to-open / tap-to-close; movement through an open doorway uses the movement controls.
- Greatly reduced the status header and expanded the visible tactical map area.
- The HUD now foregrounds HP, armor/DR, Fear, Fatigue, current tick, ammunition and selected feat state.

## 2026-08-13 — Alpha Equipment Generator + Loot Chests
- Replaced randomized starter gear with four fixed Common starter kits: Stealth, Ranged, Guard, Ravager.
- Baseline human is now fixed at MGT/FIN/AWR/VIT/WIL 2 with 22 base HP; equipment creates the build.
- Added Offhand slot, full armor compatibility matrix, weapon restrictions, and unrestricted rings/amulets.
- Added the complete non-magical alpha equipment catalog and Common, Uncommon, Rare, Enchanted generator. Epic/magic is disabled.
- Uncommon adds one stat and one legal quality property; Rare adds two stats, one property, and one extra weapon/offhand feat; Enchanted adds three stats, two properties, and two extra feats.
- Added HP, armor DR, Fear/Will interaction, Fatigue/Vitality interaction, and gear-driven tick/action-speed modifiers.
- Added Stealth throwing knives, Ranged close-range penalties plus diagonal Quick Shot, Guard multi-target/shield play, and Ravager single-target execution play.
- Added FEATS UI so generated weapon/offhand actions are usable on mobile.
- Random dungeons now place four loot chests. Stepping onto a chest rolls one item at 45% Common / 30% Uncommon / 18% Rare / 7% Enchanted and adds it to inventory.

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
