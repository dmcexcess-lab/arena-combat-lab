# Arena Combat Lab — Changelog

Chronological record for humans and AIs. Current truth: `PROJECT_CONTEXT.md`. Future intent: `ROADMAP.md`.

## 2026-08-13 — Project Docs + Long-Term Game Shape
- Rewrote the human README around the current Arena/Boundless identity.
- Added the long-term **Prison RPG + Arena contracts** roadmap.
- Defined the future Developer Portal and Arena's role as the shared creature/equipment test ground across our games.
- Split docs cleanly: README (humans), Roadmap (humans+AIs), Changelog (humans+AIs), SOP (AIs), Context (AIs).
- Compacted overlapping documentation so each file has one clear source-of-truth role.

## 2026-08-13 — Weapon Identity + Walker Awareness
- Short Bow now owns diagonal-adjacent **Quick Shot**; Long Bow has longer range, higher damage and knockback but no Quick Shot.
- Stealth can dual-wield small blades; Ravager can dual-wield full Ravager weapons.
- Added **Dual Strike**: main-hand hit + reduced-damage offhand hit, longer action, more fatigue, 240t cooldown.
- Damaging an enemy reveals the attacker; lethal stealth hits can still alert nearby Walkers.
- Added AI Intelligence-driven awareness sharing, spot memory, crude breadcrumb following and short post-loss search.
- Walker Intel 1 shares awareness locally; shared awareness becomes FOLLOW, not omniscient tracking.
- `!! SPOTTED !!` persists while an enemy remembers the player; armor weight has a smaller tracking effect than AI Intelligence.

## 2026-08-13 — Boundless Combat HUD
- Rebuilt the dungeon HUD around Boundless combat instead of the First Fire control shelf.
- Desktop keeps WASD; mobile keeps the 90-degree movement/facing controls.
- Added up to six visible Weapon/Offhand feat buttons, targeted feat arming and 1–6 desktop shortcuts.
- Added tick-based feat cooldowns with READY/ARMED/remaining-tick states.
- Regular map taps remain attack/target/context input; doors are tap-to-open/close.

## 2026-08-13 — Alpha Equipment Generator + Loot Chests
- Fixed baseline human at MGT/FIN/AWR/VIT/WIL 2 with 22 HP; equipment creates the build.
- Added Offhand and the full Stealth/Ranged/Guard/Ravager compatibility model.
- Added fixed Common starter kits and Common → Uncommon → Rare → Enchanted generation; Epic/magic disabled.
- Gear now affects stats, HP, armor, Fear, Fatigue, noise, action ticks, properties and Weapon/Offhand feats.
- Added Stealth throwing, Ranged spacing, Guard shield/multi-target control and Ravager single-target execution identities.
- Procedural dungeons now place four chests; stepping onto one rolls a gear item into inventory.

## 2026-08-13 — Run Wrapper + Dungeon Systems
- Added pre-run setup for starter identity and exact Walker count; dungeon generates only when the run starts.
- Removed Wizard/Mage and established Stealth, Ranged, Guard and Ravager.
- Added random connected dungeons, random stair/player spawn, cache objective and return-to-stair victory.
- Standardized Walker benchmark stats and removed hidden Walker stat RNG.
- Added character/inventory UI and gear-driven attributes.
- Fixed Safari setup-wrapper touch routing after an early-return bug swallowed mobile taps.

## Earlier Arena Foundation
- Converted the original convenience-store combat prototype into the dungeon systems lab.
- Added variable action-time combat, facing, directional FOV, fog, last-known enemies and physical sound propagation.
- Added stealth/rear attacks, crowd pressure/Fear, doors/glass, firearms/hazards and global `!! SPOTTED !!`.
- Established the rule that all enemies already exist in the space: noise changes behavior; it does not spawn enemies.
