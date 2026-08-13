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

Right now the playable build is focused on Arena combat. A run lets you:

- choose one fixed Common equipment identity: **Stealth, Ranged, Guard, Ravager**;
- build a mixed roster of **Walkers, Rippers and Brutes** before launching;
- generate a more open Arena-style floor with a central fighting space, wide lanes, gates and sparse pillars;
- fight or avoid creatures using variable action-time combat;
- use facing, field of view, fog, stealth and physical sound;
- manage HP, Fear and Fatigue;
- use Weapon/Offhand feats with tick-based cooldowns;
- open four generated loot chests and equip Common through Enchanted gear;
- recover the cache and return to the stair without needing to clear the floor.

There are **no character levels**. The same baseline human starts every run; equipment creates the build.

Current creatures deliberately test different difficulty axes:

- **Walker:** the easy, slow, low-intelligence benchmark.
- **Ripper:** fragile but very fast, with better senses, tracking and awareness sharing.
- **Brute:** slow and unintelligent but physically durable and dangerous.

The Arena now uses a code-drawn stone tile set and distinct creature icons. The player remains a simple circle for now; visible equipped gear is reserved for the later paper-doll pass.

## Controls

### Desktop

- **WASD:** movement/facing
- **Mouse:** targeting and context interactions
- **1–6:** select visible feats

### Mobile

- portrait combat HUD;
- left-side movement/facing controls;
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
