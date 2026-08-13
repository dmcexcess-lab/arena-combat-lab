# Arena Combat Lab — AI Project Context

> **For every prompt that will edit code, read `README_SOPS.md` and this file once before the first code edit.** Current truth only; future scope is in `ROADMAP.md`, history in `CHANGELOG.md`.

## Current alpha

No levels. The same baseline human starts every run and equipment creates the build. Choose fixed Common Stealth/Ranged/Guard/Ravager starter gear, set a mixed creature roster, generate an Arena floor, open 4 gear chests, recover the cache, and return to the stair. Full clear is optional.

Launch roster defaults to **8 Walkers / 3 Rippers / 1 Brute**, with independent counts and a combined cap of 40.

- **Walker:** easy low-intelligence baseline; HP 12, move 130t, AI 1.
- **Ripper:** fast hunter with stronger senses/tracking/sharing; HP 9, move 72t, AI 3.
- **Brute:** slow physical threat with loud gate-smash behavior; HP 28, move 175t, AI 1.

Current map generation favors a large central fighting space, four satellite rooms, wide lanes, an extra loop, paired gates, sparse pillars, casks, and 4 chests.

Current visuals are code-drawn stone Arena tiles plus distinct Walker/Ripper/Brute icons and creature HP bars. **Player remains the blue circle until the paper-doll/equipment visual pass.**

Established invariants remain: variable action-time ticks; physical facing/FOV/LOS/fog/sound; HP/Fear/Fatigue; weapon/offhand feats; local awareness/memory rather than omniscience; no noise-spawn director; `!! SPOTTED !!`; Epic/magic disabled.

## Live runtime

`main.tscn` → `scripts/MainArenaSetup.gd`

`MainArenaSetup -> MainArenaVisuals -> MainArenaMap -> MainArenaCreatures -> MainAlphaAI -> MainAlphaDual -> MainAlphaWeapons -> MainAlphaGear -> MainAlphaWrapper -> MainAlphaCombat -> MainAlphaState -> MainBoundless -> MainDungeon -> MainMobileWeb -> MainMobile -> MainPerception -> Main`

Authoritative new files:
- `scripts/MainArenaSetup.gd` — launch roster/top layer
- `scripts/MainArenaVisuals.gd` — tile set + creature icons
- `scripts/MainArenaMap.gd` — open Arena procgen
- `scripts/MainArenaCreatures.gd` — creature stats/behavior and creature-max-HP combat compatibility

Desktop remains WASD/mouse/1–6. Mobile remains 90-degree movement/facing + feat buttons + map taps. Most-derived overrides win; old parent constants/comments may be residue.
