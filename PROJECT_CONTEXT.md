# ARENA COMBAT LAB / BOUNDLESS ADVENTURE — PROJECT CONTEXT

> **AI HANDOFF FILE — READ AFTER `README_SOPS.md` AND BEFORE MAKING GAMEPLAY CHANGES.**
>
> Purpose: let a fresh AI understand the current scope, live architecture, implemented systems, and present alpha state without reconstructing the chat history.
>
> **This is NOT a roadmap.** Keep future plans out of this file. Rewrite it as current truth changes.

**Status snapshot:** 2026-08-13  
**Repository:** `dmcexcess-lab/arena-combat-lab`  
**Live build:** `https://dmcexcess-lab.github.io/arena-combat-lab/`  
**Work SOP:** `README_SOPS.md`  
**History:** `CHANGELOG.md`

---

# 0. 60-second orientation

Arena Combat Lab is now the systems laboratory for **Boundless Adventure**. The current playable product is a deliberately constrained **single-player procedural-dungeon alpha**, not the full RPG.

It exists to develop and compare:

- variable-tick tactical combat;
- facing / LOS / fog / stealth;
- physical sound propagation;
- HP, Fear and Fatigue;
- gear-driven character identity;
- weapon/offhand feats and tick cooldowns;
- procedural loot;
- enemy awareness, pursuit and intelligence.

Current run loop:

1. Choose one of four **fixed Common starter kits**.
2. Choose exact Walker population.
3. Generate a connected random dungeon.
4. Spawn on the generated stair.
5. Explore, fight or avoid Walkers.
6. Step on 4 generated chests to roll gear.
7. Recover the cache.
8. Return to the stair to win.

There are **no player levels**. The same baseline human is used every run; equipment creates the build. The Walker is an **easy monster**, not “level 1.”

---

# 1. Scope boundaries

## This repo currently IS

- Godot 4 Web tactical combat.
- Single-player.
- Tick-timeline combat (actions consume different time).
- A clean benchmark for gear/tactics/AI.
- Desktop Firefox + mobile Safari playable.
- A place to implement real mechanics at small scope before expansion.

## It is NOT currently

- First Fire (separate repo and architecture).
- An overworld/campaign/town/base/companion system.
- A level/XP progression game.
- A magic system.
- A finished loot economy or finished presentation.
- A roadmap document.

Do not silently add those because they fit the larger concept.

---

# 2. Established doctrine

Preserve unless explicitly changed:

1. No player levels.
2. Same baseline human; gear is the build/class system.
3. Simulation before AI-director cheats.
4. No noise-based zombie spawning; Walkers preexist and react.
5. Facing, LOS, fog, sound, memory and pursuit need spatial causes.
6. Systems create consequences; avoid fake scripted placeholders.
7. Gear should alter tactics, not only inflate stats.
8. Armor anchors identity; accessories are the main hybridization space.
9. Active feats primarily come from Weapon/Offhand.
10. Difficulty may come from stats and AI separately.
11. AI Intelligence should scale the same awareness model; Walkers occupy its low end.
12. During alpha, prefer clean replacement/invalidation to vestigial compatibility baggage.

---

# 3. Live runtime architecture

`main.tscn` currently points to:

`res://scripts/MainAlphaAI.gd`

Live inheritance chain:

```text
MainAlphaAI.gd
 -> MainAlphaDual.gd
 -> MainAlphaWeapons.gd
 -> MainAlphaGear.gd
 -> MainAlphaWrapper.gd
 -> MainAlphaCombat.gd
 -> MainAlphaState.gd
 -> MainBoundless.gd
 -> MainDungeon.gd
 -> MainMobileWeb.gd
 -> MainMobile.gd
 -> MainPerception.gd
 -> Main.gd
```

**Important:** older parent layers contain superseded prototype constants/comments. Follow the most-derived override.

Examples:
- `MainBoundless.gd` still contains older gear/baseline assumptions.
- `AlphaGearCore.gd` still names Hunting Bow; live `AlphaGearCoreV2.gd` replaces it with **Long Bow**.
- old mobile layers contain UI/control assumptions overridden by current Alpha layers.

Do not “restore” old parent behavior without checking the live chain.

---

# 4. Fixed player model

Default Arena Tester:

| Value | Base |
|---|---:|
| Might | 2 |
| Finesse | 2 |
| Awareness | 2 |
| Vitality | 2 |
| Will | 2 |
| HP | 22 |
| Fear | 0/100 |
| Fatigue | 0/100 |

No random character stats, skill points or levels.

Attribute intent:
- **Might:** melee damage / force.
- **Finesse:** accuracy and weapon-action speed.
- **Awareness:** ranged accuracy, vision/perception, sound-location quality.
- **Vitality:** HP and fatigue resistance.
- **Will:** fear resistance/recovery.

State systems:
- **HP:** injury/death.
- **Fear:** 0–24 Steady, 25–49 Pressured, 50–74 Frightened, 75–99 Panicked, 100 Break.
- **Fatigue:** 0–24 Fresh, 25–49 Winded, 50–74 Tired, 75–99 Exhausted, 100 Spent.
- **Speed:** not a stat. Action speed is represented directly by tick costs and modifiers.

---

# 5. Equipment model

Current slots:

`Weapon, Offhand, Head, Gloves, Cloak, Armor, Belt, Boots, Ring 1, Ring 2, Amulet`

Chest **Armor** anchors physical compatibility. Rings and Amulet are unrestricted.

Four current identities:

## Stealth
Relationship: avoid fair sustained combat; exploit facing/awareness.
- Main: Stiletto, Dirk, Long Knife.
- Offhand: Throwing Knife Sheath, Balanced Knife Roll, Stiletto, Dirk.
- Can dual-wield only small blade offhands.
- Finesse/Awareness, low noise, rear/unaware play.

## Ranged
Relationship: maintain distance and lanes.
- Short Bow: range 5, 6–9 ranged damage, defining **Quick Shot**.
- Quick Shot: only Short Bow; diagonally adjacent target; reduced accuracy/damage; no knockback.
- Long Bow: range 8, 8–12 damage, slower/more fatiguing, knockback 2, **no Quick Shot**.
- Light Crossbow: Piercing Bolt identity.
- Normal close positioning is intentionally dangerous.

## Guard
Relationship: manage multiple close enemies / survive bad space.
- Iron Mace, Short Sword, War Hammer.
- Buckler, Kite Shield, Tower Shield.
- Vitality/Will, armor/HP, block/brace, arcs and crowd control.
- Intentionally lower single-target identity than Ravager.

## Ravager
Relationship: erase one priority target before being overwhelmed.
- Great Axe, Execution Sword, Maul.
- Any of those may also occupy Ravager Offhand.
- Fixed starter: Great Axe + offhand Execution Sword.
- Might, high single-target damage, heavy fatigue/tick cost.
- Do not turn Ravager into the Guard crowd-cleave identity.

Compatibility summary:
- **Stealth armor:** Stealth Weapon/Offhand/Cloak/Boots; may borrow Ranged Head/Gloves/Belt.
- **Ranged armor:** Ranged Weapon; no normal Offhand; Ranged Gloves/Belt; may borrow Stealth Head/Cloak/Boots.
- **Guard armor:** Guard Weapon/Shield/Gloves/Belt; may borrow Ravager Head/Cloak/Boots.
- **Ravager armor:** Ravager Weapon/Offhand/Gloves/Cloak/Boots; may borrow Guard Head/Belt.
- Rings/Amulet unrestricted.
- Incompatible inventory pieces are greyed/blocked; armor changes eject incompatible physical gear.
- No enabled rarity bypasses compatibility.

---

# 6. Loot / rarity state

Enabled:

`Common -> Uncommon -> Rare -> Enchanted`

**Epic is disabled. No magic or cross-class rule breaking is enabled.**

Chest rarity odds:
- Common 45%
- Uncommon 30%
- Rare 18%
- Enchanted 7%
- Epic 0%

Progression:
- Common: native package + native Weapon/Offhand special.
- Uncommon: +1 generated stat + 1 legal property.
- Rare: +2 stats + 1 property + 1 extra Weapon/Offhand feat.
- Enchanted: +3 stats + 2 properties + 2 extra feats.

Current property vocabulary includes:
`Reinforced, Stout, Lightened, Quickened, Enduring, Steady, Silent, Sure-Gripped, True-Aimed, Deep-Pocketed, Braced, Forceful, Efficient`.

Exact generator truth:
- base: `scripts/AlphaGearCore.gd`
- current overrides: `scripts/AlphaGearCoreV2.gd`

Treat V2 as authoritative where it differs.

Starter gear is fixed Common gear, not random.

Dungeon currently places **4 chests**. Stepping onto one automatically rolls one item into inventory and empties the chest.

---

# 7. Feats / cooldowns / dual wield

Active combat feats come primarily from Weapon and Offhand. Rare/Enchanted combat pieces may add legal family feats.

HUD shows up to **6 feat buttons**.

Cooldowns are **combat ticks**, not seconds:
- button can show READY / ARMED / remaining ticks / unavailable state;
- taking other actions advances the same timeline and burns cooldown naturally.

Targeted feat flow:
select button -> ARMED -> tap target -> resolve -> set ready-at tick.

Important current identities:
- Short Bow **Quick Shot**
- **Dual Strike**
- Stealth/rear/knife pool
- throwing-knife pool
- ranged power/pinning/precision/drive pool
- Guard sweep/cleave/shove pool
- shield Block/Bash/Brace/Hold Ground
- Ravager execution/focused/crushing pool

### Dual Strike
Implemented now.
- legal Stealth/Ravager dual wield only;
- adjacent target;
- main-hand hit + separate offhand hit;
- offhand damage currently 60%;
- longer total action;
- extra fatigue;
- 240-tick cooldown.

---

# 8. Walker benchmark and AI

Fixed Walker benchmark:

| Value | Current |
|---|---:|
| HP | 12 |
| Base hit | 45% |
| Damage | 3–5 |
| Move | 130 ticks |
| Attack | 105 ticks |
| Sight | 7 |
| Hearing threshold | 12 |
| AI Intelligence | 1 |

No hidden stat RNG, armor, levels or magic.

Current top AI layer: `MainAlphaAI.gd`.

Per-Walker awareness fields include AI intelligence, spot memory, last-seen position/time, follow budget and search timing.

Current states:
- **IDLE**
- **CHASE** — direct acquisition.
- **FOLLOW** — remembered/shared location, not exact supernatural tracking.
- **INVESTIGATE** — brief post-loss search.

Key rules:
- **A damaging hit reveals the player.** If the target survives, it directly spots the attacker.
- A lethal stealth hit can still alert adjacent Walkers around the impact location.
- Walker Intel 1 shares awareness about **1 tile**, so adjacent Walkers wake up to each other’s danger.
- Shared awareness yields FOLLOW, not exact live player tracking.
- Global `!! SPOTTED !!` persists while an enemy still remembers the player, not only while LOS is active.
- Walkers use a crude player breadcrumb trail and intentionally have poor follow/search ability.
- Direct spot memory is mostly AI-Intel-driven, with armor as a smaller modifier:
  - Stealth ~210 ticks
  - Ranged ~230
  - Ravager ~250
  - Guard ~270
- Enemy AI Intelligence is intended to dominate these values for smarter enemy types.

---

# 9. Perception / stealth / physical sound foundation

Current established systems include:
- directional facing;
- directional FOV;
- LOS and closed-door occlusion;
- fog/exploration memory;
- last-known enemy markers rather than unseen live tracking;
- rear/unaware attacks;
- physical sound propagation through cells;
- walls/doors/obstacles attenuating sound;
- approximate yellow sound words/markers for unseen sources;
- Awareness improving sound localization/readability;
- zombies investigating heard locations;
- **no spawn-on-noise system**.

Do not replace these with radar, omniscient tracking or AI-director spawning without an explicit design change.

---

# 10. Dungeon / objective / environment state

Current generated floor includes:
- connected random rooms/corridors;
- random stair, with player spawning on it;
- cache objective away from start where possible;
- configurable Walker count;
- Walker spawn exclusion near stair;
- 4 loot chests;
- doors / tomb-like blockers / casks and dungeon geometry;
- exploding hazards, knockback and physical noise;
- positional crowd pressure and fear pressure.

Win condition is **recover cache + return to stair**. Full clear is not required; this is intentional so stealth/avoidance remains valid.

---

# 11. Current UI / input

The current HUD is Boundless-specific, not the old First Fire-style shelf.

### Desktop / Firefox
- WASD movement.
- mouse/map targeting and context.
- number keys 1–6 can select visible feats.

### Mobile / Safari
- portrait-first;
- compact left-side 90-degree movement/facing controls;
- up to six feat buttons in a 2x3 right-side grid;
- map taps for enemies/context/adjacent doors;
- touch is authoritative;
- one touch contact should produce at most one action until release.

`MainMobileWeb.gd` routing is critical. A prior wrapper froze Safari because `_unhandled_input()` returned before the parent touch dispatcher. Inspect parent input flow before adding early returns.

---

# 12. Current implementation / test status

Latest gameplay pass implemented:
- Short Bow vs Long Bow identity split;
- Stealth and Ravager dual wield;
- Dual Strike;
- hit-reveals-stealth;
- Walker AI Intelligence field;
- adjacent awareness sharing;
- CHASE/FOLLOW/INVESTIGATE memory behavior.

That gameplay pass passed the hardened Godot 4.7.1 Web export and Pages deployment.

**At the time of this snapshot, the user had not yet reported hands-on runtime results from that latest bow/dual-wield/AI pass.** Treat it as compiled/deployed but awaiting player feedback.

This is not permanent CI proof. Before claiming a future build is live, use `README_SOPS.md` and verify the exact final `main` SHA.

---

# 13. Current source-of-truth map

| Concern | Current primary source |
|---|---|
| Walker intelligence / top runtime | `scripts/MainAlphaAI.gd` |
| Dual wield | `scripts/MainAlphaDual.gd` |
| Short/Long Bow + Quick Shot | `scripts/MainAlphaWeapons.gd` |
| current gear catalog overrides | `scripts/AlphaGearCoreV2.gd` |
| base gear/rarity/properties | `scripts/AlphaGearCore.gd` |
| character/inventory/gear HUD | `scripts/MainAlphaGear.gd` |
| mobile combat HUD / cooldowns / setup | `scripts/MainAlphaWrapper.gd` |
| feat execution / combat formulas | `scripts/MainAlphaCombat.gd` |
| HP/Fear/Fatigue/chests/equipment runtime | `scripts/MainAlphaState.gd` |
| procgen / Walker constants | `scripts/MainBoundless.gd` |
| dungeon layer | `scripts/MainDungeon.gd` |
| Safari touch routing | `scripts/MainMobileWeb.gd` |
| mobile base | `scripts/MainMobile.gd` |
| perception/readability | `scripts/MainPerception.gd` |
| base combat foundation | `scripts/Main.gd` |
| live entrypoint | `main.tscn` |
| coding/deploy procedure | `README_SOPS.md` |
| history | `CHANGELOG.md` |

---

# 14. Do NOT “fix” these without an explicit design change

- Do not convert ticks to simple alternating turns.
- Do not add levels or call Walker level 1.
- Do not make all gear universally compatible.
- Do not put active feats on every equipment piece.
- Do not enable Epic/magic yet.
- Do not reintroduce Wizard/Mage.
- Do not restore Hunting Bow over current Short/Long Bow split.
- Do not let Long Bow use Quick Shot.
- Do not remove Stealth/Ravager dual wield.
- Do not make Ravager the multi-target archetype; Guard owns that role.
- Do not allow a surviving struck enemy to remain unaware.
- Do not turn shared awareness into exact omniscient tracking.
- Do not make Walkers smart merely to make them harder.
- Do not spawn enemies from player noise.
- Do not remove `!! SPOTTED !!`.
- Do not force Safari and Firefox into identical controls.
- Do not resurrect First Fire UI/control assumptions from parent layers.

---

# 15. Maintaining this file

Update this file when current truth materially changes: scope, run loop, entrypoint/inheritance, player model, gear identities/restrictions, rarity tiers, major feats, benchmark enemy, AI/perception, or UI/input.

Do **not** append history here; use `CHANGELOG.md`.

Do **not** add future plans here; use the separate roadmap when created.

Rewrite obsolete statements so this remains a snapshot of **what is true now**.
