# Arena Combat Lab — AI Project Context

> **For every prompt that will edit code, read `README_SOPS.md` and this file once before the first code edit.** Current truth only; future scope is `ROADMAP.md`, history is `CHANGELOG.md`, regression contract is `TEST_MATRIX.md`.

## Current alpha
No levels. The same baseline human starts every run and equipment creates the build. Choose fixed Common Stealth/Ranged/Guard/Ravager starter gear, set a mixed creature roster, generate an Arena floor, open 4 gear chests, recover the cache, and return to the stair. Full clear is optional.

Launch defaults: **8 Walkers / 3 Rippers / 1 Brute**, independent counts, combined cap 40.
- **Walker:** easy low-intelligence baseline; HP 12, move 130t, AI 1.
- **Ripper:** fast hunter with stronger senses/tracking/sharing; HP 9, move 72t, AI 3.
- **Brute:** slow physical threat with loud gate-smash behavior; HP 28, move 175t, AI 1.

Arena procgen favors a large central fighting space, four satellite rooms, wide lanes, loop routes, paired gates, sparse pillars/casks, and 4 chests. Visuals are code-drawn stone tiles + distinct creature icons/HP bars. Player remains a blue circle until the paper-doll/equipment visual pass.

Established invariants: variable action-time ticks; physical facing/FOV/LOS/fog/sound; HP/Fear/Fatigue; Weapon/Offhand feats; local awareness/memory rather than omniscience; no noise-spawn director; `!! SPOTTED !!`; Epic/magic disabled.

## Live runtime
`main.tscn` → `scripts/MainArenaSetup.gd`

`MainArenaSetup -> MainArenaVisuals -> MainArenaMap -> MainArenaCreatures -> MainAlphaAI -> MainAlphaDual -> MainAlphaWeapons -> MainAlphaGear -> MainAlphaWrapper -> MainAlphaCombat -> MainAlphaState -> MainBoundless -> MainMobileWeb -> MainMobile -> MainPerception -> Main`

The obsolete `MainDungeon` inheritance layer has been removed; current Arena procgen owns map generation directly.

Primary ownership:
- `MainArenaSetup.gd` — launch roster/top layer
- `MainArenaVisuals.gd` — current tile/icon rendering
- `MainArenaMap.gd` — current open Arena procgen
- `MainArenaCreatures.gd` — current creature stats/behavior
- `MainAlphaAI.gd` — generic awareness/memory/tracking
- `MainAlphaDual.gd` / `MainAlphaWeapons.gd` — current dual-wield and Short/Long Bow patches
- `MainAlphaGear.gd` / `MainAlphaWrapper.gd` / `MainAlphaCombat.gd` / `MainAlphaState.gd` — current gear UI, HUD/cooldowns, combat and player state
- `MainBoundless.gd` — compact run/setup shell + shared Arena carve helpers
- `MainMobileWeb.gd` — Safari touch authority
- `MainPerception.gd` — compact intent/memory/sound readability

Desktop remains WASD/mouse/1–6. Mobile remains 90-degree movement/facing + feat buttons + map taps. Most-derived overrides win. Historical lower-layer implementations were pruned where they were fully superseded; active patch layers remain until they can be merged without changing behavior.
