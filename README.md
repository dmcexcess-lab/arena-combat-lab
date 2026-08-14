# Arena Combat Lab

**Arena Combat Lab** is a small Godot 4 tactical game in development and the combat/equipment proving ground for our other games.

**Play the current web alpha:** https://dmcexcess-lab.github.io/arena-combat-lab/

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
