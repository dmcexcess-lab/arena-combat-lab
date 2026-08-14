# Arena Combat Lab — AI Project Context

> Read `README_SOPS.md` + this file once before the first code edit of each coding prompt. Future: `ROADMAP.md` · History: `CHANGELOG.md` · Regression: `TEST_MATRIX.md`.

## Current alpha
Same baseline human every run; equipment creates the build. Fixed Common Stealth/Ranged/Guard/Ravager starters, mixed Walker/Ripper/Brute roster (default 8/3/1, cap 40), open Arena procgen, four gear chests, cache + return-to-stair objective. No levels. Epic/magic disabled.

Core invariants: variable action-time ticks; facing/FOV/LOS/fog/physical sound; HP/Fear/Fatigue; Weapon/Offhand feats; local awareness/memory; no noise-spawn director; global `!! SPOTTED !!`.

Player still renders as the blue circle.

## CSD2 handoff modules
These exist now and are CI-smoke-tested, but **do not change live gameplay yet**:
- `scripts/player/PlayerProfile.gd` — persistent identity record: id, display name, open-ended appearance data.
- `scripts/arena/ArenaScenario.gd` — normalized starter/roster/layout/seed request for future setup, contracts and Dev Portal.
- `scripts/catalogs/CreatureCatalog.gd` — read-only adapter over live creature definitions; no duplicated creature stats.

Next character-creator/paper-doll pass should wire `PlayerProfile` at the top setup/session boundary and keep visible body/armor/weapon work inside `MainArenaVisuals.gd`. Combat/gear code should expose state, not drawing logic.

## Live runtime
`main.tscn` → `MainArenaSetup -> MainArenaVisuals -> MainArenaMap -> MainArenaCreatures -> MainAlphaAI -> MainAlphaDual -> MainAlphaWeapons -> MainAlphaGear -> MainAlphaWrapper -> MainAlphaCombat -> MainAlphaState -> MainBoundless -> MainMobileWeb -> MainMobile -> MainPerception -> Main`

Primary owners: Setup=launch roster; Visuals=rendering; Map=procgen; Creatures=creature stats/behavior; AlphaAI=awareness/tracking; AlphaGear/Combat/State=gear+combat state; MobileWeb=Safari touch; Perception=intent/memory/sound readability.
