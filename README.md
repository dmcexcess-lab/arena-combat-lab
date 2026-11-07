# Arena Combat Lab

**Arena Combat Lab** is a small Godot 4 tactical game in development and the combat/equipment proving ground for our other games.

**Play the current web alpha:** https://dmcexcess-lab.github.io/arena-combat-lab/

**Play Tavern Keeper — Spatial Tavern Sim:** https://dmcexcess-lab.github.io/arena-combat-lab/tavern-keeper/

**Play Route Lab — Football X/O Play Designer:** https://dmcexcess-lab.github.io/arena-combat-lab/route-lab/

Route Lab now opens with Free Play, Campaign, and Load. A fresh Free exhibition starts at an animated coin toss, creates randomized teams, and lets you choose HOME starters in a depth chart or use the CPU lineup. Next Play calls both sides and advances downs, kicks, tries, and the clock; you can override either play or jump to a chosen game situation. Exhibitions save locally and do not track season wins or losses. Live-ball possession now includes rated fumbles, backward passes, player pursuit and recovery, and end-zone and out-of-bounds rulings; Pitch Back is available in the offensive playbook.

Route Lab also includes a searchable, always-available 57+ entry football encyclopedia, a QB Film Room showing candidate passing reads, variable simulation attempts with reproducible seeds, and two guided, six-lesson campaigns. **Offense Campaign** introduces QB, receivers, blocking, spacing and full 11-on-11 legality before a custom touchdown drive. **Defense Campaign** introduces tackling, man assignments, rush, zones and coordinated coverage before a four-down defensive stand. Reduced-player drills use explicit training rules; the final lessons use the full simulator. Progress saves locally in your browser.

## The game

The long-term game has two connected halves:

### Prison

A compact sim-style prison RPG between fights. Eat, sleep, train, recover, improve your gear and living conditions, manage money, take contracts from the Arena Master, and place bets on yourself or other gladiators.

### Arena

Take contracts of varying difficulty into tactical arenas. Equipment, positioning, fatigue, fear, awareness, enemy intelligence and action timing determine how a fight unfolds.

The Arena is also our shared **test ground for creatures and equipment** so combat content created for other games can be exercised here in isolation.

See [ROADMAP.md](ROADMAP.md) for the intended game structure.

## Current alpha

The standalone build currently opens directly into the **Developer Screen** that the future prison game will use as its combat-testing entry point. Before launching an Arena you can:

- create a cosmetic survivor identity with a name, body build, skin tone, hair style and hair color;
- choose one fixed Common equipment identity: **Stealth, Ranged, Guard, Ravager**;
- spawn random equipment at an exact Common / Uncommon / Rare / Enchanted rarity;
- build custom items from the implemented base-item catalog with rarity-limited bonus stats, legal properties and legal extra feats;
- build an exact mixed roster from the current nine-creature catalog using paged controls;
- review the complete character / gear / creature scenario before generation;
- generate an open Arena-style floor with a central fighting space, wide lanes, gates and sparse pillars;
- fight or avoid creatures using variable action-time combat;
- use facing, field of view, fog, stealth and physical sound;
- manage HP, Fear and Fatigue;
- use Weapon/Offhand feats with tick-based cooldowns;
- open four generated loot chests and equip Common through Enchanted gear;
- recover the cache and return to the stair without needing to clear the floor.

There are **no character levels**. The same baseline human starts every run; equipment creates the build. Character-creator choices are visual only.

Current creature catalog:

- **Walker:** easy, slow, low-intelligence benchmark.
- **Ripper:** fragile, very fast hunter with better tracking and awareness sharing.
- **Brute:** slow, durable, hard-hitting gate smasher.
- **Ghoul:** quick persistent scavenger.
- **Hound:** extremely fast, fragile hearing specialist.
- **Stalker:** long-sight, high-intelligence tracker.
- **Marauder:** balanced accurate pressure fighter.
- **Warden:** durable high-intelligence awareness sharer.
- **Juggernaut:** extreme slow tank and gate breaker.

The player is a layered code-drawn paper doll: body appearance stays underneath visible equipped armor, cloak, headgear, gloves, belt, boots, weapon and offhand. The creator hides headgear only in its appearance preview so hair remains inspectable.

## Controls

### Desktop

- **Developer Screen:** mouse/touch-style buttons; Enter advances pages and launches only from Summary.
- **Name:** click the real text field and type normally.
- **WASD:** movement/facing.
- **Mouse:** targeting and context interactions.
- **1–6:** select visible feats.

### Mobile

- tap the Character name field to use the device keyboard;
- Developer Screen controls are portrait/touch-first;
- left-side movement/facing controls in combat;
- right-side feat buttons;
- tap enemies/objects on the map to target or interact.

## Project principles

- Variable-tick combat rather than alternating turns.
- No AI-director spawning to manufacture drama.
- Noise informs existing enemies; it does not spawn them.
- Equipment should change tactics, not merely raise numbers.
- Enemy difficulty can come from physical stats and intelligence independently.
- The map, visibility, sound and positioning are part of combat.

## Documentation

- [ROADMAP.md](ROADMAP.md) — where the game is intended to go.
- [CHANGELOG.md](CHANGELOG.md) — what has changed.

### Route Lab curriculum and simulation (2026-11-06)
- Each of the twelve campaign lessons includes a learning objective, coaching breakdown, three-step interactive workshop, replay-analysis prompts, encyclopedia cross-links, and a multiple-choice knowledge check. Both the field outcome and knowledge check are needed to advance.
- The QB evaluates predicted receiver separation at catch time, throw-lane risk, defensive leverage, expected yards, timing, read priority and pressure; it can reject covered reads, select another receiver or throw away.
- Each Run advances the seed automatically for variation; enter a previous seed manually to replay a precise result. The QB Film Room explains target selection and compares candidate scores. This is still a simplified coaching simulator, not validated NFL film tracking or complete officiating.
- Open the Encyclopedia from the top navigation in campaigns or Free Play. Its entries include an applied Route Lab example and a link to the official 2026 NFL rulebook.

### Scouting overlays and scrimmage ladder
- Each position has editable 1–99 football ratings: speed, acceleration, agility, strength, blocking, coverage, tackling, hands, awareness, throw accuracy and arm strength. The engine uses relevant ratings for player movement, line matchups, receiver separation, throwing, catching and tackling. These are coaching-game ratings, not validated player analytics.
- The Coach’s telestrator toggles assignment links, coverage regions, pass protection, pressure paths, run fits, schematic open-field cells, and speed/coverage matchup leverage. The legend makes the route/pressure/coverage colors readable.
- Each of the first five lessons on each side requires passing a predictable four-opponent rotation: Scout → Man → Zone → Blitz. The lineup grows from basic 3v1 to 3v3 QB/receivers-vs-cover-men, then 5v5, 7v7, and full 11v11. The sixth lesson retains the full drive finale. Reduced-personnel 3v3 explicitly uses a virtual practice snap rather than pretending to be a legal full-squad snap.
