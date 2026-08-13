# Arena Combat Lab

**Arena Combat Lab** is a small Godot 4 tactical game in development and the combat/equipment proving ground for our other games.

**Play the current web alpha:** https://dmcexcess-lab.github.io/arena-combat-lab/

## The game

The long-term game has two connected halves:

### Prison

A compact sim-style prison RPG between fights. Eat, sleep, train, recover, improve your gear and living conditions, manage your money, take contracts from the Arena Master, and place bets on yourself or other gladiators.

### Arena

Take contracts of varying difficulty into tactical arenas. Your equipment, positioning, fatigue, fear, awareness, enemy intelligence and action timing determine how the fight unfolds.

The Arena also has a second purpose: it is our shared **test ground for creatures and equipment**. Monsters, weapons, armor and combat mechanics created for other games can be exercised here in a controlled environment before being reused elsewhere.

See [ROADMAP.md](ROADMAP.md) for the intended game structure.

## Current alpha

Right now the playable build is focused on the Arena side. A run lets you:

- choose one of four fixed equipment identities: **Stealth, Ranged, Guard, Ravager**;
- choose the number of Walker enemies;
- generate a random dungeon;
- fight or avoid enemies using variable action-time combat;
- use facing, field of view, fog, stealth and physical sound;
- manage HP, Fear and Fatigue;
- use weapon/offhand feats with tick-based cooldowns;
- open generated loot chests and equip Common through Enchanted gear;
- recover the cache and return to the stair without needing to clear the floor.

There are **no character levels**. The same baseline human starts every run; equipment creates the build.

Walkers are the current easy benchmark monster. They are intentionally weak and unintelligent rather than being a fictional “level 1” enemy.

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
