# Arena Combat Lab — AI Project Context

> Read `README_SOPS.md` + this file once before the first code edit of each coding prompt. Future: `ROADMAP.md` · History: `CHANGELOG.md` · Regression: `TEST_MATRIX.md`.

## Current alpha
Same baseline human every run; equipment creates the build. Fixed Common Stealth/Ranged/Guard/Ravager starters, mixed Walker/Ripper/Brute roster (default 8/3/1, cap 40), open Arena procgen, four gear chests, cache + return-to-stair objective. No levels. Epic/magic disabled.

Core invariants: variable action-time ticks; facing/FOV/LOS/fog/physical sound; HP/Fear/Fatigue; Weapon/Offhand feats; local awareness/memory; no noise-spawn director; global `!! SPOTTED !!`.

Player identity comes from the setup-level `PlayerProfile`: editable name plus cosmetic body, skin, hair style and hair color. Appearance never changes stats. The tactical player icon is a code-drawn layered paper doll; currently equipped Armor/Cloak/Head/Gloves/Belt/Boots plus Weapon/Offhand visibly change the avatar.

## CSD2 handoff modules
These are live and covered by the CI smoke gate:
- `scripts/player/PlayerProfile.gd` — normalized identity/appearance record and creator option catalog; wired into the live player at the setup/session boundary.
- `scripts/arena/ArenaScenario.gd` — normalized starter/roster/layout/seed request for future setup, contracts and Dev Portal; does not change live gameplay yet.
- `scripts/catalogs/CreatureCatalog.gd` — read-only adapter over live creature definitions; no duplicated creature stats.

Character creator work lives in `MainArenaSetup.gd`. Player body/equipment rendering and identity HUD overlays live in `MainArenaVisuals.gd`. The previous Arena tile/creature visual implementation is preserved as `MainArenaBaseVisuals.gd`, directly beneath the player-visual layer. Combat/gear code exposes state and remains free of drawing logic.

## Live runtime
`main.tscn` → `MainArenaSetup -> MainArenaVisuals -> MainArenaBaseVisuals -> MainArenaMap -> MainArenaCreatures -> MainAlphaAI -> MainAlphaDual -> MainAlphaWeapons -> MainAlphaGear -> MainAlphaWrapper -> MainAlphaCombat -> MainAlphaState -> MainBoundless -> MainMobileWeb -> MainMobile -> MainPerception -> Main`

Primary owners: Setup=creator + launch roster + PlayerProfile boundary; Visuals=player paper doll + identity overlays; BaseVisuals=tiles/creatures; Map=procgen; Creatures=creature stats/behavior; AlphaAI=awareness/tracking; AlphaGear/Combat/State=gear+combat state; MobileWeb=Safari touch; Perception=intent/memory/sound readability.
